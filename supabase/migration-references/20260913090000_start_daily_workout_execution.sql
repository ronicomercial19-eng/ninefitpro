-- Allow the weekly daily_workouts flow to use the durable execution player.
CREATE OR REPLACE FUNCTION public.fn_start_daily_workout_execution(p_daily_workout_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_athlete_id uuid;
  v_workout_date date;
  v_execution_id uuid;
BEGIN
  SELECT dw.athlete_id, dw.workout_date
    INTO v_athlete_id, v_workout_date
  FROM public.daily_workouts dw
  WHERE dw.id = p_daily_workout_id
    AND dw.athlete_id = public.fn_current_athlete_id();

  IF v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'daily_workout_access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT we.id INTO v_execution_id
  FROM public.workout_executions we
  WHERE we.athlete_id = v_athlete_id
    AND we.workout_date = v_workout_date
    AND we.status IN ('started', 'in_progress', 'paused')
    AND we.assignment_id IS NULL
  ORDER BY we.created_at DESC
  LIMIT 1;

  IF v_execution_id IS NULL THEN
    INSERT INTO public.workout_executions
      (athlete_id, workout_date, started_at, status)
    VALUES
      (v_athlete_id, v_workout_date, now(), 'in_progress')
    RETURNING id INTO v_execution_id;
  ELSE
    UPDATE public.workout_executions
      SET status = 'in_progress'
      WHERE id = v_execution_id AND status = 'paused';
  END IF;

  RETURN v_execution_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_start_daily_workout_execution(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_start_daily_workout_execution(uuid) TO authenticated;
