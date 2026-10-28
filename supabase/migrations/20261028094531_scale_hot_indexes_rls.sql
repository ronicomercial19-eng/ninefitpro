SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
-- Cover referencing keys for relationship lookups and user-data cascades.
-- Do not duplicate an existing non-partial index with these leading columns.
DO $migration$
DECLARE r record;columns_sql text;index_name text;
BEGIN
 FOR r IN SELECT c.conrelid,c.conname,c.conkey,n.nspname,t.relname
 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
 WHERE c.contype='f' AND n.nspname IN('public','private') AND NOT EXISTS(
  SELECT 1 FROM pg_index i WHERE i.indrelid=c.conrelid AND i.indisvalid AND(i.indpred IS NULL OR(cardinality(c.conkey)=1 AND pg_get_expr(i.indpred,i.indrelid)=format('(%I IS NOT NULL)',(SELECT attname FROM pg_attribute WHERE attrelid=c.conrelid AND attnum=c.conkey[1]))))
  AND((i.indkey::smallint[])[0:cardinality(c.conkey)-1]) @> c.conkey
 ) LOOP
  SELECT string_agg(quote_ident(a.attname),',' ORDER BY f.ord) INTO columns_sql
  FROM unnest(r.conkey) WITH ORDINALITY f(attnum,ord) JOIN pg_attribute a ON a.attrelid=r.conrelid AND a.attnum=f.attnum;
  index_name:='scale_fk_'||substr(md5(r.nspname||'.'||r.relname||':'||r.conname),1,20);
  EXECUTE format('CREATE INDEX %I ON %I.%I(%s)',index_name,r.nspname,r.relname,columns_sql);
 END LOOP;
END $migration$;

-- These hot policies contain uncorrelated authentication calls. Hoist those
-- calls into initplans without broadening their original row predicates.
DO $migration$
DECLARE r record;q text;w text;
BEGIN
 FOR r IN SELECT * FROM pg_policies WHERE schemaname='public' AND(
  tablename IN('notifications','push_subscriptions') OR(tablename='daily_workouts' AND policyname='Users can view own workouts')
 ) LOOP
  q:=r.qual;w:=r.with_check;
  IF q IS NOT NULL AND position('auth.uid()' IN q)>0 AND position('SELECT auth.uid()' IN q)=0 THEN
   q:=replace(q,'auth.uid()','(SELECT auth.uid())');
   q:=replace(q,'is_admin((SELECT auth.uid()))','(SELECT public.is_admin((SELECT auth.uid())))');
   q:=replace(q,'is_trainer((SELECT auth.uid()))','(SELECT public.is_trainer((SELECT auth.uid())))');
   q:=replace(q,'has_role((SELECT auth.uid()), ''admin''::app_role)','(SELECT public.has_role((SELECT auth.uid()), ''admin''::public.app_role))');
   EXECUTE format('ALTER POLICY %I ON public.%I USING(%s)',r.policyname,r.tablename,q);
  END IF;
  IF w IS NOT NULL AND position('auth.uid()' IN w)>0 AND position('SELECT auth.uid()' IN w)=0 THEN
   w:=replace(w,'auth.uid()','(SELECT auth.uid())');
   w:=replace(w,'is_admin((SELECT auth.uid()))','(SELECT public.is_admin((SELECT auth.uid())))');
   w:=replace(w,'is_trainer((SELECT auth.uid()))','(SELECT public.is_trainer((SELECT auth.uid())))');
   w:=replace(w,'has_role((SELECT auth.uid()), ''admin''::app_role)','(SELECT public.has_role((SELECT auth.uid()), ''admin''::public.app_role))');
   EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK(%s)',r.policyname,r.tablename,w);
  END IF;
 END LOOP;
END $migration$;

-- Identical non-constraint index; the teacher/date index remains in place.
DROP INDEX IF EXISTS public.idx_appointments_teacher_sched;
