SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
-- Cover the actual recent-history predicates and ordered limits. A completed-
-- only partial index cannot serve the all-status execution history.
DO $migration$
DECLARE r record;owner_column smallint;date_column smallint;
BEGIN
 FOR r IN SELECT * FROM(VALUES
  ('workout_executions','athlete_id','workout_date','scale_workouts_athlete_date'),
  ('pain_reports','athlete_id','created_at','scale_pain_athlete_created'),
  ('student_training_assignments','student_id','created_at','scale_assignments_student_created')
 )x(table_name,owner_name,date_name,index_name) LOOP
  SELECT attnum INTO STRICT owner_column FROM pg_attribute WHERE attrelid=format('public.%I',r.table_name)::regclass AND attname=r.owner_name;
  SELECT attnum INTO STRICT date_column FROM pg_attribute WHERE attrelid=format('public.%I',r.table_name)::regclass AND attname=r.date_name;
  IF NOT EXISTS(SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_am am ON am.oid=c.relam WHERE i.indrelid=format('public.%I',r.table_name)::regclass AND i.indisvalid AND i.indpred IS NULL AND am.amname='btree' AND(i.indkey::smallint[])[0:1]=ARRAY[owner_column,date_column]) THEN
   EXECUTE format('CREATE INDEX %I ON public.%I(%I,%I DESC)',r.index_name,r.table_name,r.owner_name,r.date_name);
  END IF;
 END LOOP;
END $migration$;
-- The same goal was resolved three times when building one athlete object.
DO $migration$
DECLARE body text;
BEGIN
 body:=pg_get_functiondef('public.fn_coach_student_context(uuid)'::regprocedure);
 IF position('DECLARE v_context jsonb;' IN body)=0 OR position('v_context:=private.fitpro_student_context(p_athlete_id);' IN body)=0 OR position('private.fitpro_athlete_goal(id)->>' IN body)=0 THEN RAISE EXCEPTION 'coach_context_function_drift';END IF;
 body:=replace(body,'DECLARE v_context jsonb;','DECLARE v_goal jsonb;v_context jsonb;');
 body:=replace(body,'v_context:=private.fitpro_student_context(p_athlete_id);','v_goal:=(SELECT private.fitpro_athlete_goal(a.id) FROM public.athletes a WHERE a.id=p_athlete_id);v_context:=private.fitpro_student_context(p_athlete_id);');
 body:=replace(body,'private.fitpro_athlete_goal(id)->>','v_goal->>');
 EXECUTE body;
END $migration$;
