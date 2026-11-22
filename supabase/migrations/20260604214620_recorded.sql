
-- =====================================================
-- 1. Canonical delivery function
-- =====================================================
CREATE OR REPLACE FUNCTION public.deliver_periodization_to_athlete(
  p_athlete_id uuid,
  p_coach_id uuid,
  p_plan_id uuid,
  p_model_id text,
  p_match int DEFAULT 80,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id uuid;
  v_existing_id uuid;
BEGIN
  IF p_athlete_id IS NULL THEN
    RAISE EXCEPTION 'athlete_id is required';
  END IF;

  -- Ensure plan is active when provided
  IF p_plan_id IS NOT NULL THEN
    UPDATE public.periodization_annual_plans
       SET status = 'active'
     WHERE id = p_plan_id;
  END IF;

  -- Archive other in_progress assignments of this athlete that point to OTHER plans
  UPDATE public.athlete_periodizations
     SET status = 'archived'
   WHERE athlete_id = p_athlete_id
     AND status = 'in_progress'
     AND (annual_plan_id IS DISTINCT FROM p_plan_id);

  -- Try to find existing assignment for this plan
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

  RETURN v_assignment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deliver_periodization_to_athlete(uuid,uuid,uuid,text,int,text) TO authenticated, service_role;

-- =====================================================
-- 2. Recreate auto-link trigger using canonical function
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_link_annual_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_model_id text;
  v_match int;
BEGIN
  v_model_id := COALESCE(NEW.selected_chief_id, NEW.selected_model_id, 'auto-generated');
  v_match := COALESCE((NEW.scores->>'global')::int, 80);

  PERFORM public.deliver_periodization_to_athlete(
    NEW.athlete_id,
    NEW.coach_id,
    NEW.id,
    v_model_id,
    v_match,
    'Auto-link via annual plan ' || NEW.id::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'auto_link_annual_plan error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_annual_plan ON public.periodization_annual_plans;
CREATE TRIGGER trg_auto_link_annual_plan
AFTER INSERT ON public.periodization_annual_plans
FOR EACH ROW EXECUTE FUNCTION public.auto_link_annual_plan();

-- =====================================================
-- 3. RLS hardening — periodization_annual_plans
-- =====================================================
DROP POLICY IF EXISTS "Athletes can view their own plans" ON public.periodization_annual_plans;
DROP POLICY IF EXISTS "Linked athletes can view own annual plans" ON public.periodization_annual_plans;
DROP POLICY IF EXISTS "Coaches can manage their own plans" ON public.periodization_annual_plans;
DROP POLICY IF EXISTS "Professors and admins can manage annual plans" ON public.periodization_annual_plans;

CREATE POLICY "Linked athletes can view own annual plans"
ON public.periodization_annual_plans FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_id AND a.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.athlete_auth_link aal WHERE aal.athlete_id = periodization_annual_plans.athlete_id AND aal.user_id = auth.uid())
);

CREATE POLICY "Professors and admins can manage annual plans"
ON public.periodization_annual_plans FOR ALL
TO authenticated
USING (
  coach_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_trainer(auth.uid())
  OR public.is_professor(auth.uid())
)
WITH CHECK (
  coach_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_trainer(auth.uid())
  OR public.is_professor(auth.uid())
);

-- =====================================================
-- 4. RLS hardening — athlete_periodizations
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage athlete periodizations" ON public.athlete_periodizations;
DROP POLICY IF EXISTS "Professors and admins can manage athlete periodizations" ON public.athlete_periodizations;
DROP POLICY IF EXISTS "Students can view own athlete periodizations" ON public.athlete_periodizations;

CREATE POLICY "Students can view own athlete periodizations"
ON public.athlete_periodizations FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_periodizations.athlete_id AND a.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.athlete_auth_link aal WHERE aal.athlete_id = athlete_periodizations.athlete_id AND aal.user_id = auth.uid())
);

CREATE POLICY "Professors and admins can manage athlete periodizations"
ON public.athlete_periodizations FOR ALL
TO authenticated
USING (
  assigned_by = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_trainer(auth.uid())
  OR public.is_professor(auth.uid())
)
WITH CHECK (
  assigned_by = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_trainer(auth.uid())
  OR public.is_professor(auth.uid())
);

-- =====================================================
-- 5. salvar_avaliacao now accepts canonical athletes
-- =====================================================
CREATE OR REPLACE FUNCTION public.salvar_avaliacao(p_estudante_id uuid, p_dados jsonb)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.athletes WHERE id = p_estudante_id
    UNION ALL
    SELECT 1 FROM public.alunos WHERE id = p_estudante_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN QUERY SELECT FALSE, 'Aluno não encontrado'::text; RETURN;
  END IF;

  INSERT INTO public.avaliacoes_unificadas (
    aluno_id, origem, data_avaliacao, peso, altura, imc, gordura_corporal, massa_muscular,
    score_forca, score_resistencia, score_core, score_cardio, score_mobilidade, score_global,
    observacoes, flags_inteligentes
  ) VALUES (
    p_estudante_id, 'manual', COALESCE((p_dados->>'data_avaliacao')::date, CURRENT_DATE),
    (p_dados->>'peso')::numeric, (p_dados->>'altura')::numeric, (p_dados->>'imc')::numeric,
    (p_dados->>'gordura_corporal')::numeric, (p_dados->>'massa_muscular')::numeric,
    (p_dados->>'score_forca')::numeric, (p_dados->>'score_resistencia')::numeric,
    (p_dados->>'score_core')::numeric, (p_dados->>'score_cardio')::numeric,
    (p_dados->>'score_mobilidade')::numeric, (p_dados->>'score_global')::numeric,
    p_dados->>'observacoes',
    COALESCE((p_dados->>'flags_inteligentes')::jsonb, '[]'::jsonb)
  )
  ON CONFLICT (aluno_id, data_avaliacao, origem) DO UPDATE SET
    peso = EXCLUDED.peso, altura = EXCLUDED.altura, imc = EXCLUDED.imc,
    gordura_corporal = EXCLUDED.gordura_corporal, massa_muscular = EXCLUDED.massa_muscular,
    score_forca = EXCLUDED.score_forca, score_resistencia = EXCLUDED.score_resistencia,
    score_core = EXCLUDED.score_core, score_cardio = EXCLUDED.score_cardio,
    score_mobilidade = EXCLUDED.score_mobilidade, score_global = EXCLUDED.score_global,
    observacoes = EXCLUDED.observacoes,
    flags_inteligentes = EXCLUDED.flags_inteligentes,
    updated_at = now();

  RETURN QUERY SELECT TRUE, 'Avaliação salva com sucesso!'::text;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, SQLERRM::text;
END;
$$;
;
