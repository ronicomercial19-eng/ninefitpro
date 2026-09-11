-- Stage 3/12: durable, resumable and idempotent workout execution.

ALTER TABLE public.workout_executions
  ADD COLUMN IF NOT EXISTS assignment_id uuid
  REFERENCES public.student_training_assignments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workout_executions_one_open_assignment_idx
  ON public.workout_executions(athlete_id, assignment_id)
  WHERE assignment_id IS NOT NULL AND status IN ('started', 'in_progress', 'paused');

CREATE UNIQUE INDEX IF NOT EXISTS workout_exercise_sets_identity_idx
  ON public.workout_exercise_sets(execution_id, exercise_order, set_number);

CREATE OR REPLACE FUNCTION public.fn_start_workout_execution(p_assignment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_athlete_id uuid;
  v_execution_id uuid;
BEGIN
  SELECT sta.student_id INTO v_athlete_id
  FROM public.student_training_assignments sta
  WHERE sta.id = p_assignment_id
    AND sta.student_id = public.fn_current_athlete_id();

  IF v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'assignment_access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT we.id INTO v_execution_id
  FROM public.workout_executions we
  WHERE we.athlete_id = v_athlete_id
    AND we.assignment_id = p_assignment_id
    AND we.status IN ('started', 'in_progress', 'paused')
  ORDER BY we.created_at DESC
  LIMIT 1;

  IF v_execution_id IS NULL THEN
    INSERT INTO public.workout_executions
      (athlete_id, assignment_id, workout_date, started_at, status)
    VALUES
      (v_athlete_id, p_assignment_id, CURRENT_DATE, now(), 'in_progress')
    RETURNING id INTO v_execution_id;
  ELSE
    UPDATE public.workout_executions
      SET status = 'in_progress'
      WHERE id = v_execution_id AND status = 'paused';
  END IF;

  RETURN v_execution_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_save_workout_set(
  p_execution_id uuid,
  p_exercise_name text,
  p_exercise_order integer,
  p_set_number integer,
  p_completed boolean,
  p_actual_reps integer DEFAULT NULL,
  p_actual_weight numeric DEFAULT NULL,
  p_planned_reps text DEFAULT NULL,
  p_rest_seconds integer DEFAULT NULL,
  p_tempo text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_set_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workout_executions we
    WHERE we.id = p_execution_id
      AND we.athlete_id = public.fn_current_athlete_id()
      AND we.status IN ('started', 'in_progress', 'paused')
  ) THEN
    RAISE EXCEPTION 'execution_access_denied' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.workout_exercise_sets
    (execution_id, exercise_name, exercise_order, set_number, completed,
     actual_reps, actual_weight, planned_reps, rest_seconds, tempo)
  VALUES
    (p_execution_id, p_exercise_name, p_exercise_order, p_set_number, p_completed,
     p_actual_reps, p_actual_weight, p_planned_reps, p_rest_seconds, p_tempo)
  ON CONFLICT (execution_id, exercise_order, set_number) DO UPDATE SET
    completed = EXCLUDED.completed,
    actual_reps = EXCLUDED.actual_reps,
    actual_weight = EXCLUDED.actual_weight,
    planned_reps = EXCLUDED.planned_reps,
    rest_seconds = EXCLUDED.rest_seconds,
    tempo = EXCLUDED.tempo
  RETURNING id INTO v_set_id;

  RETURN v_set_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_complete_workout_execution(
  p_execution_id uuid,
  p_duration_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_completed integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workout_executions we
    WHERE we.id = p_execution_id
      AND we.athlete_id = public.fn_current_athlete_id()
      AND we.status IN ('started', 'in_progress', 'paused')
  ) THEN
    RAISE EXCEPTION 'execution_access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_completed
  FROM public.workout_exercise_sets wes
  WHERE wes.execution_id = p_execution_id AND wes.completed IS TRUE;

  IF v_completed = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_completed_sets');
  END IF;

  UPDATE public.workout_executions
  SET status = 'completed',
      completed_at = now(),
      duration_minutes = GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (now() - COALESCE(started_at, now()))) / 60.0)
      )
  WHERE id = p_execution_id;

  RETURN jsonb_build_object('ok', true, 'completed_sets', v_completed);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_start_workout_execution(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_save_workout_set(uuid,text,integer,integer,boolean,integer,numeric,text,integer,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_complete_workout_execution(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_start_workout_execution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_workout_set(uuid,text,integer,integer,boolean,integer,numeric,text,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_complete_workout_execution(uuid,integer) TO authenticated;

