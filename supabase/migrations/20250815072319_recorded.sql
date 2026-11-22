-- ============================
-- 1. Tipagem correta de ARRAY
-- ============================
ALTER TABLE public.athletes
  ALTER COLUMN goals TYPE text[] USING COALESCE(goals::text[], '{}'),
  ALTER COLUMN injuries TYPE text[] USING COALESCE(injuries::text[], '{}');

ALTER TABLE public.daily_workouts
  ALTER COLUMN focus_muscles TYPE text[] USING COALESCE(focus_muscles::text[], '{}');

ALTER TABLE public.exercises
  ALTER COLUMN target_muscles TYPE text[] USING COALESCE(target_muscles::text[], '{}');

ALTER TABLE public.training_phases
  ALTER COLUMN key_adaptations TYPE text[] USING COALESCE(key_adaptations::text[], '{}'),
  ALTER COLUMN monitoring_markers TYPE text[] USING COALESCE(monitoring_markers::text[], '{}');

ALTER TABLE public.training_programs
  ALTER COLUMN equipment_needed TYPE text[] USING COALESCE(equipment_needed::text[], '{}');

-- ===================================================
-- 2. Defaults consistentes para colunas JSON/JSONB/TEXT
-- ===================================================
ALTER TABLE public.exercises
  ALTER COLUMN instructions SET DEFAULT ''::text;

ALTER TABLE public.periodization_models
  ALTER COLUMN macrocycle SET DEFAULT '{}'::jsonb,
  ALTER COLUMN mesocycle SET DEFAULT '{}'::jsonb,
  ALTER COLUMN microcycle SET DEFAULT '[]'::jsonb,
  ALTER COLUMN recommended_for SET DEFAULT '{}'::jsonb,
  ALTER COLUMN graph_data SET DEFAULT '{}'::jsonb;

ALTER TABLE public.periodizations
  ALTER COLUMN recommended_for SET DEFAULT '{}'::jsonb,
  ALTER COLUMN graph_data SET DEFAULT '[]'::jsonb,
  ALTER COLUMN macrocycle SET DEFAULT '{}'::jsonb,
  ALTER COLUMN mesocycle SET DEFAULT '{}'::jsonb,
  ALTER COLUMN microcycle SET DEFAULT '[]'::jsonb;

-- ========================
-- 3. Índices de performance
-- ========================
CREATE INDEX IF NOT EXISTS idx_periodization_models_goal
  ON public.periodization_models (goal);

CREATE INDEX IF NOT EXISTS idx_periodization_models_duration
  ON public.periodization_models (duration);

CREATE INDEX IF NOT EXISTS idx_user_profiles_goal
  ON public.user_profiles (primary_goal);

CREATE INDEX IF NOT EXISTS idx_user_profiles_experience
  ON public.user_profiles (experience_level);

-- =====================================================
-- 4. View de catálogo (fonte de verdade: models/30 itens)
-- =====================================================
CREATE OR REPLACE VIEW public.v_periodizations_catalog AS
SELECT
  pm.id,
  pm.title,
  pm.goal,
  pm.duration,
  pm.description,
  pm.macrocycle,
  pm.mesocycle,
  pm.microcycle,
  pm.recommended_for,
  pm.graph_data,
  pm.created_at,
  pm.updated_at
FROM public.periodization_models pm;

