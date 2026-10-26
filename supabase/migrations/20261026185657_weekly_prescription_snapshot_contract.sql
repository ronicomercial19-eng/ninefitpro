DO $$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef('public.fn_get_week_workouts(uuid,date)'::regprocedure) INTO v_def;
 IF strpos(v_def,'''name'', ex.name')=0 THEN RAISE EXCEPTION 'weekly_contract_anchor_missing'; END IF;
 v_def:=replace(v_def,'''name'', ex.name','''name'', coalesce(we.exercise_name,ex.name)');
 v_def:=replace(v_def,'''rest_seconds'', we.rest_seconds',
 '''rest_seconds'', we.rest_seconds, ''notes'',coalesce(we.observations->>''notes'',we.notes),''tempo'',we.tempo');
 v_def:=replace(v_def,'SELECT e.id AS execution_id, e.status',
 'SELECT e.id AS execution_id, CASE WHEN e.status=''completed'' AND NOT e.completion_valid THEN ''planned'' WHEN e.status=''abandoned'' THEN ''skipped'' ELSE e.status END AS status');
 EXECUTE v_def;
END $$;
UPDATE public.api_connectors SET endpoint='https://xtexysqtfsofdohujtfr.supabase.co/functions/v1/fitpro-staff-gateway' WHERE key='staff';
NOTIFY pgrst,'reload schema';
