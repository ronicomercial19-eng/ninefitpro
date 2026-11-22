
-- 1) Audit table
CREATE TABLE IF NOT EXISTS public.periodization_generation_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid,
  plan_id uuid,
  assignment_id uuid,
  origin text NOT NULL CHECK (origin IN ('trigger','edge','manual')),
  error_reason text,
  error_detail jsonb DEFAULT '{}'::jsonb,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.periodization_generation_failures TO authenticated;
GRANT ALL ON public.periodization_generation_failures TO service_role;

ALTER TABLE public.periodization_generation_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read failures" ON public.periodization_generation_failures;
CREATE POLICY "Admins can read failures"
ON public.periodization_generation_failures
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages failures" ON public.periodization_generation_failures;
CREATE POLICY "Service role manages failures"
ON public.periodization_generation_failures
FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_periodization_failures_athlete
  ON public.periodization_generation_failures (athlete_id, created_at DESC);

-- 2) Harden ensure_plano_treino_gerado with audit capture
CREATE OR REPLACE FUNCTION public.ensure_plano_treino_gerado(p_assignment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment RECORD;
  v_plano_id uuid;
  v_nome text;
  v_objetivo text;
  v_nivel text;
  v_duracao int;
  v_completo jsonb;
BEGIN
  SELECT ap.*, pap.annual_goal, pap.macrocycles, pap.mesocycles, pap.micro_rules,
         pap.output_json, pap.dominant_profile, pap.scores
    INTO v_assignment
    FROM public.athlete_periodizations ap
    LEFT JOIN public.periodization_annual_plans pap ON pap.id = ap.annual_plan_id
   WHERE ap.id = p_assignment_id;

  IF NOT FOUND OR v_assignment.athlete_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_objetivo := COALESCE(v_assignment.annual_goal, 'geral');
  v_nivel    := COALESCE(
                  CASE jsonb_typeof(v_assignment.dominant_profile)
                    WHEN 'string' THEN v_assignment.dominant_profile #>> '{}'
                    WHEN 'object' THEN v_assignment.dominant_profile ->> 'name'
                    ELSE NULL
                  END,
                  'intermediario'
                );
  v_duracao  := GREATEST(COALESCE(jsonb_array_length(COALESCE(v_assignment.macrocycles, '[]'::jsonb)), 1) * 4, 4);
  v_nome     := 'Plano ' || COALESCE(v_assignment.periodization_model_id, 'auto') || ' — ' || to_char(now(), 'MM/YYYY');
  v_completo := jsonb_build_object(
    'assignment_id',   v_assignment.id,
    'annual_plan_id',  v_assignment.annual_plan_id,
    'model_id',        v_assignment.periodization_model_id,
    'goal',            v_objetivo,
    'profile',         v_nivel,
    'macrocycles',     COALESCE(v_assignment.macrocycles, '[]'::jsonb),
    'mesocycles',      COALESCE(v_assignment.mesocycles,  '[]'::jsonb),
    'micro_rules',     COALESCE(v_assignment.micro_rules, '{}'::jsonb),
    'output',          COALESCE(v_assignment.output_json, '{}'::jsonb),
    'scores',          COALESCE(v_assignment.scores,      '{}'::jsonb),
    'generated_at',    now()
  );

  SELECT id INTO v_plano_id
    FROM public.planos_de_treino_gerados
   WHERE athlete_id = v_assignment.athlete_id
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_plano_id IS NULL THEN
    INSERT INTO public.planos_de_treino_gerados (
      athlete_id, professor_id,
      nome_plano, objetivo, nivel, duracao_semanas,
      plano_completo, status, updated_at
    ) VALUES (
      v_assignment.athlete_id, v_assignment.assigned_by,
      v_nome, v_objetivo, v_nivel, v_duracao,
      v_completo, 'ativo', now()
    )
    RETURNING id INTO v_plano_id;
  ELSE
    UPDATE public.planos_de_treino_gerados
       SET nome_plano = v_nome,
           objetivo = v_objetivo,
           nivel = v_nivel,
           duracao_semanas = v_duracao,
           plano_completo = v_completo,
           professor_id = COALESCE(v_assignment.assigned_by, professor_id),
           status = 'ativo',
           updated_at = now()
     WHERE id = v_plano_id;
  END IF;

  RETURN v_plano_id;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.periodization_generation_failures
      (athlete_id, plan_id, assignment_id, origin, error_reason, error_detail, payload)
    VALUES (
      COALESCE(v_assignment.athlete_id, NULL),
      COALESCE(v_assignment.annual_plan_id, NULL),
      p_assignment_id,
      'trigger',
      SQLERRM,
      jsonb_build_object('sqlstate', SQLSTATE),
      COALESCE(to_jsonb(v_assignment), '{}'::jsonb)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NULL;
END;
$function$;

-- 3) Sync into fitpro_smartperiodizer_periodizations (source for Planejamento tab)
CREATE OR REPLACE FUNCTION public.sync_fitpro_planejamento(p_athlete_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment RECORD;
  v_plan RECORD;
  v_snap_id uuid;
  v_level text;
  v_phase text;
  v_cycle text;
  v_ondas jsonb;
  v_payload jsonb;
BEGIN
  IF p_athlete_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_assignment
    FROM public.athlete_periodizations
   WHERE athlete_id = p_athlete_id
     AND status IN ('in_progress','active')
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND OR v_assignment.annual_plan_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_plan
    FROM public.periodization_annual_plans
   WHERE id = v_assignment.annual_plan_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_level := COALESCE(
    CASE jsonb_typeof(v_plan.dominant_profile)
      WHEN 'string' THEN v_plan.dominant_profile #>> '{}'
      WHEN 'object' THEN v_plan.dominant_profile ->> 'name'
      ELSE NULL
    END,
    'intermediario'
  );

  v_phase := COALESCE((v_plan.mesocycles -> 0 ->> 'name'), (v_plan.mesocycles -> 0 ->> 'phase'), 'adaptacao');
  v_cycle := COALESCE((v_plan.macrocycles -> 0 ->> 'name'), 'macro-1');

  -- Build ondas from mesocycles
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'nome', COALESCE(m ->> 'name', m ->> 'phase', 'Onda ' || (ord::text)),
      'status', CASE WHEN ord = 1 THEN 'in_progress' ELSE 'pending' END,
      'phase', m ->> 'phase',
      'weeks', m -> 'weeks',
      'rpe_cap', m -> 'rpe_cap',
      'reps', m -> 'reps',
      'sets', m -> 'sets'
    ) ORDER BY ord
  ), '[]'::jsonb)
  INTO v_ondas
  FROM jsonb_array_elements(COALESCE(v_plan.mesocycles, '[]'::jsonb)) WITH ORDINALITY AS t(m, ord);

  v_payload := jsonb_build_object(
    'annual_goal',        v_plan.annual_goal,
    'dominant_profile',   v_plan.dominant_profile,
    'scores',             COALESCE(v_plan.scores, '{}'::jsonb),
    'flags',              COALESCE(v_plan.flags, '[]'::jsonb),
    'selected_chief_id',  v_plan.selected_chief_id,
    'selected_model_id',  v_plan.selected_model_id,
    'master_rules',       COALESCE(v_plan.master_rules, '{}'::jsonb),
    'macrocycles',        COALESCE(v_plan.macrocycles, '[]'::jsonb),
    'mesocycles',         COALESCE(v_plan.mesocycles,  '[]'::jsonb),
    'micro_rules',        COALESCE(v_plan.micro_rules, '{}'::jsonb),
    'output_json',        COALESCE(v_plan.output_json, '{}'::jsonb),
    'ondas',              v_ondas,
    'synced_at',          now()
  );

  INSERT INTO public.fitpro_smartperiodizer_periodizations (
    fitpro_student_id, fitpro_professor_id, smartperiodizer_periodization_id,
    goal, training_level, current_phase, current_cycle, cycle_week,
    status, payload, updated_at
  ) VALUES (
    p_athlete_id, v_plan.coach_id, v_plan.id::text,
    COALESCE(v_plan.annual_goal, 'geral'), v_level, v_phase, v_cycle, 1,
    'active', v_payload, now()
  )
  ON CONFLICT (smartperiodizer_periodization_id) DO UPDATE
    SET fitpro_student_id = EXCLUDED.fitpro_student_id,
        fitpro_professor_id = EXCLUDED.fitpro_professor_id,
        goal = EXCLUDED.goal,
        training_level = EXCLUDED.training_level,
        current_phase = EXCLUDED.current_phase,
        current_cycle = EXCLUDED.current_cycle,
        status = 'active',
        payload = EXCLUDED.payload,
        updated_at = now()
  RETURNING id INTO v_snap_id;

  -- Deactivate other snapshots for this athlete so only current stays active
  UPDATE public.fitpro_smartperiodizer_periodizations
     SET status = 'archived', updated_at = now()
   WHERE fitpro_student_id = p_athlete_id
     AND id <> v_snap_id
     AND status = 'active';

  RETURN v_snap_id;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.periodization_generation_failures
      (athlete_id, plan_id, assignment_id, origin, error_reason, error_detail, payload)
    VALUES (
      p_athlete_id,
      COALESCE(v_assignment.annual_plan_id, NULL),
      COALESCE(v_assignment.id, NULL),
      'trigger',
      SQLERRM,
      jsonb_build_object('sqlstate', SQLSTATE, 'fn', 'sync_fitpro_planejamento'),
      '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.sync_fitpro_planejamento(uuid) TO authenticated, service_role;

-- 4) Extend trigger on athlete_periodizations to sync planejamento too
CREATE OR REPLACE FUNCTION public.trg_ensure_plano_treino_gerado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('in_progress','active') THEN
    PERFORM public.ensure_plano_treino_gerado(NEW.id);
    PERFORM public.sync_fitpro_planejamento(NEW.athlete_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_plano_treino_gerado ON public.athlete_periodizations;
CREATE TRIGGER trg_ensure_plano_treino_gerado
AFTER INSERT OR UPDATE OF status, annual_plan_id, periodization_model_id
ON public.athlete_periodizations
FOR EACH ROW EXECUTE FUNCTION public.trg_ensure_plano_treino_gerado();

-- 5) Backfill snapshots for every active/in_progress athlete
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT athlete_id
      FROM public.athlete_periodizations
     WHERE status IN ('in_progress','active')
       AND annual_plan_id IS NOT NULL
  LOOP
    PERFORM public.sync_fitpro_planejamento(r.athlete_id);
  END LOOP;
END $$;
;
