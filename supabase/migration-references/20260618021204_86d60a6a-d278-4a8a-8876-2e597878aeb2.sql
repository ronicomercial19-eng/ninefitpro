
CREATE OR REPLACE FUNCTION public.prescrever_treino_rapido(
  p_athlete_id uuid DEFAULT NULL,
  p_objetivo text DEFAULT NULL,
  p_tempo_min integer DEFAULT 45,
  p_equipamento text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_n_exercises int := GREATEST(4, LEAST(10, COALESCE(p_tempo_min,45) / 6));
  v_goal_pattern text := CASE
    WHEN p_objetivo = 'fatburn'  THEN '(fat|burn|hiit|cardio|emagre|queim)'
    WHEN p_objetivo = 'strength' THEN '(force|forca|strength|hipertrofia|power)'
    WHEN p_objetivo = 'mobility' THEN '(mob|recover|recupera|alongamento|flex)'
    WHEN p_objetivo = 'cardio'   THEN '(cardio|aerob|hiit|run|corrida)'
    ELSE '.*'
  END;
  v_equip_pattern text := CASE
    WHEN p_equipamento = 'home'       THEN '(body|peso|sem|none|nenhum)'
    WHEN p_equipamento = 'home_basic' THEN '(halter|dumbbell|elastic|band|kettle|peso)'
    WHEN p_equipamento = 'gym'        THEN '.*'
    WHEN p_equipamento = 'outdoor'    THEN '(body|peso|run|corrida|sem)'
    ELSE '.*'
  END;
  v_modelos jsonb;
  v_exercises jsonb;
BEGIN
  -- 1) Selecionar até 3 modelos compatíveis com o objetivo
  SELECT COALESCE(jsonb_agg(m), '[]'::jsonb) INTO v_modelos FROM (
    SELECT
      wm.id AS modelo_id,
      wm.name AS nome,
      wm.general_objective AS objetivo,
      wm.stimulus_type AS stimulus
    FROM workout_models wm
    WHERE
      (p_objetivo IS NULL OR wm.general_objective ~* v_goal_pattern OR wm.stimulus_type ~* v_goal_pattern)
    ORDER BY
      (wm.general_objective ~* v_goal_pattern)::int DESC,
      random()
    LIMIT 3
  ) m;

  -- 2) Selecionar exercícios reais filtrados por objetivo + equipamento, com vídeo
  SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) INTO v_exercises FROM (
    SELECT
      e.id, e.name, e.video_url, e.gif_url, e.target_muscles,
      CASE WHEN p_objetivo='strength' THEN 4 WHEN p_objetivo='fatburn' THEN 3 ELSE 3 END AS sets,
      CASE
        WHEN p_objetivo='strength' THEN '6-10'
        WHEN p_objetivo='fatburn'  THEN '12-15'
        WHEN p_objetivo='cardio'   THEN '40s'
        WHEN p_objetivo='mobility' THEN '30s'
        ELSE '10-12'
      END AS reps_range,
      CASE
        WHEN p_objetivo='strength' THEN 90
        WHEN p_objetivo='fatburn'  THEN 30
        WHEN p_objetivo='cardio'   THEN 20
        ELSE 60
      END AS rest_seconds
    FROM exercises e
    WHERE e.video_url IS NOT NULL
      AND (p_objetivo IS NULL OR e.goal IS NULL OR e.goal ~* v_goal_pattern)
      AND (p_equipamento IS NULL OR e.equipment IS NULL OR e.equipment ~* v_equip_pattern)
    ORDER BY
      (e.goal ~* v_goal_pattern)::int DESC,
      (e.equipment ~* v_equip_pattern)::int DESC,
      random()
    LIMIT v_n_exercises
  ) e;

  -- Fallback: se vazio, pegar quaisquer exercícios com vídeo
  IF jsonb_array_length(v_exercises) = 0 THEN
    SELECT COALESCE(jsonb_agg(e), '[]'::jsonb) INTO v_exercises FROM (
      SELECT
        e.id, e.name, e.video_url, e.gif_url, e.target_muscles,
        3 AS sets, '10-12' AS reps_range, 60 AS rest_seconds
      FROM exercises e
      WHERE e.video_url IS NOT NULL
      ORDER BY random()
      LIMIT v_n_exercises
    ) e;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'date', CURRENT_DATE,
    'objetivo', p_objetivo,
    'equipamento', p_equipamento,
    'tempo_min', p_tempo_min,
    'modelos', v_modelos,
    'exercises', v_exercises
  );
END;
$$;
