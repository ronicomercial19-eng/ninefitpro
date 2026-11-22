CREATE OR REPLACE FUNCTION public.fn_ajustar_treino_dia(
  p_athlete_id uuid,
  p_data date,
  p_changes jsonb
) RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_daily_workout_id UUID;
  v_change JSONB;
  v_weekday_key TEXT;
  v_base_exercises JSONB;
  v_patched_exercises JSONB;
BEGIN
  SELECT id INTO v_daily_workout_id
  FROM public.daily_workouts
  WHERE athlete_id = p_athlete_id AND workout_date = p_data
  LIMIT 1;

  IF v_daily_workout_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_workout_for_date');
  END IF;

  FOR v_change IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
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
      AND exercise_id = (v_change->>'exercise_id')::uuid;
  END LOOP;

  -- Propaga o ajuste para daily_workouts.changes_json: é isso que
  -- WorkoutExecution.tsx (treino guiado) realmente le como override.
  -- Sem isso, o ajuste ficava preso em workout_exercises e nunca
  -- aparecia pro aluno (bug reportado na auditoria de frontend).
  v_weekday_key := (ARRAY['domingo','segunda','terca','quarta','quinta','sexta','sabado'])[extract(dow from p_data)::int + 1];

  SELECT sta.training_data -> 'exercises'
  INTO v_base_exercises
  FROM public.student_training_assignments sta
  WHERE sta.student_id = p_athlete_id AND sta.is_active = true
  ORDER BY sta.created_at DESC
  LIMIT 1;

  IF v_base_exercises IS NOT NULL THEN
    SELECT jsonb_agg(
      CASE
        WHEN patch.value IS NOT NULL THEN
          ex || jsonb_build_object(
            'sets', COALESCE((patch.value->>'sets')::int4, (ex->>'sets')::int4),
            'reps', COALESCE(patch.value->>'reps_range', ex->>'reps'),
            'rest_seconds', COALESCE((patch.value->>'rest_seconds')::int4, (ex->>'rest_seconds')::int4),
            'override_locked', true
          )
        ELSE ex
      END
    )
    INTO v_patched_exercises
    FROM jsonb_array_elements(v_base_exercises) ex
    LEFT JOIN LATERAL (
      SELECT c.value
      FROM jsonb_array_elements(p_changes) c
      WHERE (c.value->>'exercise_id') = (ex->>'exercise_id')
      LIMIT 1
    ) patch ON true
    WHERE ex->>'training_day' = v_weekday_key;

    UPDATE public.daily_workouts
    SET changes_json = jsonb_build_object('exercises', COALESCE(v_patched_exercises, '[]'::jsonb)),
        override_locked = true,
        updated_at = now()
    WHERE id = v_daily_workout_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'daily_workout_id', v_daily_workout_id,
    'exercises', (
      SELECT json_agg(json_build_object(
        'id', we.id, 'exercise_id', we.exercise_id,
        'sets', we.sets, 'reps_range', we.reps_range, 'rest_seconds', we.rest_seconds
      ))
      FROM public.workout_exercises we WHERE we.daily_workout_id = v_daily_workout_id
    )
  );
END;
$$;;
