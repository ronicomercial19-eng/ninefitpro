CREATE TABLE public.readiness_rule_sets (
 version text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(),
 apply_after timestamptz NOT NULL DEFAULT now()+interval '7 days', active boolean NOT NULL DEFAULT true
);
INSERT INTO public.readiness_rule_sets(version) VALUES('sync-v2-2026-10');
CREATE UNIQUE INDEX readiness_one_active_rule_set ON public.readiness_rule_sets(active) WHERE active;
CREATE TABLE public.readiness_rules (
 rule_set_version text NOT NULL REFERENCES public.readiness_rule_sets(version), question text NOT NULL,
 answer_value int NOT NULL CHECK(answer_value BETWEEN 1 AND 5), volume_pct numeric NOT NULL DEFAULT 0,
 rpe_delta numeric NOT NULL DEFAULT 0, rest_delta_s int NOT NULL DEFAULT 0, warmup_add_min int NOT NULL DEFAULT 0,
 gate_level int NOT NULL DEFAULT 0, reason_key text NOT NULL, copy_variants jsonb NOT NULL DEFAULT '[]',
 PRIMARY KEY(rule_set_version,question,answer_value)
);
INSERT INTO public.readiness_rules(rule_set_version,question,answer_value,volume_pct,rpe_delta,rest_delta_s,warmup_add_min,gate_level,reason_key)
SELECT 'sync-v2-2026-10',q,a,v,r,d,w,g,q||'_'||a FROM (VALUES
 ('sleep',1,-14,-1,15,4,0),('sleep',2,-8,-0.5,10,3,0),('sleep',3,0,0,0,0,0),('sleep',4,0,0,0,0,0),('sleep',5,3,0,0,0,0),
 ('energy',1,-12,-1,0,3,0),('energy',2,-7,-0.5,0,0,0),('energy',3,0,0,0,0,0),('energy',4,3,0,0,0,0),('energy',5,5,0,0,0,0),
 ('mood',1,-4,0,0,0,0),('mood',2,-2,0,0,0,0),('mood',3,0,0,0,0,0),('mood',4,0,0,0,0,0),('mood',5,1,0,0,0,0),
 ('motivation',1,-8,0,0,0,0),('motivation',2,-4,0,0,0,0),('motivation',3,0,0,0,0,0),('motivation',4,1,0,0,0,0),('motivation',5,2,0,0,0,0),
 ('pain',1,-20,0,0,0,2),('pain',2,-10,0,0,0,1),('pain',3,-3,0,0,0,0),('pain',4,0,0,0,0,0),('pain',5,0,0,0,0,0)
) t(q,a,v,r,d,w,g);
CREATE TABLE public.readiness_context_modifiers (
 signal_key text NOT NULL, volume_pct numeric NOT NULL DEFAULT 0, flags jsonb NOT NULL DEFAULT '[]',
 rule_set_version text NOT NULL DEFAULT 'sync-v2-2026-10' REFERENCES public.readiness_rule_sets(version),PRIMARY KEY(rule_set_version,signal_key)
);
INSERT INTO public.readiness_context_modifiers(signal_key,volume_pct,flags) VALUES
 ('recent_high_rpe',-3,'["recent_high_rpe"]'),('three_high_rpe_days',-5,'["three_high_rpe_days"]'),
 ('inactive_seven_days',-10,'["returning_to_training"]'),('three_days_declining',-3,'["declining_readiness"]');
CREATE TABLE public.injury_zone_contraindications (
 zone text PRIMARY KEY, muscle_pattern text NOT NULL, requires_professional_review boolean NOT NULL DEFAULT true
);
-- Conservative routing only: these mappings never substitute an exercise automatically.
INSERT INTO public.injury_zone_contraindications VALUES
 ('hip','quadril|gl.te|perna|isquio',true),('knee','quadr.ceps|perna|panturrilha',true),
 ('shoulder','ombro|deltoid|peitoral|dorsal',true),('back','costas|lombar|dorsal|erector',true),
 ('elbow','b.ceps|tr.ceps|antebra.o',true),('ankle','panturrilha|perna|salto',true);
