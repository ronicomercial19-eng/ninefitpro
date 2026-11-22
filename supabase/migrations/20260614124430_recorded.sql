
-- fn_award_xp: simple XP log into activation_events
CREATE OR REPLACE FUNCTION public.fn_award_xp(p_athlete_id uuid, p_amount int, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activation_events (user_id, event_key, metadata)
  VALUES (p_athlete_id, 'xp_awarded', jsonb_build_object('amount', p_amount, 'reason', p_reason, 'awarded_at', now()));
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_award_xp(uuid, int, text) TO service_role, authenticated;

-- aplicar_ajuste_treino_dia: applies structured changes only to today's workout_exercises
-- p_changes example: [{ "action":"swap", "exercise_id":"<uuid>", "new_exercise_id":"<uuid>" },
--                     { "action":"load", "exercise_id":"<uuid>", "load_percentage":75 },
--                     { "action":"sets", "exercise_id":"<uuid>", "sets":4, "reps_range":"8-10" },
--                     { "action":"remove", "exercise_id":"<uuid>" },
--                     { "action":"add", "new_exercise_id":"<uuid>", "sets":3, "reps_range":"8-12" }]
CREATE OR REPLACE FUNCTION public.aplicar_ajuste_treino_dia(
  p_athlete_id uuid,
  p_workout_date date,
  p_changes jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_execution_id uuid;
  v_daily_workout_id uuid;
  v_change jsonb;
  v_action text;
  v_applied int := 0;
  v_max_order int;
BEGIN
  SELECT id, periodization_id INTO v_execution_id, v_daily_workout_id
  FROM public.workout_executions
  WHERE athlete_id = p_athlete_id AND workout_date = p_workout_date
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_execution_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_workout_for_day');
  END IF;

  -- Use execution.id as daily_workout_id grouping key
  v_daily_workout_id := v_execution_id;

  FOR v_change IN SELECT * FROM jsonb_array_elements(p_changes)
  LOOP
    v_action := v_change->>'action';

    IF v_action = 'swap' THEN
      UPDATE public.workout_exercises
      SET exercise_id = (v_change->>'new_exercise_id')::uuid,
          override_locked = true
      WHERE daily_workout_id = v_daily_workout_id
        AND exercise_id = (v_change->>'exercise_id')::uuid;
      v_applied := v_applied + 1;

    ELSIF v_action = 'load' THEN
      UPDATE public.workout_exercises
      SET load_percentage = COALESCE((v_change->>'load_percentage')::numeric, load_percentage),
          override_locked = true
      WHERE daily_workout_id = v_daily_workout_id
        AND exercise_id = (v_change->>'exercise_id')::uuid;
      v_applied := v_applied + 1;

    ELSIF v_action = 'sets' THEN
      UPDATE public.workout_exercises
      SET sets = COALESCE((v_change->>'sets')::int, sets),
          reps_range = COALESCE(v_change->>'reps_range', reps_range),
          override_locked = true
      WHERE daily_workout_id = v_daily_workout_id
        AND exercise_id = (v_change->>'exercise_id')::uuid;
      v_applied := v_applied + 1;

    ELSIF v_action = 'remove' THEN
      DELETE FROM public.workout_exercises
      WHERE daily_workout_id = v_daily_workout_id
        AND exercise_id = (v_change->>'exercise_id')::uuid;
      v_applied := v_applied + 1;

    ELSIF v_action = 'add' THEN
      SELECT COALESCE(MAX(exercise_order), 0) INTO v_max_order
      FROM public.workout_exercises
      WHERE daily_workout_id = v_daily_workout_id;

      INSERT INTO public.workout_exercises (
        daily_workout_id, exercise_id, exercise_order, sets, reps_range, override_locked
      ) VALUES (
        v_daily_workout_id,
        (v_change->>'new_exercise_id')::uuid,
        v_max_order + 1,
        COALESCE((v_change->>'sets')::int, 3),
        COALESCE(v_change->>'reps_range', '8-12'),
        true
      );
      v_applied := v_applied + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'execution_id', v_execution_id,
    'daily_workout_id', v_daily_workout_id,
    'applied', v_applied
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.aplicar_ajuste_treino_dia(uuid, date, jsonb) TO service_role, authenticated;

-- Ensure views are readable
GRANT SELECT ON public.vw_athlete_full_profile TO authenticated, service_role;
GRANT SELECT ON public.vw_athlete_periodizacao_ativa TO authenticated, service_role;
GRANT SELECT ON public.vw_athlete_status TO authenticated, service_role;
;
