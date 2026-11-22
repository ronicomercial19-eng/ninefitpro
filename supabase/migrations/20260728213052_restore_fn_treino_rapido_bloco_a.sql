CREATE OR REPLACE FUNCTION public.fn_treino_rapido(
  p_athlete_id UUID,
  p_objetivo TEXT DEFAULT NULL,
  p_tempo_min INT4 DEFAULT 20,
  p_equipamento TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INT4 := GREATEST(3, LEAST(10, p_tempo_min / 5));
  v_exercises JSON;
BEGIN
  SELECT json_agg(row_to_json(e)) INTO v_exercises
  FROM (
    SELECT id, name, video_url, gif_url, target_muscles, difficulty_level
    FROM public.exercises
    WHERE video_url IS NOT NULL
      AND (p_equipamento IS NULL OR equipment ILIKE '%'||p_equipamento||'%' OR equipment_needed ILIKE '%'||p_equipamento||'%')
      AND (p_objetivo IS NULL OR goal ILIKE '%'||p_objetivo||'%')
    ORDER BY random()
    LIMIT v_limit
  ) e;

  IF v_exercises IS NULL THEN
    SELECT json_agg(row_to_json(e)) INTO v_exercises
    FROM (
      SELECT id, name, video_url, gif_url, target_muscles
      FROM public.exercises WHERE video_url IS NOT NULL
      ORDER BY random() LIMIT v_limit
    ) e;
  END IF;

  DELETE FROM public.workout_exercises WHERE daily_workout_id IN (
    SELECT id FROM public.daily_workouts WHERE athlete_id = p_athlete_id AND workout_date = CURRENT_DATE AND workout_type = 'quick'
  );
  DELETE FROM public.daily_workouts WHERE athlete_id = p_athlete_id AND workout_date = CURRENT_DATE AND workout_type = 'quick';

  DECLARE
    v_daily_workout_id UUID;
  BEGIN
    INSERT INTO public.daily_workouts (athlete_id, day_number, day_name, focus_muscles, workout_type, workout_date)
    VALUES (p_athlete_id, 1, 'Treino Rápido - ' || COALESCE(p_objetivo, 'Geral'), ARRAY['full_body'], 'quick', CURRENT_DATE)
    RETURNING id INTO v_daily_workout_id;

    INSERT INTO public.workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds)
    SELECT v_daily_workout_id, (e->>'id')::uuid, row_number() OVER (), 3, '10-12', 60
    FROM json_array_elements(COALESCE(v_exercises, '[]'::json)) e;
  END;

  RETURN json_build_object(
    'exercises', COALESCE(v_exercises, '[]'::json),
    'objetivo', p_objetivo,
    'tempo_min', p_tempo_min,
    'sets_default', 3,
    'reps_default', '10-12',
    'rest_default_seconds', 60
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_treino_rapido(UUID, TEXT, INT4, TEXT) TO authenticated, service_role;;
