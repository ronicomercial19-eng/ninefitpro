-- supabase/migrations/20260701_smart_rpcs.sql
-- Migration: funções heurísticas smart_periodizer e smart_training_model

-- smart_periodizer: retorna um jsonb com informações básicas da periodização escolhida
CREATE OR REPLACE FUNCTION public.smart_periodizer(p_athlete_id uuid)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  a record;
  chosen jsonb;
BEGIN
  SELECT * INTO a FROM public.athletes WHERE id = p_athlete_id;

  -- Heurística simples baseada em experience_level / primary_goal
  IF a IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  IF a.experience_level IS NULL OR lower(a.experience_level) = 'beginner' THEN
    SELECT row_to_json(p)::jsonb INTO chosen
    FROM (
      SELECT id, name, focus, difficulty_factor FROM public.periodizations WHERE lower(focus) = 'general' LIMIT 1
    ) p;
  ELSIF a.primary_goal IS NOT NULL AND lower(a.primary_goal) = 'strength' THEN
    SELECT row_to_json(p)::jsonb INTO chosen
    FROM (
      SELECT id, name, focus, difficulty_factor FROM public.periodizations WHERE lower(focus) = 'strength' ORDER BY difficulty_factor DESC LIMIT 1
    ) p;
  ELSE
    SELECT row_to_json(p)::jsonb INTO chosen
    FROM (
      SELECT id, name, focus, difficulty_factor FROM public.periodizations ORDER BY difficulty_factor LIMIT 1
    ) p;
  END IF;

  RETURN COALESCE(chosen, '{}'::jsonb);
END;
$$;

-- smart_training_model: retorna jsonb com o modelo de treino escolhido
CREATE OR REPLACE FUNCTION public.smart_training_model(p_athlete_id uuid, p_periodization_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  a record;
  model jsonb;
BEGIN
  SELECT * INTO a FROM public.athletes WHERE id = p_athlete_id;
  IF a IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT row_to_json(t)::jsonb INTO model
  FROM public.training_models t
  LEFT JOIN public.training_model_meta m ON m.model_id = t.id
  WHERE (m.min_days IS NULL OR m.min_days <= COALESCE(a.sessions_per_week, 4))
    AND (m.recommended_experience IS NULL OR lower(m.recommended_experience) = lower(COALESCE(a.experience_level, '')))
  ORDER BY t.popularity DESC NULLS LAST
  LIMIT 1;

  RETURN COALESCE(model, '{}'::jsonb);
END;
$$;

-- Notes:
-- - These functions are intentionally simple heuristics. They can be expanded to
--   include injuries, last_periodization_id, measurements, etc.
-- - If the project does not have periodizations/training_models tables yet, create them
--   or adapt the logic to your existing template tables.