-- =========================================
-- 5. Função de matching (TOP-3) com fatores
-- =========================================
CREATE OR REPLACE FUNCTION public.match_periodizations_for_profile(p_user_profile_id uuid)
RETURNS TABLE (
  periodization_model_id text,
  title text,
  match_percentage int,
  match_factors jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_profile record;
BEGIN
  SELECT *
  INTO v_profile
  FROM public.user_profiles up
  WHERE up.id = p_user_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil % não encontrado em user_profiles', p_user_profile_id;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      pm.id,
      pm.title,
      pm.goal,
      pm.duration,
      pm.recommended_for
    FROM public.periodization_models pm
  ),
  scored AS (
    SELECT
      b.id,
      b.title,
      (
        (CASE WHEN b.goal = v_profile.primary_goal THEN 45 ELSE 0 END))
        +
        (CASE
           WHEN v_profile.weekly_frequency BETWEEN 5 AND 6
                AND COALESCE((b.recommended_for->>'weekly_frequency_max')::int, 6) >= v_profile.weekly_frequency
                THEN 15
           WHEN v_profile.weekly_frequency BETWEEN 3 AND 4 THEN 12
           WHEN v_profile.weekly_frequency = 2 THEN 8
           ELSE 5
         END)
        +
        (CASE
           WHEN v_profile.experience_level IN ('intermediario','avancado')
                AND COALESCE(v_profile.experience_months, 12) >= COALESCE((b.recommended_for->>'min_experience_months')::int, 0)
                THEN 20
           WHEN v_profile.experience_level = 'iniciante' THEN 12
           ELSE 10
         END)
        +
        (CASE
           WHEN b.duration = '12m' AND v_profile.primary_goal IN ('hipertrofia','performance_atletica') THEN 10
           WHEN b.duration = '6m' THEN 8
           WHEN b.duration = '3m' THEN 6
           WHEN b.duration = '24m' THEN 9
           ELSE 5
         END)
        +
        (CASE
           WHEN (v_profile.training_environment = (b.recommended_for->>'environment'))
             OR (NOT (b.recommended_for ? 'environment'))
           THEN 10 ELSE 5 END)
      AS score,
      jsonb_build_object(
        'goal_match', (b.goal = v_profile.primary_goal),
        'weekly_frequency', v_profile.weekly_frequency,
        'experience_level', v_profile.experience_level,
        'duration', b.duration,
        'environment', b.recommended_for->>'environment'
      ) AS factors
    FROM base b
  )
  SELECT
    id::text,
    title,
    LEAST(100, GREATEST(0, score))::int AS match_percentage,
    factors AS match_factors
  FROM scored
  ORDER BY score DESC
  LIMIT 3;
END;
$$;

-- =======================================
-- 6. RLS (políticas mínimas para segurança)
-- =======================================

-- Athletes: cada coach só vê/edita seus atletas
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY coach_can_manage_own_athletes
ON public.athletes
FOR ALL
TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

-- Periodizations (instâncias geradas por professor para aluno)
ALTER TABLE public.periodizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY periodizations_owner_or_professor_read
ON public.periodizations
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR professor_id = auth.uid());

CREATE POLICY periodizations_professor_insert
ON public.periodizations
FOR INSERT
TO authenticated
WITH CHECK (professor_id = auth.uid());

CREATE POLICY periodizations_professor_update
ON public.periodizations
FOR UPDATE
TO authenticated
USING (professor_id = auth.uid())
WITH CHECK (professor_id = auth.uid());

CREATE POLICY periodizations_professor_delete
ON public.periodizations
FOR DELETE
TO authenticated
USING (professor_id = auth.uid());

-- Plans: arquivos/HTML gerados do plano
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plan_owner_or_coach_read
ON public.plans
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.athletes a
          WHERE a.id = plans.athlete_id
            AND a.coach_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.periodizations p
             WHERE p.id = plans.periodization_id
               AND (p.user_id = auth.uid() OR p.professor_id = auth.uid()))
);

CREATE POLICY coach_insert_plans
ON public.plans
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = plans.athlete_id AND a.coach_id = auth.uid()));

CREATE POLICY coach_update_plans
ON public.plans
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = plans.athlete_id AND a.coach_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = plans.athlete_id AND a.coach_id = auth.uid()));

CREATE POLICY coach_delete_plans
ON public.plans
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = plans.athlete_id AND a.coach_id = auth.uid()));

-- Catálogo: leitura pública autenticada
ALTER TABLE public.periodization_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY catalog_read_all
ON public.periodization_models
FOR SELECT
TO authenticated
USING (true);;
