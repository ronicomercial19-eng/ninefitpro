-- Equal timestamps must not change visible history when PostgreSQL switches
-- between a bitmap scan and an ordered index scan.
DO $migration$
DECLARE body text;
BEGIN
 body:=pg_get_functiondef('public.fn_coach_student_context(uuid)'::regprocedure);
 IF position('ORDER BY workout_date DESC LIMIT 60' IN body)=0 THEN RAISE EXCEPTION 'coach_history_function_drift';END IF;
 body:=replace(body,'jsonb_agg(t ORDER BY workout_date DESC)','jsonb_agg(t ORDER BY workout_date DESC,id DESC)');
 body:=replace(body,'ORDER BY workout_date DESC LIMIT 60','ORDER BY workout_date DESC,id DESC LIMIT 60');
 body:=replace(body,'ORDER BY created_at DESC LIMIT 20','ORDER BY created_at DESC,id DESC LIMIT 20');
 body:=replace(body,'ORDER BY data_avaliacao DESC LIMIT 10','ORDER BY data_avaliacao DESC,id DESC LIMIT 10');
 body:=replace(body,'ORDER BY recorded_at DESC LIMIT 20','ORDER BY recorded_at DESC,id DESC LIMIT 20');
 body:=replace(body,'ORDER BY scheduled_at DESC LIMIT 30','ORDER BY scheduled_at DESC,id DESC LIMIT 30');
 body:=replace(body,'ORDER BY c.completion_date DESC LIMIT 30','ORDER BY c.completion_date DESC,c.protocol_id DESC LIMIT 30');
 EXECUTE body;
END $migration$;
