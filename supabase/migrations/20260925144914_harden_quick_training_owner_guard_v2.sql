CREATE OR REPLACE FUNCTION public.fn_treino_rapido(p_athlete_id uuid, p_objetivo text DEFAULT NULL::text, p_tempo_min integer DEFAULT 20, p_equipamento text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_limit INT4 := GREATEST(3, LEAST(10, p_tempo_min / 5));
  v_exercises JSON;
  v_goals text[];
  v_equipments text[];
BEGIN
  IF auth.uid() IS NULL OR (NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND (a.user_id = auth.uid() OR a.coach_id = auth.uid())) AND NOT EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = p_athlete_id AND l.user_id = auth.uid())) THEN
    RAISE EXCEPTION 'athlete_access_denied';
  END IF;
  -- Mapeamento real: código do front -> valores que existem em exercises
  v_goals := CASE lower(coalesce(p_objetivo,''))
    WHEN 'fatburn' THEN ARRAY['endurance','power']
    WHEN 'strength' THEN ARRAY['strength','power']
    WHEN 'cardio' THEN ARRAY['endurance']
    WHEN 'mobility' THEN ARRAY['strength','endurance'] -- mobilidade filtra por equipment, não por goal
    ELSE NULL
  END;

  v_equipments := CASE lower(coalesce(p_equipamento,''))
    WHEN 'home' THEN ARRAY['Peso Corporal','nenhum','Mobilidade','Ativação']
    WHEN 'home_basic' THEN ARRAY['Peso Corporal','nenhum','TRX','Funcional','Ativação']
    WHEN 'gym' THEN ARRAY['Musculação','Crossfit','barra','Funcional']
    WHEN 'outdoor' THEN ARRAY['Funcional','Peso Corporal','nenhum','Corda Naval','Pliométricos']
    ELSE NULL
  END;

  -- Objetivo "mobility" força usar a categoria Mobilidade independente do equipamento
  IF lower(coalesce(p_objetivo,'')) = 'mobility' THEN
    v_equipments := ARRAY['Mobilidade','Ativação'];
  END IF;

  SELECT json_agg(row_to_json(e)) INTO v_exercises
  FROM (
    SELECT id, name, video_url, gif_url, target_muscles, difficulty_level
    FROM public.exercises
    WHERE video_url IS NOT NULL
      AND (v_equipments IS NULL OR equipment = ANY(v_equipments))
      AND (v_goals IS NULL OR goal = ANY(v_goals) OR goal IS NULL)
    ORDER BY random()
    LIMIT v_limit
  ) e;

  -- Fallback 1: relaxa o goal, mantém equipamento (equipamento é a restrição física real)
  IF v_exercises IS NULL AND v_equipments IS NOT NULL THEN
    SELECT json_agg(row_to_json(e)) INTO v_exercises
    FROM (
      SELECT id, name, video_url, gif_url, target_muscles, difficulty_level
      FROM public.exercises
      WHERE video_url IS NOT NULL AND equipment = ANY(v_equipments)
      ORDER BY random() LIMIT v_limit
    ) e;
  END IF;

  -- Fallback 2: só então cai pra aleatório puro (sem dado suficiente pra filtrar)
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
$function$;
REVOKE ALL ON FUNCTION public.fn_treino_rapido(uuid,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_treino_rapido(uuid,text,integer,text) TO authenticated;;
