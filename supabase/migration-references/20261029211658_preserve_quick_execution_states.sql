DO $patch$
DECLARE d text; anchor text:='phase_name=''quick'' AND status IN (''in_progress'',''completed'')';
BEGIN
 SELECT pg_get_functiondef('public.fn_treino_rapido(uuid,text,integer,text)'::regprocedure) INTO d;
 IF strpos(d,anchor)=0 THEN RAISE EXCEPTION 'quick_execution_guard_anchor_missing';END IF;
 EXECUTE replace(d,anchor,'phase_name=''quick'' AND status IN (''started'',''in_progress'',''paused'',''completed'',''skipped'')');
END $patch$;

