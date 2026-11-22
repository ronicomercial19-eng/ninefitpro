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

  -- Propaga o ajuste para daily_workouts.changes_json: e isso que
  -- WorkoutExecution.tsx (treino guiado) realmente le como override
  -- (substituicao integral da lista de exercicios do dia). Sem isso,
  -- o ajuste ficava preso em workout_exercises e nunca aparecia pro
  -- aluno (bug reportado na auditoria de frontend).
  --
  -- IMPORTANTE: a lista completa do dia vem de workout_exercises
  -- (fonte de verdade real deste daily_workout_id), NAO de
  -- student_training_assignments.training_data -- confirmado que os
  -- dois podem divergir (exercicios do dia real nem sempre existem
  -- no template do plano). Usar training_data como base faria o
  -- override substituir o dia inteiro por um subconjunto incompleto,
  -- uma regressao pior que o bug original. Enriquecemos cada
  -- exercicio com nome/video/gif via v_exercises_canonical, que e o
  -- mesmo formato de exibicao que WorkoutExecution.tsx espera.
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
        'sets', we.sets, 'reps_range', we.reps_range, 'rest_seconds', we.rest_seconds
      ))
      FROM public.workout_exercises we WHERE we.daily_workout_id = v_daily_workout_id
    )
  );
END;
$$;;
