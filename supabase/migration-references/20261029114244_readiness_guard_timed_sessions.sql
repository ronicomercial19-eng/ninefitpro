-- Timed/pace prescriptions require explicit doses; never convert them into sets.
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
 IF (SELECT count(DISTINCT checkin_date) FROM public.daily_checkins WHERE athlete_id=p_athlete_id AND checkin_date BETWEEN c.checkin_date-2 AND c.checkin_date AND dor>=4)>=3 THEN gate:=greatest(gate,2);state:='low';flags:=flags||'["persistent_pain_review"]'; END IF;
 BEGIN capacity:=public.fn_athlete_capacity_core(p_athlete_id);EXCEPTION WHEN OTHERS THEN capacity:=null;END;
 IF capacity#>>'{weakest_pillar,key}' IN('core','cardio','mobilidade') AND (capacity#>>'{weakest_pillar,value}')::numeric<50 THEN
  inputs:=inputs||jsonb_build_object('capacity_pillar',capacity#>>'{weakest_pillar,key}','capacity_value',(capacity#>>'{weakest_pillar,value}')::numeric,'capacity_source',capacity#>>'{weakest_pillar,source}');
  flags:=flags||'["capacity_focus_review"]';
 END IF;
 RETURN jsonb_build_object('status','ready','checkin_id',c.id,'date',c.checkin_date,'rule_set_version',rules.version,'apply_after',rules.apply_after,'mode',state,'volume_pct_total',vol,'rpe_cap_delta',rpe,'rest_delta_s',rest_s,'warmup_add_min',warm,'gate_level',gate,'flags',flags,'reasons',reasons,'inputs',inputs,'calibration_samples',samples);
END $$;

CREATE OR REPLACE FUNCTION private.apply_readiness(p_athlete_id uuid,p_workout_id uuid,p_observe_only boolean DEFAULT false)
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
  WHEN (d->>'gate_level')::int>0 OR lower(coalesce(w.workout_type,'')||' '||coalesce(w.day_name,''))~'(cardio|corrida|running)' THEN 'skipped_review'
  WHEN w.changes_json#>'{readiness,after_exercises}' IS NOT NULL AND before_rows IS DISTINCT FROM w.changes_json#>'{readiness,after_exercises}' THEN 'skipped_changed'
  WHEN p_observe_only OR now()<(d->>'apply_after')::timestamptz THEN 'shadow'
  ELSE 'applied' END;
 IF lower(coalesce(w.workout_type,'')||' '||coalesce(w.day_name,''))~'(cardio|corrida|running)' THEN d:=jsonb_set(d,'{flags}',(d->'flags')||'["timed_session_review"]');END IF;
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

NOTIFY pgrst,'reload schema';
ALTER TABLE public.daily_readiness_decisions DROP CONSTRAINT daily_readiness_decisions_applied_workout_id_fkey,
 ADD CONSTRAINT daily_readiness_decisions_applied_workout_id_fkey FOREIGN KEY(applied_workout_id) REFERENCES public.daily_workouts(id) ON DELETE SET NULL;
ALTER TABLE public.daily_readiness_decisions DROP CONSTRAINT daily_readiness_decisions_checkin_id_fkey,
 ADD CONSTRAINT daily_readiness_decisions_checkin_id_fkey FOREIGN KEY(checkin_id) REFERENCES public.daily_checkins(id) ON DELETE SET NULL;
ALTER TABLE public.daily_readiness_decisions DROP CONSTRAINT daily_readiness_decisions_athlete_id_fkey,
 ADD CONSTRAINT daily_readiness_decisions_athlete_id_fkey FOREIGN KEY(athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE;
ALTER TABLE public.readiness_preferences DROP CONSTRAINT readiness_preferences_user_id_fkey,
 ADD CONSTRAINT readiness_preferences_user_id_fkey FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.readiness_preferences DROP CONSTRAINT readiness_preferences_athlete_id_fkey,
 ADD CONSTRAINT readiness_preferences_athlete_id_fkey FOREIGN KEY(athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE;
ALTER TABLE public.readiness_preferences DROP CONSTRAINT readiness_preferences_pdi_confirmed_by_fkey,
 ADD CONSTRAINT readiness_preferences_pdi_confirmed_by_fkey FOREIGN KEY(pdi_confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
NOTIFY pgrst,'reload schema';