CREATE TABLE public.readiness_preferences (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id), athlete_id uuid NOT NULL REFERENCES public.athletes(id),
 enabled boolean NOT NULL DEFAULT false, consented_at timestamptz, consent_version text,
 pdi_confirmed_at timestamptz, pdi_confirmed_by uuid REFERENCES auth.users(id), pdi_snapshot jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX readiness_preferences_athlete_idx ON public.readiness_preferences(athlete_id);
CREATE INDEX readiness_preferences_confirmer_idx ON public.readiness_preferences(pdi_confirmed_by);
CREATE TABLE public.daily_readiness_decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), decision_key text NOT NULL UNIQUE,
 athlete_id uuid NOT NULL REFERENCES public.athletes(id), decision_date date NOT NULL,
 checkin_id uuid REFERENCES public.daily_checkins(id), rule_set_version text NOT NULL REFERENCES public.readiness_rule_sets(version),
 mode text NOT NULL CHECK(mode IN('low','balanced','power')), volume_pct_total numeric NOT NULL,
 volume_pct_applied numeric NOT NULL DEFAULT 0, rpe_cap_delta numeric NOT NULL DEFAULT 0,
 rest_delta_s int NOT NULL DEFAULT 0, warmup_add_min int NOT NULL DEFAULT 0, gate_level int NOT NULL DEFAULT 0,
 flags jsonb NOT NULL DEFAULT '[]', reasons jsonb NOT NULL DEFAULT '[]', inputs jsonb NOT NULL,
 applied_workout_id uuid REFERENCES public.daily_workouts(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN('shadow','applied','skipped_locked','skipped_no_workout','skipped_review','skipped_changed','superseded')),
 base_sets int, applied_sets int, expected_rpe numeric NOT NULL DEFAULT 7,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX daily_readiness_athlete_date_idx ON public.daily_readiness_decisions(athlete_id,decision_date DESC,created_at DESC);
CREATE INDEX daily_readiness_checkin_idx ON public.daily_readiness_decisions(checkin_id);
CREATE INDEX daily_readiness_version_idx ON public.daily_readiness_decisions(rule_set_version);
CREATE INDEX daily_readiness_workout_idx ON public.daily_readiness_decisions(applied_workout_id);
ALTER TABLE public.readiness_rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_context_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injury_zone_contraindications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_readiness_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.readiness_rule_sets,public.readiness_rules,public.readiness_context_modifiers,public.injury_zone_contraindications,public.readiness_preferences,public.daily_readiness_decisions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.readiness_rule_sets,public.readiness_rules,public.readiness_context_modifiers,public.injury_zone_contraindications,public.readiness_preferences,public.daily_readiness_decisions TO authenticated;
CREATE POLICY readiness_rule_sets_read ON public.readiness_rule_sets FOR SELECT TO authenticated USING(true);
CREATE POLICY readiness_rules_read ON public.readiness_rules FOR SELECT TO authenticated USING(true);
CREATE POLICY readiness_context_read ON public.readiness_context_modifiers FOR SELECT TO authenticated USING(true);
CREATE POLICY readiness_zones_read ON public.injury_zone_contraindications FOR SELECT TO authenticated USING(true);
CREATE POLICY readiness_preferences_read ON public.readiness_preferences FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) OR private.fitpro_can_manage_athlete(athlete_id));
CREATE POLICY readiness_decisions_read ON public.daily_readiness_decisions FOR SELECT TO authenticated USING(athlete_id=(SELECT public.fn_current_athlete_id()) OR private.fitpro_can_manage_athlete(athlete_id));

