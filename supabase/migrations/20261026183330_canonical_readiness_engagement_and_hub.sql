-- Keep the former score as engagement; SYNC now always means today's self report.
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS engagement_score integer;
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS engagement_score_updated_at timestamptz;
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS sync_score_date date;
UPDATE public.athletes SET engagement_score=sync_score,engagement_score_updated_at=sync_score_updated_at;

CREATE OR REPLACE FUNCTION private.fitpro_daily_readiness(p_athlete_id uuid,p_date date)
RETURNS integer LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT CASE WHEN sono BETWEEN 1 AND 5 AND energia BETWEEN 1 AND 5 AND dor BETWEEN 1 AND 5
 AND humor BETWEEN 1 AND 5 AND motivacao BETWEEN 1 AND 5 THEN
 round(((sono-1)*30+(energia-1)*30+((6-dor)-1)*20+(humor-1)*10+(motivacao-1)*10)/4.0)::integer END
 FROM public.daily_checkins WHERE athlete_id=p_athlete_id AND checkin_date=p_date
$$;
REVOKE ALL ON FUNCTION private.fitpro_daily_readiness(uuid,date) FROM PUBLIC,anon,authenticated;

DO $$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef(oid) INTO v_def FROM pg_proc WHERE oid='public.calcular_sync_score_real(uuid)'::regprocedure;
 v_def:=replace(v_def,'public.calcular_sync_score_real','private.fitpro_refresh_engagement');
 v_def:=replace(v_def,'SET sync_score = v_score, sync_score_updated_at = now()','SET engagement_score = v_score, engagement_score_updated_at = now()');
 EXECUTE v_def;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_refresh_engagement(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.calcular_sync_score_real(p_athlete_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_date date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;v_value integer;
BEGIN
 PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
 PERFORM private.fitpro_refresh_engagement(p_athlete_id);
 v_value:=private.fitpro_daily_readiness(p_athlete_id,v_date);
 UPDATE public.athletes SET sync_score=v_value,sync_score_date=v_date,sync_score_updated_at=now() WHERE id=p_athlete_id;
 RETURN v_value;
END $$;
REVOKE ALL ON FUNCTION public.calcular_sync_score_real(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.calcular_sync_score_real(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION private.fitpro_refresh_daily_readiness()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid:=CASE WHEN TG_OP='DELETE' THEN OLD.athlete_id ELSE NEW.athlete_id END;
 v_date date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
 PERFORM private.fitpro_refresh_engagement(v_id);
 UPDATE public.athletes SET sync_score=private.fitpro_daily_readiness(v_id,v_date),sync_score_date=v_date,sync_score_updated_at=now() WHERE id=v_id;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_refresh_daily_readiness() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER fitpro_daily_readiness AFTER INSERT OR UPDATE OR DELETE ON public.daily_checkins
FOR EACH ROW EXECUTE FUNCTION private.fitpro_refresh_daily_readiness();
UPDATE public.athletes SET sync_score=private.fitpro_daily_readiness(id,(now() AT TIME ZONE 'America/Sao_Paulo')::date),
 sync_score_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date,sync_score_updated_at=now();

DO $patch$
DECLARE v_def text;r record;
BEGIN
 SELECT pg_get_functiondef('public.fn_get_daily_context()'::regprocedure) INTO v_def;
 -- An in-progress session cannot have completion_valid yet.
 v_def:=replace(v_def,'from public.workout_executions where completion_valid and athlete_id=v_id AND workout_date=v_today AND status IN',
 'from public.workout_executions where athlete_id=v_id AND workout_date=v_today AND status IN');
 v_def:=replace(v_def,'w.status=''completed''','w.status=''completed'' AND w.completion_valid');
 EXECUTE v_def;

 SELECT pg_get_functiondef('public.fn_get_hub_snapshot()'::regprocedure) INTO v_def;
 v_def:=replace(v_def,'''dimensions'', v_dimensions,',
 $extra$'streak',coalesce((v_day->>'streak')::integer,0),
 'engagement',jsonb_build_object('value',(SELECT engagement_score FROM public.athletes WHERE id=v_id),'source','legacy_engagement_formula'),
 'weight',jsonb_build_object('value',(SELECT peso_kg FROM public.athletes WHERE id=v_id),'unit','kg',
 'status',CASE WHEN (SELECT peso_kg FROM public.athletes WHERE id=v_id) IS NULL THEN 'not_collected' ELSE 'available' END,
 'source','athletes/peso_kg','observed_at',(SELECT max(created_at) FROM public.athlete_weight_history WHERE athlete_id=v_id)),
 'dimensions', v_dimensions,$extra$);
 EXECUTE v_def;

 SELECT pg_get_functiondef('public.fn_get_ron_progresso_screen(uuid)'::regprocedure) INTO v_def;
 EXECUTE replace(v_def,'we.status = ''completed''','we.status = ''completed'' AND we.completion_valid');

 -- Preserve all view columns, append engagement, keep the existing RLS mode.
 SELECT pg_get_viewdef('public.vw_fitpro_coach_student_performance'::regclass,true) INTO v_def;
 v_def:=replace(v_def,'a.sync_score,','CASE WHEN a.sync_score_date=(now() AT TIME ZONE ''America/Sao_Paulo'')::date THEN a.sync_score END AS sync_score,');
 v_def:=replace(v_def,'p.avg_rpe','p.avg_rpe, a.engagement_score');
 EXECUTE 'CREATE OR REPLACE VIEW public.vw_fitpro_coach_student_performance WITH (security_invoker=true) AS '||v_def;

 -- Existing reporting views aggregate only valid completions, retaining the same
 -- names and RLS options. The subquery keeps aliases and projected columns intact.
 FOR r IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='v' AND c.relname IN
 ('vw_hub_status','vw_fitpro_performance_overview') LOOP
  v_def:=pg_get_viewdef(r.oid,true);
  v_def:=regexp_replace(v_def,'FROM (public\.)?workout_executions ',
   'FROM (SELECT * FROM public.workout_executions WHERE completion_valid AND status=''completed'') ','gi');
  EXECUTE format('CREATE OR REPLACE VIEW public.%I WITH (security_invoker=true) AS %s',r.relname,v_def);
 END LOOP;
END $patch$;
NOTIFY pgrst,'reload schema';
