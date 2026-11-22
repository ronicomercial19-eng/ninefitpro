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
FROM public.periodization_models pm;;