CREATE FUNCTION public.fn_set_readiness_preferences(p_enabled boolean,p_confirm_pdi boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); a uuid:=public.fn_current_athlete_id(); snapshot jsonb; declared text[];
BEGIN
 IF u IS NULL OR a IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'account_required' USING ERRCODE='42501'; END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'invalid_preference'; END IF;
 IF p_confirm_pdi THEN
  SELECT declared_keys INTO declared FROM public.user_context_settings WHERE user_id=u;
  IF NOT coalesce(declared @> ARRAY['goal','recovery_rate','volume_tolerance','peak_window','stress_sensitivity','discomfort_tolerance','time_horizon','injury_zones','dietary_restrictions'],false) THEN RAISE EXCEPTION 'confirmed_pdi_required'; END IF;
  SELECT to_jsonb(p)-'user_id'-'created_at'-'updated_at' INTO snapshot FROM public.user_parameters p WHERE user_id=u;
  IF snapshot IS NULL THEN RAISE EXCEPTION 'confirmed_pdi_required'; END IF;
 END IF;
 INSERT INTO public.readiness_preferences(user_id,athlete_id,enabled,consented_at,consent_version,pdi_confirmed_at,pdi_confirmed_by,pdi_snapshot)
 VALUES(u,a,p_enabled,CASE WHEN p_enabled THEN now() END,CASE WHEN p_enabled THEN 'sync-v2-2026-10' END,CASE WHEN p_confirm_pdi THEN now() END,CASE WHEN p_confirm_pdi THEN u END,snapshot)
 ON CONFLICT(user_id) DO UPDATE SET athlete_id=a,enabled=excluded.enabled,consented_at=CASE WHEN p_enabled THEN now() ELSE readiness_preferences.consented_at END,
 consent_version=coalesce(excluded.consent_version,readiness_preferences.consent_version),
 pdi_confirmed_at=coalesce(excluded.pdi_confirmed_at,readiness_preferences.pdi_confirmed_at),pdi_confirmed_by=coalesce(excluded.pdi_confirmed_by,readiness_preferences.pdi_confirmed_by),pdi_snapshot=coalesce(excluded.pdi_snapshot,readiness_preferences.pdi_snapshot),updated_at=now();
 RETURN jsonb_build_object('saved',true,'enabled',p_enabled,'pdi_confirmed',p_confirm_pdi);
