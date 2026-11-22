
-- 1) Athletes: campos para mini-onboarding/adesão
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS sleep_quality smallint,
  ADD COLUMN IF NOT EXISTS stress_level smallint;

-- 2) View canônica de avaliações (mesma fonte para Progress Tracker e SmartPeriodizer)
CREATE OR REPLACE VIEW public.v_assessment_canonical AS
SELECT
  id,
  COALESCE(athlete_id, aluno_id) AS athlete_id,
  data_avaliacao,
  peso, altura, imc,
  rm1_empurrar_perna, rm1_empurrar_superior, rm1_puxar_costas, rm1_puxar_inferior,
  rml_flexao, rml_agachamento, rml_pull, rml_elevacao_p, rml_abs,
  core_prancha_seg, core_side_plank_esq_seg, core_side_plank_dir_seg,
  cardio_sprint_vel, cardio_bpm_repouso, cardio_bpm_max,
  mob_overhead_squat, mob_quadril, mob_tornozelo, mob_ombro,
  score_forca, score_resistencia, score_core, score_cardio, score_mobilidade, score_global,
  flags_inteligentes,
  origem,
  created_at, updated_at
FROM public.avaliacoes_unificadas;

GRANT SELECT ON public.v_assessment_canonical TO authenticated;
GRANT SELECT ON public.v_assessment_canonical TO service_role;

-- 3) Função de entrega canônica enriquecida (snapshot FitPro + evento)
CREATE OR REPLACE FUNCTION public.deliver_periodization_to_athlete(
  p_athlete_id uuid,
  p_coach_id uuid,
  p_plan_id uuid,
  p_model_id text,
  p_match integer DEFAULT 80,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_assignment_id uuid;
  v_existing_id uuid;
  v_plan RECORD;
  v_goal text;
  v_macros jsonb;
  v_mesos jsonb;
  v_micro jsonb;
  v_output jsonb;
  v_phase text;
  v_cycle text;
  v_vol text;
  v_int text;
BEGIN
  IF p_athlete_id IS NULL THEN
    RAISE EXCEPTION 'athlete_id is required';
  END IF;

  -- Garante plano ativo
  IF p_plan_id IS NOT NULL THEN
    UPDATE public.periodization_annual_plans
       SET status = 'active'
     WHERE id = p_plan_id;
  END IF;

  -- Arquiva assignments in_progress conflitantes
  UPDATE public.athlete_periodizations
     SET status = 'archived'
   WHERE athlete_id = p_athlete_id
     AND status = 'in_progress'
     AND (annual_plan_id IS DISTINCT FROM p_plan_id);

  IF p_plan_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
      FROM public.athlete_periodizations
     WHERE annual_plan_id = p_plan_id
     LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.athlete_periodizations
       SET athlete_id = p_athlete_id,
           periodization_model_id = COALESCE(p_model_id, periodization_model_id, 'auto-generated'),
           assigned_by = COALESCE(p_coach_id, assigned_by),
           match_percentage = COALESCE(p_match, match_percentage, 80),
           status = 'in_progress',
           notes = COALESCE(p_notes, notes),
           assigned_at = COALESCE(assigned_at, now())
     WHERE id = v_existing_id
     RETURNING id INTO v_assignment_id;
  ELSE
    INSERT INTO public.athlete_periodizations (
      athlete_id, periodization_model_id, assigned_by, annual_plan_id,
      match_percentage, status, notes, assigned_at
    ) VALUES (
      p_athlete_id,
      COALESCE(p_model_id, 'auto-generated'),
      p_coach_id,
      p_plan_id,
      COALESCE(p_match, 80),
      'in_progress',
      p_notes,
      now()
    )
    RETURNING id INTO v_assignment_id;
  END IF;

  -- Snapshot canônico no FitPro
  IF p_plan_id IS NOT NULL THEN
    SELECT annual_goal, macrocycles, mesocycles, micro_rules, output_json
      INTO v_plan
      FROM public.periodization_annual_plans
     WHERE id = p_plan_id;

    v_goal   := COALESCE(v_plan.annual_goal, 'hipertrofia');
    v_macros := COALESCE(v_plan.macrocycles, '[]'::jsonb);
    v_mesos  := COALESCE(v_plan.mesocycles, '[]'::jsonb);
    v_micro  := COALESCE(v_plan.micro_rules, '{}'::jsonb);
    v_output := COALESCE(v_plan.output_json, '{}'::jsonb);

    v_phase := COALESCE(v_macros->0->>'name', 'Base');
    v_cycle := COALESCE(v_mesos->0->>'name', v_phase);
    v_vol   := COALESCE(v_macros->0->>'volume_level', 'moderado');
    v_int   := COALESCE(v_macros->0->>'intensity_level', 'moderada');

    INSERT INTO public.fitpro_smartperiodizer_periodizations (
      fitpro_student_id, fitpro_professor_id, smartperiodizer_periodization_id,
      goal, current_phase, current_cycle, cycle_week,
      volume_level, intensity_level, status, payload, updated_at
    ) VALUES (
      p_athlete_id, p_coach_id, p_plan_id::text,
      v_goal, v_phase, v_cycle, 1,
      v_vol, v_int, 'active', v_output, now()
    )
    ON CONFLICT (smartperiodizer_periodization_id) DO UPDATE SET
      fitpro_student_id   = EXCLUDED.fitpro_student_id,
      fitpro_professor_id = EXCLUDED.fitpro_professor_id,
      goal                = EXCLUDED.goal,
      current_phase       = EXCLUDED.current_phase,
      current_cycle       = EXCLUDED.current_cycle,
      volume_level        = EXCLUDED.volume_level,
      intensity_level     = EXCLUDED.intensity_level,
      status              = 'active',
      payload             = EXCLUDED.payload,
      updated_at          = now();

    -- Evento canônico (não falha o salvar)
    BEGIN
      INSERT INTO public.fitpro_events (
        event_type, module, fitpro_student_id, fitpro_professor_id,
        entity_type, entity_id, payload
      ) VALUES (
        'periodization_created', 'SmartPeriodizer',
        p_athlete_id::text, p_coach_id::text,
        'periodization', p_plan_id::text, v_output
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'fitpro_events insert skipped: %', SQLERRM;
    END;
  END IF;

  RETURN v_assignment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deliver_periodization_to_athlete(uuid, uuid, uuid, text, integer, text)
  TO authenticated, service_role;

-- 4) Unique index para upsert do snapshot do FitPro
CREATE UNIQUE INDEX IF NOT EXISTS uq_fitpro_smartperiodizer_periodizations_plan
  ON public.fitpro_smartperiodizer_periodizations (smartperiodizer_periodization_id);

-- 5) Trigger: ao mudar plano anual, ressincroniza snapshot do FitPro
CREATE OR REPLACE FUNCTION public.sync_fitpro_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phase text;
  v_cycle text;
  v_vol text;
  v_int text;
