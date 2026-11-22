-- QA Fase F (16/09): mesmo padrão dos outros 4 achados — SECURITY DEFINER
-- sem checagem de posse, EXECUTE liberado até pra anon/PUBLIC. Este é mais
-- grave que os anteriores por ser de ESCRITA: qualquer usuário podia
-- reescrever o treino (séries/reps/exercícios) de QUALQUER atleta, de
-- qualquer data, só sabendo o UUID.
CREATE OR REPLACE FUNCTION public.fn_ajustar_treino_dia(p_athlete_id uuid, p_data date, p_changes jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_daily_workout_id UUID;
  v_change JSONB;
  v_patched_exercises JSONB;
  v_new_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND a.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.athlete_auth_link al WHERE al.athlete_id = p_athlete_id AND al.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.athletes a
    JOIN auth.users u ON u.email = a.email
    WHERE a.id = p_athlete_id AND u.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT id INTO v_daily_workout_id
  FROM public.daily_workouts
  WHERE athlete_id = p_athlete_id AND workout_date = p_data
  LIMIT 1;

  IF v_daily_workout_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_workout_for_date');
  END IF;

  FOR v_change IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
    v_new_id := NULL;
    IF v_change ? 'new_exercise_id' AND (v_change->>'new_exercise_id') IS NOT NULL THEN
      v_new_id := (v_change->>'new_exercise_id')::uuid;
    ELSIF v_change ? 'new_exercise_name' AND (v_change->>'new_exercise_name') IS NOT NULL THEN
      SELECT id INTO v_new_id FROM public.exercises
      WHERE name ILIKE (v_change->>'new_exercise_name')
      LIMIT 1;
      IF v_new_id IS NULL THEN
        SELECT id INTO v_new_id FROM public.exercises
        WHERE name ILIKE '%' || (v_change->>'new_exercise_name') || '%'
        LIMIT 1;
      END IF;
    END IF;

    IF v_new_id IS NOT NULL THEN
      UPDATE public.workout_exercises
      SET exercise_id = v_new_id,
          override_locked = true
      WHERE daily_workout_id = v_daily_workout_id
        AND exercise_id = (v_change->>'exercise_id')::uuid;
    END IF;

    UPDATE public.workout_exercises
    SET sets = COALESCE((v_change->>'sets')::int4, sets),
        reps_range = COALESCE(v_change->>'reps_range', reps_range),
        rest_seconds = COALESCE((v_change->>'rest_seconds')::int4, rest_seconds),
        rpe_target = COALESCE((v_change->>'intensidade')::int4, rpe_target),
        observations = CASE
          WHEN v_change ? 'fadiga' THEN COALESCE(observations, '{}'::jsonb) || jsonb_build_object('fadiga', v_change->'fadiga')
          ELSE observations
        END,
        override_locked = true
    WHERE daily_workout_id = v_daily_workout_id
      AND exercise_id = COALESCE(v_new_id, (v_change->>'exercise_id')::uuid);
  END LOOP;

  SELECT jsonb_agg(
    jsonb_build_object(
      'exercise_id', we.exercise_id,
      'name', vc.name,
      'sets', we.sets,
      'reps', we.reps_range,
      'rest_seconds', we.rest_seconds,
      'tempo', we.tempo,
      'notes', we.observations,
      'video_url', vc.video_url,
      'gif_url', vc.gif_url,
      'target_muscles', to_jsonb(vc.target_muscles),
      'order', we.exercise_order,
      'override_locked', we.override_locked
    )
    ORDER BY we.exercise_order
  )
  INTO v_patched_exercises
  FROM public.workout_exercises we
  LEFT JOIN public.v_exercises_canonical vc ON vc.id = we.exercise_id
  WHERE we.daily_workout_id = v_daily_workout_id;

  UPDATE public.daily_workouts
  SET changes_json = jsonb_build_object('exercises', COALESCE(v_patched_exercises, '[]'::jsonb)),
      override_locked = true,
      updated_at = now()
  WHERE id = v_daily_workout_id;

  RETURN json_build_object(
    'success', true,
    'daily_workout_id', v_daily_workout_id,
    'exercises', (
      SELECT json_agg(json_build_object(
        'id', we.id, 'exercise_id', we.exercise_id,
        'exercise_name', vc.name,
        'sets', we.sets, 'reps_range', we.reps_range, 'rest_seconds', we.rest_seconds,
        'video_url', vc.video_url
      ) ORDER BY we.exercise_order)
      FROM public.workout_exercises we
      LEFT JOIN public.v_exercises_canonical vc ON vc.id = we.exercise_id
      WHERE we.daily_workout_id = v_daily_workout_id
    )
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_ajustar_treino_dia(uuid, date, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_ajustar_treino_dia(uuid, date, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_ajustar_treino_dia(uuid, date, jsonb) TO authenticated;;
