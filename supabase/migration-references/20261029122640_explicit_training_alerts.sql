ALTER TABLE public.daily_checkins ADD COLUMN alert_reported boolean NOT NULL DEFAULT false;
CREATE FUNCTION public.fn_report_training_alert(p_athlete_id uuid,p_reported boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR p_athlete_id IS NULL OR NOT coalesce(p_athlete_id=public.fn_current_athlete_id(),false) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_reported IS NULL THEN RAISE EXCEPTION 'explicit_answer_required';END IF;
 INSERT INTO public.daily_checkins(athlete_id,checkin_date,alert_reported) VALUES(p_athlete_id,(now() AT TIME ZONE 'America/Sao_Paulo')::date,p_reported)
 ON CONFLICT(athlete_id,checkin_date) DO UPDATE SET alert_reported=excluded.alert_reported,updated_at=now();
 RETURN jsonb_build_object('saved',true,'blocked',p_reported);
END $$;
REVOKE ALL ON FUNCTION public.fn_report_training_alert(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_report_training_alert(uuid,boolean) TO authenticated;
CREATE FUNCTION public.fn_get_training_guard(p_athlete_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE blocked boolean;
BEGIN
 PERFORM public.fn_assert_athlete_access(p_athlete_id);
 SELECT coalesce(bool_or(alert_reported),false) INTO blocked FROM public.daily_checkins WHERE athlete_id=p_athlete_id AND checkin_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
 RETURN jsonb_build_object('blocked',blocked,'source','student_report','date',(now() AT TIME ZONE 'America/Sao_Paulo')::date);
END $$;
REVOKE ALL ON FUNCTION public.fn_get_training_guard(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_get_training_guard(uuid) TO authenticated;
CREATE FUNCTION private.guard_training_alert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IN('started','in_progress') AND EXISTS(SELECT 1 FROM public.daily_checkins WHERE athlete_id=NEW.athlete_id AND checkin_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date AND alert_reported) THEN RAISE EXCEPTION 'training_alert_reported: procure atendimento antes de iniciar ou retomar' USING ERRCODE='55000';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_training_alert() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER training_alert_start_guard BEFORE INSERT ON public.workout_executions FOR EACH ROW EXECUTE FUNCTION private.guard_training_alert();
CREATE TRIGGER training_alert_resume_guard BEFORE UPDATE OF status ON public.workout_executions FOR EACH ROW WHEN(OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION private.guard_training_alert();

CREATE OR REPLACE FUNCTION private.compute_readiness(p_athlete_id uuid,p_workout_id uuid DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.daily_checkins; rules public.readiness_rule_sets; pref public.readiness_preferences; w public.daily_workouts;
 inputs jsonb; reasons jsonb; flags jsonb:='[]'; neg numeric:=0; pos numeric:=0; vol numeric:=0;
 rpe numeric:=0; rest_s int:=0; warm int:=0; gate int:=0; state text:='balanced'; last_day date; latest_rpe numeric;
 age_hours numeric; factor numeric:=1; samples int:=0; difference numeric; previous_scores int[]; decision jsonb;capacity jsonb;
BEGIN
 SELECT * INTO rules FROM public.readiness_rule_sets WHERE active LIMIT 1;
 SELECT * INTO pref FROM public.readiness_preferences WHERE athlete_id=p_athlete_id AND enabled ORDER BY updated_at DESC LIMIT 1;
 IF pref.user_id IS NULL THEN RETURN jsonb_build_object('status','consent_required'); END IF;
 SELECT * INTO c FROM public.daily_checkins WHERE athlete_id=p_athlete_id AND checkin_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
 IF c.id IS NULL OR c.sono NOT BETWEEN 1 AND 5 OR c.energia NOT BETWEEN 1 AND 5 OR c.humor NOT BETWEEN 1 AND 5 OR c.motivacao NOT BETWEEN 1 AND 5 OR c.dor NOT BETWEEN 1 AND 5 OR c.sono IS NULL OR c.energia IS NULL OR c.humor IS NULL OR c.motivacao IS NULL OR c.dor IS NULL THEN RETURN jsonb_build_object('status','checkin_required'); END IF;
 IF p_workout_id IS NOT NULL THEN SELECT * INTO w FROM public.daily_workouts WHERE id=p_workout_id AND athlete_id=p_athlete_id; END IF;
 inputs:=jsonb_build_object('sleep',c.sono,'energy',c.energia,'mood',c.humor,'motivation',c.motivacao,'pain',6-c.dor,'pain_location',c.dor_local,'increase_authorized',coalesce(w.changes_json->>'readiness_allow_increase','false'));
 inputs:=inputs||jsonb_build_object('alert_reported',c.alert_reported);
 WITH selected AS(SELECT r.* FROM public.readiness_rules r JOIN jsonb_each_text(inputs) i ON i.key=r.question AND i.value=r.answer_value::text WHERE r.rule_set_version=rules.version), ranked AS(SELECT *,row_number() OVER(ORDER BY abs(volume_pct) DESC,question) n FROM selected WHERE volume_pct<0)
 SELECT coalesce((SELECT sum(abs(volume_pct)*CASE n WHEN 1 THEN 1 WHEN 2 THEN .5 ELSE .25 END) FROM ranked),0),
 coalesce((SELECT sum(volume_pct) FROM selected WHERE volume_pct>0),0),coalesce((SELECT min(rpe_delta) FROM selected),0),coalesce((SELECT max(rest_delta_s) FROM selected),0),coalesce((SELECT max(warmup_add_min) FROM selected),0),coalesce((SELECT max(gate_level) FROM selected),0),
 coalesce((SELECT jsonb_agg(jsonb_build_object('signal',question,'answer',answer_value,'volume_pct',volume_pct,'reason',reason_key,'message',copy_variants->>((extract(doy FROM c.checkin_date)::int+answer_value)%3)) ORDER BY abs(volume_pct) DESC,question) FROM selected WHERE volume_pct<>0),'[]')
 INTO neg,pos,rpe,rest_s,warm,gate,reasons;
 vol:=CASE WHEN neg>0 THEN -neg ELSE pos END;
 age_hours:=extract(epoch FROM(now()-coalesce(c.updated_at,c.created_at)))/3600;
 IF age_hours>10 THEN flags:=flags||'["reconfirm_energy"]'; ELSIF age_hours>4 THEN flags:=flags||'["checkin_older_than_four_hours"]'; END IF;
 -- Old measurements may reduce confidence but can never weaken a conservative reduction.
 IF age_hours>4 AND vol>0 THEN vol:=0; END IF;
 SELECT workout_date,coalesce(avg_rpe,rpe) INTO last_day,latest_rpe FROM public.workout_executions WHERE athlete_id=p_athlete_id AND status='completed' AND completion_valid ORDER BY workout_date DESC,created_at DESC LIMIT 1;
 IF last_day IS NULL OR c.checkin_date-last_day>=7 THEN vol:=least(vol,coalesce((SELECT volume_pct FROM public.readiness_context_modifiers WHERE signal_key='inactive_seven_days' AND rule_set_version=rules.version),-10));flags:=flags||'["returning_to_training"]'; END IF;
 IF latest_rpe>=9 THEN vol:=vol+coalesce((SELECT volume_pct FROM public.readiness_context_modifiers WHERE signal_key='recent_high_rpe' AND rule_set_version=rules.version),-3);flags:=flags||'["recent_high_rpe"]'; END IF;
 IF (SELECT count(DISTINCT workout_date) FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date>=c.checkin_date-3 AND workout_date<c.checkin_date AND status='completed' AND completion_valid AND coalesce(avg_rpe,rpe)>=8)>=3 THEN vol:=vol+coalesce((SELECT volume_pct FROM public.readiness_context_modifiers WHERE signal_key='three_high_rpe_days' AND rule_set_version=rules.version),-5);flags:=flags||'["three_high_rpe_days"]'; END IF;
 SELECT array_agg(score ORDER BY dt DESC) INTO previous_scores FROM(SELECT d.checkin_date dt,private.fitpro_daily_readiness(p_athlete_id,d.checkin_date) score FROM public.daily_checkins d WHERE d.athlete_id=p_athlete_id AND d.checkin_date BETWEEN c.checkin_date-2 AND c.checkin_date ORDER BY d.checkin_date DESC LIMIT 3)t;
 IF cardinality(previous_scores)=3 AND previous_scores[1]<previous_scores[2] AND previous_scores[2]<previous_scores[3] THEN vol:=vol+coalesce((SELECT volume_pct FROM public.readiness_context_modifiers WHERE signal_key='three_days_declining' AND rule_set_version=rules.version),-3);flags:=flags||'["declining_readiness"]'; END IF;
 IF cardinality(previous_scores)=3 AND (SELECT max(s) FROM unnest(previous_scores)s)<55 THEN flags:=flags||'["coach_review_trend"]'; END IF;
 IF (SELECT count(*) FROM public.daily_checkins d WHERE d.athlete_id=p_athlete_id AND d.checkin_date BETWEEN c.checkin_date-4 AND c.checkin_date AND d.sono=c.sono AND d.energia=c.energia AND d.humor=c.humor AND d.motivacao=c.motivacao AND d.dor=c.dor)>=5 THEN flags:=flags||'["confirm_repeated_answers"]';vol:=least(vol,0); END IF;
 IF c.sono>=4 AND c.energia<=2 THEN flags:=flags||'["reconfirm_energy"]'; END IF;
 IF pref.pdi_confirmed_at IS NOT NULL AND pref.pdi_snapshot IS NOT NULL THEN
  IF vol<0 THEN factor:=CASE pref.pdi_snapshot->>'recovery_rate' WHEN 'slow' THEN 1.25 WHEN 'fast' THEN .85 ELSE 1 END;
   IF coalesce((pref.pdi_snapshot->>'volume_tolerance')::numeric,5)<=3 THEN factor:=factor*1.2;flags:=flags||'["low_volume_tolerance"]';END IF;
   vol:=vol*factor;
  END IF;
  IF c.dor>=3 AND pref.pdi_snapshot->'injury_zones'<>'[]'::jsonb THEN gate:=greatest(gate,1); END IF;
 ELSE flags:=flags||'["pdi_not_confirmed"]'; END IF;
 SELECT count(*),avg(coalesce(e.avg_rpe,e.rpe)-d.expected_rpe) INTO samples,difference FROM (SELECT DISTINCT ON(applied_workout_id) * FROM public.daily_readiness_decisions WHERE status='applied' AND athlete_id=p_athlete_id ORDER BY applied_workout_id,updated_at DESC) d JOIN public.workout_executions e ON e.daily_workout_id=d.applied_workout_id AND e.athlete_id=d.athlete_id WHERE d.athlete_id=p_athlete_id AND d.status='applied' AND e.status='completed' AND e.completion_valid AND coalesce(e.avg_rpe,e.rpe) BETWEEN 1 AND 10;
 IF samples>=10 AND vol<0 THEN factor:=greatest(.8,least(1.25,1+coalesce(difference,0)*.05));vol:=vol*factor;flags:=flags||'["individual_calibration"]'; END IF;
 IF vol>0 AND (c.sono<4 OR c.energia<4 OR c.dor>2 OR gate>0 OR pref.pdi_confirmed_at IS NULL OR coalesce((pref.pdi_snapshot->>'volume_tolerance')::numeric,5)<=3 OR coalesce(w.changes_json->>'readiness_allow_increase','false')<>'true' OR lower(coalesce(w.workout_type,'')||' '||coalesce(w.day_name,''))~'(deload|teste|test|descarga|recuper)') THEN vol:=0;flags:=flags||'["increase_not_authorized"]'; END IF;
 vol:=greatest(-30,least(10,vol));
 IF c.sono<=2 AND c.energia<=2 THEN flags:=flags||'["no_failure_sets"]';END IF;
 IF c.alert_reported THEN gate:=3;flags:=flags||'["training_alert_reported"]';vol:=least(vol,0);END IF;
 state:=CASE WHEN vol<=-10 OR c.motivacao=1 OR gate>0 THEN 'low' WHEN vol>=10 THEN 'power' ELSE 'balanced' END;
 IF state='low' THEN rpe:=least(rpe,-1); END IF;
 IF (SELECT count(DISTINCT checkin_date) FROM public.daily_checkins WHERE athlete_id=p_athlete_id AND checkin_date BETWEEN c.checkin_date-2 AND c.checkin_date AND dor>=4)>=3 THEN gate:=greatest(gate,2);state:='low';flags:=flags||'["persistent_pain_review"]'; END IF;
 BEGIN capacity:=public.fn_athlete_capacity_core(p_athlete_id);EXCEPTION WHEN OTHERS THEN capacity:=null;END;
 IF capacity#>>'{weakest_pillar,key}' IN('core','cardio','mobilidade') AND (capacity#>>'{weakest_pillar,value}')::numeric<50 THEN
  inputs:=inputs||jsonb_build_object('capacity_pillar',capacity#>>'{weakest_pillar,key}','capacity_value',(capacity#>>'{weakest_pillar,value}')::numeric,'capacity_source',capacity#>>'{weakest_pillar,source}');
  flags:=flags||'["capacity_focus_review"]';
 END IF;
 RETURN jsonb_build_object('status','ready','checkin_id',c.id,'date',c.checkin_date,'rule_set_version',rules.version,'apply_after',rules.apply_after,'mode',state,'volume_pct_total',vol,'rpe_cap_delta',rpe,'rest_delta_s',rest_s,'warmup_add_min',warm,'gate_level',gate,'flags',flags,'reasons',reasons,'inputs',inputs,'calibration_samples',samples);
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
  SELECT c.id,c.athlete_id,a.name,3,'["training_alert_reported"]'::jsonb,'low','skipped_review',coalesce(c.updated_at,c.created_at)
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