BEGIN
  v_phase := COALESCE(NEW.macrocycles->0->>'name', 'Base');
  v_cycle := COALESCE(NEW.mesocycles->0->>'name', v_phase);
  v_vol   := COALESCE(NEW.macrocycles->0->>'volume_level', 'moderado');
  v_int   := COALESCE(NEW.macrocycles->0->>'intensity_level', 'moderada');

  INSERT INTO public.fitpro_smartperiodizer_periodizations (
    fitpro_student_id, fitpro_professor_id, smartperiodizer_periodization_id,
    goal, current_phase, current_cycle, cycle_week,
    volume_level, intensity_level, status, payload, updated_at
  ) VALUES (
    NEW.athlete_id, NEW.coach_id, NEW.id::text,
    COALESCE(NEW.annual_goal, 'hipertrofia'), v_phase, v_cycle, 1,
    v_vol, v_int, COALESCE(NEW.status, 'active'),
    COALESCE(NEW.output_json, '{}'::jsonb), now()
  )
  ON CONFLICT (smartperiodizer_periodization_id) DO UPDATE SET
    goal            = EXCLUDED.goal,
    current_phase   = EXCLUDED.current_phase,
    current_cycle   = EXCLUDED.current_cycle,
    volume_level    = EXCLUDED.volume_level,
    intensity_level = EXCLUDED.intensity_level,
    status          = EXCLUDED.status,
    payload         = EXCLUDED.payload,
    updated_at      = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_fitpro_snapshot ON public.periodization_annual_plans;
CREATE TRIGGER trg_sync_fitpro_snapshot
  AFTER UPDATE OF output_json, macrocycles, mesocycles, master_rules, annual_goal, status
  ON public.periodization_annual_plans
  FOR EACH ROW EXECUTE FUNCTION public.sync_fitpro_snapshot();

-- 6) RLS de fitpro_smartperiodizer_periodizations
ALTER TABLE public.fitpro_smartperiodizer_periodizations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.fitpro_smartperiodizer_periodizations TO authenticated;
GRANT ALL ON public.fitpro_smartperiodizer_periodizations TO service_role;

DROP POLICY IF EXISTS "Student views own fitpro snapshot" ON public.fitpro_smartperiodizer_periodizations;
CREATE POLICY "Student views own fitpro snapshot"
  ON public.fitpro_smartperiodizer_periodizations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.athletes a
              WHERE a.id = fitpro_smartperiodizer_periodizations.fitpro_student_id
                AND a.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.athlete_auth_link aal
                 WHERE aal.athlete_id = fitpro_smartperiodizer_periodizations.fitpro_student_id
                   AND aal.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Coach manages fitpro snapshot" ON public.fitpro_smartperiodizer_periodizations;
CREATE POLICY "Coach manages fitpro snapshot"
  ON public.fitpro_smartperiodizer_periodizations FOR ALL
  USING (
    fitpro_professor_id = auth.uid()
    OR is_admin(auth.uid()) OR is_trainer(auth.uid()) OR is_professor(auth.uid())
  )
  WITH CHECK (
    fitpro_professor_id = auth.uid()
    OR is_admin(auth.uid()) OR is_trainer(auth.uid()) OR is_professor(auth.uid())
  );
;