END $$;
REVOKE ALL ON FUNCTION public.fn_set_readiness_preferences(boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_set_readiness_preferences(boolean,boolean) TO authenticated;

ALTER TABLE public.daily_checkins ADD COLUMN IF NOT EXISTS updated_at timestamptz;
CREATE FUNCTION private.compute_readiness(p_athlete_id uuid,p_workout_id uuid DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.daily_checkins; rules public.readiness_rule_sets; pref public.readiness_preferences; w public.daily_workouts;
 inputs jsonb; reasons jsonb; flags jsonb:='[]'; neg numeric:=0; pos numeric:=0; vol numeric:=0;
 rpe numeric:=0; rest_s int:=0; warm int:=0; gate int:=0; state text:='balanced'; last_day date; latest_rpe numeric;
 age_hours numeric; factor numeric:=1; samples int:=0; difference numeric; previous_scores int[]; decision jsonb;
BEGIN
 SELECT * INTO rules FROM public.readiness_rule_sets WHERE active LIMIT 1;
 SELECT * INTO pref FROM public.readiness_preferences WHERE athlete_id=p_athlete_id AND enabled ORDER BY updated_at DESC LIMIT 1;
 IF pref.user_id IS NULL THEN RETURN jsonb_build_object('status','consent_required'); END IF;
 SELECT * INTO c FROM public.daily_checkins WHERE athlete_id=p_athlete_id AND checkin_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
 IF c.id IS NULL OR c.sono NOT BETWEEN 1 AND 5 OR c.energia NOT BETWEEN 1 AND 5 OR c.humor NOT BETWEEN 1 AND 5 OR c.motivacao NOT BETWEEN 1 AND 5 OR c.dor NOT BETWEEN 1 AND 5 OR c.sono IS NULL OR c.energia IS NULL OR c.humor IS NULL OR c.motivacao IS NULL OR c.dor IS NULL THEN RETURN jsonb_build_object('status','checkin_required'); END IF;
 IF p_workout_id IS NOT NULL THEN SELECT * INTO w FROM public.daily_workouts WHERE id=p_workout_id AND athlete_id=p_athlete_id; END IF;
 inputs:=jsonb_build_object('sleep',c.sono,'energy',c.energia,'mood',c.humor,'motivation',c.motivacao,'pain',6-c.dor,'pain_location',c.dor_local,'increase_authorized',coalesce(w.changes_json->>'readiness_allow_increase','false'));
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
 state:=CASE WHEN vol<=-10 OR c.motivacao=1 OR gate>0 THEN 'low' WHEN vol>=10 THEN 'power' ELSE 'balanced' END;
 IF state='low' THEN rpe:=least(rpe,-1); END IF;
 RETURN jsonb_build_object('status','ready','checkin_id',c.id,'date',c.checkin_date,'rule_set_version',rules.version,'apply_after',rules.apply_after,'mode',state,'volume_pct_total',vol,'rpe_cap_delta',rpe,'rest_delta_s',rest_s,'warmup_add_min',warm,'gate_level',gate,'flags',flags,'reasons',reasons,'inputs',inputs,'calibration_samples',samples);
END $$;
REVOKE ALL ON FUNCTION private.compute_readiness(uuid,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.apply_readiness(p_athlete_id uuid,p_workout_id uuid,p_observe_only boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb; w public.daily_workouts; before_rows jsonb:='[]'; base_rows jsonb:='[]'; after_rows jsonb:='[]';
 key text; rec public.daily_readiness_decisions; phase text; original int:=0; desired int:=0; remaining int:=0;
 applied int:=0; item jsonb; qty int; take int; delta numeric; locked boolean:=false;
BEGIN
 d:=private.compute_readiness(p_athlete_id,p_workout_id);
 IF d->>'status'<>'ready' THEN RETURN d; END IF;
 IF p_workout_id IS NOT NULL THEN
  SELECT * INTO w FROM public.daily_workouts WHERE id=p_workout_id AND athlete_id=p_athlete_id;
  IF w.id IS NULL OR w.workout_date<>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RETURN jsonb_build_object('status','workout_unavailable'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(w.athlete_id::text||w.workout_date::text||CASE WHEN w.workout_type='quick' THEN 'quick' ELSE 'daily' END,0));
  SELECT * INTO w FROM public.daily_workouts WHERE id=p_workout_id AND athlete_id=p_athlete_id FOR UPDATE;
  d:=private.compute_readiness(p_athlete_id,p_workout_id);
  IF d->>'status'<>'ready' THEN RETURN d;END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]'),coalesce(bool_or(override_locked),false) INTO before_rows,locked FROM public.workout_exercises e WHERE daily_workout_id=w.id;
 END IF;
 base_rows:=coalesce(w.changes_json#>'{readiness,base_exercises}',before_rows);
 SELECT coalesce(sum(greatest(1,coalesce((x->>'sets')::int,1))),0)::int INTO original FROM jsonb_array_elements(base_rows)x;
 delta:=(d->>'volume_pct_total')::numeric;
 desired:=CASE WHEN delta<0 THEN least(floor(original*.3)::int,floor(original*abs(delta)/100)::int) WHEN delta>=10 THEN least(1,floor(original*.1)::int) ELSE 0 END;
 phase:=CASE WHEN p_workout_id IS NULL OR original=0 THEN 'skipped_no_workout'
  WHEN w.override_locked OR locked OR w.changes_json->>'readiness_suppressed_date'=(d->>'date') OR w.prescription_issue IS NOT NULL OR EXISTS(SELECT 1 FROM public.workout_executions WHERE daily_workout_id=w.id AND status IN('started','in_progress','paused','completed')) THEN 'skipped_locked'
  WHEN (d->>'gate_level')::int>0 THEN 'skipped_review'
  WHEN w.changes_json#>'{readiness,after_exercises}' IS NOT NULL AND before_rows IS DISTINCT FROM w.changes_json#>'{readiness,after_exercises}' THEN 'skipped_changed'
  WHEN p_observe_only OR now()<(d->>'apply_after')::timestamptz THEN 'shadow'
  ELSE 'applied' END;
 key:=md5(p_athlete_id::text||coalesce(p_workout_id::text,'none')||(d-'apply_after')::text||base_rows::text||CASE WHEN phase='skipped_changed' THEN before_rows::text ELSE '' END);
 SELECT * INTO rec FROM public.daily_readiness_decisions WHERE decision_key=key;
 IF rec.id IS NOT NULL AND (rec.status=phase OR (rec.status='applied' AND phase IN('skipped_locked','shadow'))) THEN RETURN to_jsonb(rec); END IF;
 IF phase='applied' THEN
  remaining:=desired;
  -- Restore only the recorded base doses. Never delete or replace exercise identities.
  FOR item IN SELECT value FROM jsonb_array_elements(base_rows) LOOP
   UPDATE public.workout_exercises SET sets=(item->>'sets')::int,rest_seconds=(item->>'rest_seconds')::int,rpe_target=(item->>'rpe_target')::int WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
  END LOOP;
  IF delta<0 THEN
   FOR item IN SELECT value FROM jsonb_array_elements(base_rows) ORDER BY (value->>'exercise_order')::int DESC,value->>'id' LOOP
    qty:=greatest(1,coalesce((item->>'sets')::int,1));take:=least(remaining,qty-1);
    UPDATE public.workout_exercises SET sets=qty-take WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
    remaining:=remaining-take;EXIT WHEN remaining=0;
   END LOOP;
  ELSIF delta>=10 AND desired=1 THEN
   SELECT value INTO item FROM jsonb_array_elements(base_rows) ORDER BY (value->>'exercise_order')::int,value->>'id' LIMIT 1;
   UPDATE public.workout_exercises SET sets=sets+1 WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;remaining:=0;
  END IF;
  UPDATE public.workout_exercises SET rest_seconds=coalesce(rest_seconds,60)+(d->>'rest_delta_s')::int,
   rpe_target=CASE WHEN rpe_target IS NOT NULL THEN greatest(1,floor(rpe_target+(d->>'rpe_cap_delta')::numeric)::int) ELSE rpe_target END WHERE daily_workout_id=w.id;
  SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]'),coalesce(sum(sets),0)::int INTO after_rows,applied FROM public.workout_exercises e WHERE daily_workout_id=w.id;
  INSERT INTO public.workout_adjustment_versions(daily_workout_id,athlete_id,changed_by,before_exercises,after_exercises) VALUES(w.id,p_athlete_id,auth.uid(),before_rows,after_rows);
  UPDATE public.daily_workouts SET changes_json=coalesce(changes_json,'{}')||jsonb_build_object('readiness',jsonb_build_object('base_exercises',base_rows,'after_exercises',after_rows,'decision_key',key,'warmup_add_min',(d->>'warmup_add_min')::int)),updated_at=now() WHERE id=w.id;
 ELSE applied:=original; END IF;
 UPDATE public.daily_readiness_decisions SET status='superseded',updated_at=now() WHERE athlete_id=p_athlete_id AND decision_date=(d->>'date')::date AND applied_workout_id IS NOT DISTINCT FROM p_workout_id AND decision_key<>key AND (status NOT IN('superseded','applied') OR (phase='skipped_changed' AND status='applied'));
 INSERT INTO public.daily_readiness_decisions(decision_key,athlete_id,decision_date,checkin_id,rule_set_version,mode,volume_pct_total,volume_pct_applied,rpe_cap_delta,rest_delta_s,warmup_add_min,gate_level,flags,reasons,inputs,applied_workout_id,status,base_sets,applied_sets)
 VALUES(key,p_athlete_id,(d->>'date')::date,(d->>'checkin_id')::uuid,d->>'rule_set_version',d->>'mode',delta,CASE WHEN original>0 AND phase='applied' THEN round((applied-original)*100.0/original,1) ELSE 0 END,(d->>'rpe_cap_delta')::numeric,(d->>'rest_delta_s')::int,(d->>'warmup_add_min')::int,(d->>'gate_level')::int,d->'flags',d->'reasons',d->'inputs',p_workout_id,phase,original,applied)
 ON CONFLICT(decision_key) DO UPDATE SET status=excluded.status,volume_pct_applied=excluded.volume_pct_applied,base_sets=excluded.base_sets,applied_sets=excluded.applied_sets,updated_at=now() RETURNING * INTO rec;
 RETURN to_jsonb(rec);
END $$;
REVOKE ALL ON FUNCTION private.apply_readiness(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.fn_refresh_daily_readiness(p_athlete_id uuid DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid:=coalesce(p_athlete_id,public.fn_current_athlete_id()); w record; result jsonb; found_day boolean:=false;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR a IS NULL OR NOT(coalesce(a=public.fn_current_athlete_id(),false) OR private.fitpro_can_manage_athlete(a)) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501'; END IF;
 PERFORM private.fitpro_require_current_access();
 FOR w IN SELECT id FROM public.daily_workouts WHERE athlete_id=a AND workout_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date ORDER BY created_at DESC LIMIT 5 LOOP
  result:=private.apply_readiness(a,w.id);found_day:=true;
 END LOOP;
 IF NOT found_day THEN result:=private.apply_readiness(a,null); END IF;
 RETURN coalesce(result,jsonb_build_object('status','checkin_required'));
END $$;
REVOKE ALL ON FUNCTION public.fn_refresh_daily_readiness(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_refresh_daily_readiness(uuid) TO authenticated;
CREATE FUNCTION public.fn_get_daily_readiness(p_athlete_id uuid DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE a uuid:=coalesce(p_athlete_id,public.fn_current_athlete_id()); result jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR a IS NULL OR NOT(coalesce(a=public.fn_current_athlete_id(),false) OR private.fitpro_can_manage_athlete(a)) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('preferences',(SELECT jsonb_build_object('enabled',p.enabled,'pdi_confirmed_at',p.pdi_confirmed_at,'pdi_confirmed_by',p.pdi_confirmed_by) FROM public.readiness_preferences p WHERE athlete_id=a ORDER BY updated_at DESC LIMIT 1),
 'decision',(SELECT to_jsonb(d) FROM public.daily_readiness_decisions d WHERE d.athlete_id=a AND d.decision_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date AND d.status<>'superseded' ORDER BY (d.applied_workout_id IS NOT NULL) DESC,d.updated_at DESC LIMIT 1),
 'rollout',(SELECT jsonb_build_object('version',version,'apply_after',apply_after,'observing',now()<apply_after) FROM public.readiness_rule_sets WHERE active LIMIT 1)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.fn_get_daily_readiness(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_get_daily_readiness(uuid) TO authenticated;
CREATE FUNCTION public.fn_apply_readiness_to_workout(p_daily_workout_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid;
BEGIN
 SELECT athlete_id INTO a FROM public.daily_workouts WHERE id=p_daily_workout_id;
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR a IS NULL OR a IS NULL OR NOT(coalesce(a=public.fn_current_athlete_id(),false) OR private.fitpro_can_manage_athlete(a)) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501'; END IF;
 PERFORM private.fitpro_require_current_access();
 RETURN private.apply_readiness(a,p_daily_workout_id);
END $$;
REVOKE ALL ON FUNCTION public.fn_apply_readiness_to_workout(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_apply_readiness_to_workout(uuid) TO authenticated;

CREATE FUNCTION public.fn_confirm_readiness_pdi(p_athlete_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid; snapshot jsonb; declared text[];
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR p_athlete_id IS NULL OR NOT(coalesce(p_athlete_id=public.fn_current_athlete_id(),false) OR private.fitpro_can_manage_athlete(p_athlete_id)) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501'; END IF;
 SELECT coalesce(a.user_id,(SELECT l.user_id FROM public.athlete_auth_link l JOIN auth.users au ON au.id=l.user_id WHERE l.athlete_id=a.id LIMIT 1)) INTO u FROM public.athletes a WHERE a.id=p_athlete_id;
 SELECT declared_keys INTO declared FROM public.user_context_settings WHERE user_id=u;
 IF NOT coalesce(declared @> ARRAY['goal','recovery_rate','volume_tolerance','peak_window','stress_sensitivity','discomfort_tolerance','time_horizon','injury_zones','dietary_restrictions'],false) THEN RAISE EXCEPTION 'confirmed_pdi_required'; END IF;
 SELECT to_jsonb(p)-'user_id'-'created_at'-'updated_at' INTO snapshot FROM public.user_parameters p WHERE user_id=u;
 IF snapshot IS NULL THEN RAISE EXCEPTION 'confirmed_pdi_required'; END IF;
 INSERT INTO public.readiness_preferences(user_id,athlete_id,pdi_confirmed_at,pdi_confirmed_by,pdi_snapshot) VALUES(u,p_athlete_id,now(),auth.uid(),snapshot)
 ON CONFLICT(user_id) DO UPDATE SET athlete_id=excluded.athlete_id,pdi_confirmed_at=now(),pdi_confirmed_by=auth.uid(),pdi_snapshot=excluded.pdi_snapshot,updated_at=now();
 RETURN jsonb_build_object('saved',true);
END $$;
REVOKE ALL ON FUNCTION public.fn_confirm_readiness_pdi(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_confirm_readiness_pdi(uuid) TO authenticated;

ALTER TABLE public.daily_checkins ADD COLUMN IF NOT EXISTS updated_at timestamptz;
CREATE FUNCTION private.capture_readiness_checkin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 NEW.updated_at:=now();RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.capture_readiness_checkin() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER readiness_checkin_timestamp BEFORE INSERT OR UPDATE ON public.daily_checkins FOR EACH ROW EXECUTE FUNCTION private.capture_readiness_checkin();
CREATE FUNCTION private.sync_readiness_checkin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.checkin_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
  IF EXISTS(SELECT 1 FROM public.readiness_preferences WHERE athlete_id=NEW.athlete_id AND enabled) THEN PERFORM public.fn_refresh_daily_readiness(NEW.athlete_id); END IF;
 END IF;RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'readiness_sync_deferred state=%',SQLSTATE;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.sync_readiness_checkin() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER readiness_checkin_sync AFTER INSERT OR UPDATE ON public.daily_checkins FOR EACH ROW EXECUTE FUNCTION private.sync_readiness_checkin();
NOTIFY pgrst,'reload schema';
CREATE FUNCTION private.sync_new_workout_readiness() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w record;
BEGIN
 FOR w IN SELECT DISTINCT d.id,d.athlete_id FROM inserted_readiness_exercises n JOIN public.daily_workouts d ON d.id=n.daily_workout_id WHERE d.workout_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date LOOP
  IF EXISTS(SELECT 1 FROM public.readiness_preferences WHERE athlete_id=w.athlete_id AND enabled) THEN PERFORM private.apply_readiness(w.athlete_id,w.id,true);END IF;
 END LOOP;RETURN NULL;
EXCEPTION WHEN OTHERS THEN RAISE LOG 'readiness_new_workout_deferred state=%',SQLSTATE;RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.sync_new_workout_readiness() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER readiness_new_workout AFTER INSERT ON public.workout_exercises REFERENCING NEW TABLE AS inserted_readiness_exercises FOR EACH STATEMENT EXECUTE FUNCTION private.sync_new_workout_readiness();
CREATE FUNCTION public.fn_revert_readiness_workout(p_daily_workout_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w public.daily_workouts; item jsonb; before_rows jsonb; after_rows jsonb;
BEGIN
 SELECT * INTO w FROM public.daily_workouts WHERE id=p_daily_workout_id;
 IF auth.uid() IS NULL OR w.id IS NULL OR NOT(coalesce(w.athlete_id=public.fn_current_athlete_id(),false) OR private.fitpro_can_manage_athlete(w.athlete_id)) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(w.athlete_id::text||w.workout_date::text||CASE WHEN w.workout_type='quick' THEN 'quick' ELSE 'daily' END,0));
 SELECT * INTO w FROM public.daily_workouts WHERE id=p_daily_workout_id FOR UPDATE;
 IF w.override_locked OR EXISTS(SELECT 1 FROM public.workout_executions WHERE daily_workout_id=w.id AND status IN('started','in_progress','paused','completed')) THEN RAISE EXCEPTION 'workout_locked';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]') INTO before_rows FROM public.workout_exercises e WHERE daily_workout_id=w.id;
 IF w.changes_json#>'{readiness,after_exercises}' IS NULL THEN RETURN jsonb_build_object('saved',true);END IF;
 IF before_rows IS DISTINCT FROM w.changes_json#>'{readiness,after_exercises}' THEN RAISE EXCEPTION 'prescription_changed_by_professional';END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(w.changes_json#>'{readiness,base_exercises}') LOOP
  UPDATE public.workout_exercises SET sets=(item->>'sets')::int,rest_seconds=(item->>'rest_seconds')::int,rpe_target=(item->>'rpe_target')::int WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]') INTO after_rows FROM public.workout_exercises e WHERE daily_workout_id=w.id;
 INSERT INTO public.workout_adjustment_versions(daily_workout_id,athlete_id,changed_by,before_exercises,after_exercises) VALUES(w.id,w.athlete_id,auth.uid(),before_rows,after_rows);
 UPDATE public.daily_workouts SET changes_json=(changes_json-'readiness')||jsonb_build_object('readiness_suppressed_date',w.workout_date),updated_at=now() WHERE id=w.id;
 UPDATE public.daily_readiness_decisions SET status='superseded',updated_at=now() WHERE applied_workout_id=w.id AND status<>'superseded';
 RETURN jsonb_build_object('saved',true);
END $$;
REVOKE ALL ON FUNCTION public.fn_revert_readiness_workout(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_revert_readiness_workout(uuid) TO authenticated;
CREATE FUNCTION public.fn_allow_readiness_increase(p_daily_workout_id uuid,p_allowed boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w public.daily_workouts;
BEGIN
 SELECT * INTO w FROM public.daily_workouts WHERE id=p_daily_workout_id FOR UPDATE;
 IF auth.uid() IS NULL OR w.id IS NULL OR NOT private.fitpro_can_manage_athlete(w.athlete_id) OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'coach_required' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM public.workout_executions WHERE daily_workout_id=w.id AND status IN('started','in_progress','paused','completed')) THEN RAISE EXCEPTION 'workout_locked';END IF;
 UPDATE public.daily_workouts SET changes_json=coalesce(changes_json,'{}')||jsonb_build_object('readiness_allow_increase',coalesce(p_allowed,false)),updated_at=now() WHERE id=w.id;
 RETURN jsonb_build_object('saved',true);
END $$;
REVOKE ALL ON FUNCTION public.fn_allow_readiness_increase(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_allow_readiness_increase(uuid,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
CREATE FUNCTION private.invalidate_readiness_pdi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF ROW(NEW.goal,NEW.recovery_rate,NEW.volume_tolerance,NEW.peak_window,NEW.stress_sensitivity,NEW.discomfort_tolerance,NEW.time_horizon,NEW.injury_zones,NEW.dietary_restrictions)
 IS DISTINCT FROM ROW(OLD.goal,OLD.recovery_rate,OLD.volume_tolerance,OLD.peak_window,OLD.stress_sensitivity,OLD.discomfort_tolerance,OLD.time_horizon,OLD.injury_zones,OLD.dietary_restrictions) THEN
 UPDATE public.readiness_preferences SET pdi_confirmed_at=null,pdi_confirmed_by=null,pdi_snapshot=null,updated_at=now() WHERE user_id=NEW.user_id;
 END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.invalidate_readiness_pdi() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER readiness_pdi_changed AFTER UPDATE ON public.user_parameters FOR EACH ROW EXECUTE FUNCTION private.invalidate_readiness_pdi();
UPDATE public.readiness_rules SET copy_variants=CASE question
 WHEN 'sleep' THEN '["Seu sono foi considerado no planejamento de hoje.","A recuperação relatada orientou esta decisão.","O descanso informado entrou na leitura do treino."]'::jsonb
 WHEN 'energy' THEN '["Sua energia atual foi considerada.","O treino levou em conta a energia que você relatou.","Seu relato de disposição entrou nesta decisão."]'::jsonb
 WHEN 'mood' THEN '["Seu humor foi considerado no acompanhamento.","Seu relato de hoje ajuda a ajustar a experiência.","A proposta considera como você se sente hoje."]'::jsonb
 WHEN 'pain' THEN '["O desconforto informado pede atenção na sessão.","Sua percepção de dor foi considerada.","Restrições e desconforto orientam a revisão com o professor."]'::jsonb
 ELSE '["Sua motivação foi considerada para manter a adesão.","A proposta leva em conta sua vontade de treinar hoje.","O acompanhamento considera sua motivação atual."]'::jsonb END;
NOTIFY pgrst,'reload schema';
