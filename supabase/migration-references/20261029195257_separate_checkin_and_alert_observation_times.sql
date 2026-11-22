-- A safety report is not a fresh answer to the five calibration questions.
ALTER TABLE public.daily_checkins ADD COLUMN alert_reported_at timestamptz;
DROP TRIGGER readiness_checkin_timestamp ON public.daily_checkins;
CREATE TRIGGER readiness_checkin_timestamp_insert BEFORE INSERT ON public.daily_checkins FOR EACH ROW EXECUTE FUNCTION private.capture_readiness_checkin();
CREATE TRIGGER readiness_checkin_timestamp_answers BEFORE UPDATE OF sono,energia,humor,motivacao,dor ON public.daily_checkins FOR EACH ROW EXECUTE FUNCTION private.capture_readiness_checkin();
CREATE OR REPLACE FUNCTION public.fn_report_training_alert(p_athlete_id uuid,p_reported boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR p_athlete_id IS NULL OR NOT coalesce(p_athlete_id=public.fn_current_athlete_id(),false) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_reported IS NULL THEN RAISE EXCEPTION 'explicit_answer_required';END IF;
 INSERT INTO public.daily_checkins(athlete_id,checkin_date,alert_reported,alert_reported_at) VALUES(p_athlete_id,(now() AT TIME ZONE 'America/Sao_Paulo')::date,p_reported,now())
 ON CONFLICT(athlete_id,checkin_date) DO UPDATE SET alert_reported=excluded.alert_reported,alert_reported_at=now();
 RETURN jsonb_build_object('saved',true,'blocked',p_reported);
END $$;

CREATE OR REPLACE FUNCTION public.fn_coach_readiness_alerts(p_limit integer DEFAULT 25,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid();role_name text:=private.fitpro_actor_role();result jsonb;
BEGIN
 IF u IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR role_name IS NULL OR role_name NOT IN('professor','trainer','admin','super_admin') THEN RAISE EXCEPTION 'coach_required' USING ERRCODE='42501';END IF;
 WITH latest AS MATERIALIZED (
  SELECT DISTINCT ON(d.athlete_id) d.id,d.athlete_id,a.name,d.gate_level,d.flags,d.mode,d.status,d.updated_at
  FROM public.daily_readiness_decisions d JOIN public.athletes a ON a.id=d.athlete_id
  WHERE d.decision_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date AND d.status<>'superseded' AND(role_name IN('admin','super_admin') OR a.coach_id=u)
  ORDER BY d.athlete_id,d.updated_at DESC,d.id
 ), combined AS (
  SELECT * FROM latest
  UNION ALL
  SELECT c.id,c.athlete_id,a.name,3,'["training_alert_reported"]'::jsonb,'low','skipped_review',coalesce(c.alert_reported_at,c.updated_at,c.created_at)
  FROM public.daily_checkins c JOIN public.athletes a ON a.id=c.athlete_id WHERE c.checkin_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date AND c.alert_reported AND(role_name IN('admin','super_admin') OR a.coach_id=u)
 ), prioritized AS (
  SELECT DISTINCT ON(athlete_id) * FROM combined ORDER BY athlete_id,gate_level DESC,updated_at DESC,id
 ), alerts AS MATERIALIZED (
  SELECT * FROM prioritized WHERE gate_level>0 OR flags?'persistent_pain_review' OR flags?'coach_review_trend' OR status='skipped_changed'
 ), page AS (
  SELECT * FROM alerts ORDER BY gate_level DESC,updated_at DESC,athlete_id LIMIT greatest(1,least(coalesce(p_limit,25),100)) OFFSET greatest(0,coalesce(p_offset,0))
 ) SELECT jsonb_build_object('total',(SELECT count(*) FROM alerts),'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY gate_level DESC,updated_at DESC,athlete_id) FROM page p),'[]')) INTO result;
 RETURN result;
END $$;


NOTIFY pgrst,'reload schema';
