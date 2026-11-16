-- Endurance sessions keep distance and time separate from strength repetitions.
ALTER TABLE public.workout_executions
  ADD COLUMN IF NOT EXISTS actual_distance_m numeric,
  ADD COLUMN IF NOT EXISTS actual_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS actual_segments jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.fn_start_endurance_execution(p_daily_workout_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_day public.daily_workouts%ROWTYPE; v_id uuid;
BEGIN
  SELECT * INTO v_day FROM public.daily_workouts
   WHERE id=p_daily_workout_id AND athlete_id=public.fn_current_athlete_id();
  IF v_day.id IS NULL THEN RAISE EXCEPTION 'daily_workout_access_denied' USING ERRCODE='42501'; END IF;
  IF v_day.prescription_issue IS NOT NULL OR jsonb_array_length(coalesce(v_day.prescription_segments,'[]'::jsonb))=0
    THEN RAISE EXCEPTION 'endurance_prescription_unavailable' USING ERRCODE='55000'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_day.athlete_id::text||v_day.workout_date::text||'daily',0));
  IF EXISTS(SELECT 1 FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND daily_workout_id=v_day.id AND status='completed')
    THEN RAISE EXCEPTION 'workout_already_completed' USING ERRCODE='55000'; END IF;
  SELECT id INTO v_id FROM public.workout_executions
   WHERE athlete_id=v_day.athlete_id AND daily_workout_id=v_day.id AND status IN ('started','in_progress','paused')
   ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN
    IF EXISTS(SELECT 1 FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND workout_date=v_day.workout_date AND status IN ('started','in_progress','paused'))
      THEN RAISE EXCEPTION 'finish_open_session_first' USING ERRCODE='55000'; END IF;
    INSERT INTO public.workout_executions(athlete_id,daily_workout_id,workout_date,started_at,status,phase_name)
      VALUES(v_day.athlete_id,v_day.id,v_day.workout_date,now(),'in_progress',v_day.day_name) RETURNING id INTO v_id;
  ELSE
    UPDATE public.workout_executions SET status='in_progress' WHERE id=v_id AND status='paused';
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.fn_complete_endurance_execution(
 p_execution_id uuid, p_duration_seconds integer, p_distance_m numeric,
 p_rpe numeric, p_actual_segments jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_execution public.workout_executions%ROWTYPE; v_day public.daily_workouts%ROWTYPE;
BEGIN
  SELECT * INTO v_execution FROM public.workout_executions
   WHERE id=p_execution_id AND athlete_id=public.fn_current_athlete_id() AND status IN ('started','in_progress','paused') FOR UPDATE;
  IF v_execution.id IS NULL THEN RAISE EXCEPTION 'execution_access_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_day FROM public.daily_workouts WHERE id=v_execution.daily_workout_id;
  IF v_day.id IS NULL OR jsonb_array_length(coalesce(v_day.prescription_segments,'[]'::jsonb))=0
    THEN RAISE EXCEPTION 'endurance_prescription_unavailable' USING ERRCODE='55000'; END IF;
  IF EXISTS(SELECT 1 FROM public.workout_exercises WHERE daily_workout_id=v_day.id)
    THEN RAISE EXCEPTION 'mixed_session_requires_strength_completion' USING ERRCODE='55000'; END IF;
  IF p_duration_seconds IS NULL OR p_duration_seconds<=0 OR p_duration_seconds>86400
     OR p_distance_m IS NULL OR p_distance_m<0 OR p_distance_m>1000000
     OR p_rpe IS NULL OR p_rpe<1 OR p_rpe>10
     OR jsonb_typeof(p_actual_segments) IS DISTINCT FROM 'array'
    THEN RAISE EXCEPTION 'invalid_endurance_result' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_actual_segments) s
    WHERE jsonb_typeof(s.value)<>'object' OR s.value ? 'reps' OR s.value ? 'sets')
    THEN RAISE EXCEPTION 'invalid_endurance_segment_units' USING ERRCODE='22023'; END IF;
  UPDATE public.workout_executions SET status='completed',completed_at=now(),
    duration_minutes=greatest(1,ceil(p_duration_seconds/60.0)),actual_duration_seconds=p_duration_seconds,actual_distance_m=p_distance_m,
    rpe=p_rpe,actual_segments=p_actual_segments WHERE id=p_execution_id;
  RETURN jsonb_build_object('ok',true,'execution_id',p_execution_id,'duration_seconds',p_duration_seconds,'distance_m',p_distance_m);
END $$;

CREATE OR REPLACE FUNCTION public.fn_save_endurance_progress(
 p_execution_id uuid, p_duration_seconds integer, p_distance_m numeric,
 p_actual_segments jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_execution public.workout_executions%ROWTYPE; v_day public.daily_workouts%ROWTYPE;
BEGIN
  SELECT * INTO v_execution FROM public.workout_executions
   WHERE id=p_execution_id AND athlete_id=public.fn_current_athlete_id() AND status IN ('started','in_progress','paused') FOR UPDATE;
  IF v_execution.id IS NULL THEN RAISE EXCEPTION 'execution_access_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_day FROM public.daily_workouts WHERE id=v_execution.daily_workout_id;
  IF v_day.id IS NULL OR jsonb_array_length(coalesce(v_day.prescription_segments,'[]'::jsonb))=0
    THEN RAISE EXCEPTION 'endurance_prescription_unavailable' USING ERRCODE='55000'; END IF;
  IF p_duration_seconds IS NULL OR p_duration_seconds<0 OR p_duration_seconds>86400
     OR p_distance_m IS NULL OR p_distance_m<0 OR p_distance_m>1000000
     OR jsonb_typeof(p_actual_segments) IS DISTINCT FROM 'array'
    THEN RAISE EXCEPTION 'invalid_endurance_result' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_actual_segments) s
    WHERE jsonb_typeof(s.value)<>'object' OR s.value ? 'reps' OR s.value ? 'sets')
    THEN RAISE EXCEPTION 'invalid_endurance_segment_units' USING ERRCODE='22023'; END IF;
  UPDATE public.workout_executions SET actual_duration_seconds=p_duration_seconds, actual_distance_m=p_distance_m, actual_segments=p_actual_segments
    WHERE id=p_execution_id;
  RETURN jsonb_build_object('ok',true,'execution_id',p_execution_id);
END $$;

REVOKE ALL ON FUNCTION public.fn_start_endurance_execution(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.fn_complete_endurance_execution(uuid,integer,numeric,numeric,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.fn_save_endurance_progress(uuid,integer,numeric,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_start_endurance_execution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_complete_endurance_execution(uuid,integer,numeric,numeric,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_endurance_progress(uuid,integer,numeric,jsonb) TO authenticated;

-- The existing completion trigger derives average effort only from strength
-- sets. Keep that behavior for strength and use the session RPE for endurance.
CREATE OR REPLACE FUNCTION public.trigger_workout_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status IN ('started','in_progress','paused') AND NEW.status = 'completed' THEN
    NEW.completed_at = now();
    SELECT COALESCE(SUM(s.actual_weight * s.actual_reps), 0),
           COALESCE(AVG(s.rpe), NEW.rpe, 0)
      INTO NEW.total_volume_kg, NEW.avg_rpe
      FROM public.workout_exercise_sets s WHERE s.execution_id = NEW.id AND s.completed = true;
    PERFORM public.log_event('completed', 'workout', NEW.id, NEW.athlete_id,
      jsonb_build_object('volume', NEW.total_volume_kg, 'duration', NEW.duration_minutes,
                         'distance_m', NEW.actual_distance_m));
  END IF;
  RETURN NEW;
END $$;
