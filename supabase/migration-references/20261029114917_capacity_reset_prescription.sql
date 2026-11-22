CREATE FUNCTION public.fn_add_capacity_reset(p_daily_workout_id uuid,p_exercise_id uuid,p_dose text,p_rest_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w public.daily_workouts; cap jsonb; pillar text; score numeric; ex public.exercises; existing uuid; result uuid; before_rows jsonb; after_rows jsonb; pain int;slot record;
BEGIN
 SELECT * INTO w FROM public.daily_workouts WHERE id=p_daily_workout_id;
 IF auth.uid() IS NULL OR w.id IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR NOT private.fitpro_can_manage_athlete(w.athlete_id) THEN RAISE EXCEPTION 'coach_required' USING ERRCODE='42501';END IF;
 IF p_dose IS NULL OR p_dose!~'^[1-9][0-9]{0,2}(-[1-9][0-9]{0,2})? (reps|s|min)$' OR p_rest_seconds IS NULL OR p_rest_seconds NOT BETWEEN 0 AND 300 THEN RAISE EXCEPTION 'explicit_dose_required';END IF;
 IF w.workout_date<>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'today_workout_required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(w.athlete_id::text||w.workout_date::text||CASE WHEN w.workout_type='quick' THEN 'quick' ELSE 'daily' END,0));
 SELECT * INTO w FROM public.daily_workouts WHERE id=p_daily_workout_id FOR UPDATE;
 IF w.override_locked OR w.prescription_issue IS NOT NULL OR EXISTS(SELECT 1 FROM public.workout_exercises WHERE daily_workout_id=w.id AND override_locked) OR EXISTS(SELECT 1 FROM public.workout_executions WHERE daily_workout_id=w.id AND status IN('started','in_progress','paused','completed')) THEN RAISE EXCEPTION 'workout_locked';END IF;
 cap:=public.fn_athlete_capacity_core(w.athlete_id);pillar:=cap#>>'{weakest_pillar,key}';score:=(cap#>>'{weakest_pillar,value}')::numeric;
 IF pillar IS NULL OR pillar NOT IN('core','mobilidade','cardio') OR score IS NULL OR score>=50 THEN RAISE EXCEPTION 'capacity_reset_not_indicated';END IF;
 SELECT dor INTO pain FROM public.daily_checkins WHERE athlete_id=w.athlete_id AND checkin_date=w.workout_date;
 IF pain>=3 OR EXISTS(SELECT 1 FROM public.athletes WHERE id=w.athlete_id AND nullif(btrim(injuries_limitations),'') IS NOT NULL AND lower(btrim(injuries_limitations)) NOT IN('nenhuma','nenhum','não','nao','none','sem restrições','sem restricoes')) THEN RAISE EXCEPTION 'pain_review_required';END IF;
 SELECT * INTO ex FROM public.exercises WHERE id=p_exercise_id;
 IF ex.id IS NULL OR NOT((pillar='core' AND coalesce(array_to_string(ex.target_muscles,' '),'')~*'(core|abd)') OR(pillar='mobilidade' AND ex.equipment='Mobilidade') OR(pillar='cardio' AND ex.goal='endurance')) THEN RAISE EXCEPTION 'exercise_incompatible_with_capacity';END IF;
 SELECT id INTO existing FROM public.workout_exercises WHERE daily_workout_id=w.id AND observations->>'capacity_reset'='true' LIMIT 1;
 IF existing IS NOT NULL THEN RETURN jsonb_build_object('saved',true,'exercise_id',existing,'already_present',true);END IF;
 IF w.changes_json#>'{readiness,after_exercises}' IS NOT NULL THEN PERFORM public.fn_revert_readiness_workout(w.id);END IF;
 UPDATE public.daily_workouts SET changes_json=coalesce(changes_json,'{}')-'readiness'-'readiness_suppressed_date',updated_at=now() WHERE id=w.id;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]') INTO before_rows FROM public.workout_exercises e WHERE daily_workout_id=w.id;
 FOR slot IN SELECT id,exercise_order FROM public.workout_exercises WHERE daily_workout_id=w.id AND exercise_order IS NOT NULL ORDER BY exercise_order DESC,id LOOP
  UPDATE public.workout_exercises SET exercise_order=slot.exercise_order+1 WHERE id=slot.id;
 END LOOP;
 INSERT INTO public.workout_exercises(daily_workout_id,exercise_id,exercise_name,exercise_order,sets,reps_range,rest_seconds,notes,observations)
 VALUES(w.id,ex.id,ex.name,1,1,p_dose,p_rest_seconds,'Ênfase de capacidade · bloco de preparação',jsonb_build_object('block','reset','capacity_reset',true,'capacity_pillar',pillar,'capacity_score',score,'confirmed_by',auth.uid())) RETURNING id INTO result;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]') INTO after_rows FROM public.workout_exercises e WHERE daily_workout_id=w.id;
 INSERT INTO public.workout_adjustment_versions(daily_workout_id,athlete_id,changed_by,before_exercises,after_exercises) VALUES(w.id,w.athlete_id,auth.uid(),before_rows,after_rows);
 RETURN jsonb_build_object('saved',true,'exercise_id',result,'pillar',pillar);
END $$;
REVOKE ALL ON FUNCTION public.fn_add_capacity_reset(uuid,uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_add_capacity_reset(uuid,uuid,text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';

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
   SELECT value INTO item FROM jsonb_array_elements(base_rows) WHERE coalesce(value#>>'{observations,block}','')<>'reset' ORDER BY (value->>'exercise_order')::int,value->>'id' LIMIT 1;
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
