CREATE FUNCTION public.fn_coach_readiness_alerts(p_limit integer DEFAULT 25,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid();role_name text:=private.fitpro_actor_role();result jsonb;
BEGIN
 IF u IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR role_name IS NULL OR role_name NOT IN('professor','trainer','admin','super_admin') THEN RAISE EXCEPTION 'coach_required' USING ERRCODE='42501';END IF;
 WITH latest AS MATERIALIZED (
  SELECT DISTINCT ON(d.athlete_id) d.id,d.athlete_id,a.name,d.gate_level,d.flags,d.mode,d.status,d.updated_at
  FROM public.daily_readiness_decisions d JOIN public.athletes a ON a.id=d.athlete_id
  WHERE d.decision_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date AND d.status<>'superseded' AND(role_name IN('admin','super_admin') OR a.coach_id=u)
  ORDER BY d.athlete_id,d.updated_at DESC,d.id
 ), alerts AS MATERIALIZED (
  SELECT * FROM latest WHERE gate_level>0 OR flags?'persistent_pain_review' OR flags?'coach_review_trend' OR status='skipped_changed'
 ), page AS (
  SELECT * FROM alerts ORDER BY gate_level DESC,updated_at DESC,athlete_id LIMIT greatest(1,least(coalesce(p_limit,25),100)) OFFSET greatest(0,coalesce(p_offset,0))
 ) SELECT jsonb_build_object('total',(SELECT count(*) FROM alerts),'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY gate_level DESC,updated_at DESC,athlete_id) FROM page p),'[]')) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.fn_coach_readiness_alerts(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_coach_readiness_alerts(integer,integer) TO authenticated;
CREATE INDEX daily_readiness_latest_idx ON public.daily_readiness_decisions(athlete_id,decision_date,updated_at DESC,id);
NOTIFY pgrst,'reload schema';

CREATE OR REPLACE FUNCTION private.apply_readiness(p_athlete_id uuid,p_workout_id uuid,p_observe_only boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb; w public.daily_workouts; before_rows jsonb:='[]'; base_rows jsonb:='[]'; after_rows jsonb:='[]';
 key text; rec public.daily_readiness_decisions; phase text; original int:=0; desired int:=0; remaining int:=0;
 applied int:=0; item jsonb; qty int; take int; delta numeric; locked boolean:=false;is_timed boolean:=false;base_duration numeric;after_duration numeric;time_budget numeric;rest_budget numeric;effective_factor numeric;parsed_missing boolean:=false;
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
 is_timed:=lower(coalesce(w.workout_type,'')||' '||coalesce(w.day_name,''))~'(cardio|corrida|running)';
 IF is_timed THEN
  SELECT coalesce(sum(private.readiness_duration_seconds(x->>'reps_range')*greatest(1,coalesce((x->>'sets')::int,1))),0),coalesce(bool_or(private.readiness_duration_seconds(x->>'reps_range') IS NULL),true),
   coalesce(sum(greatest(0,coalesce((x->>'sets')::int,1)-1)*(coalesce((x->>'rest_seconds')::int,60)+(d->>'rest_delta_s')::int)),0)+(3+(d->>'warmup_add_min')::int)*60
   INTO base_duration,parsed_missing,rest_budget FROM jsonb_array_elements(base_rows)x;
  IF w.changes_json->>'readiness_time_budget_seconds'~'^[0-9]+$' THEN time_budget:=(w.changes_json->>'readiness_time_budget_seconds')::numeric;ELSE
   SELECT CASE WHEN settings.preferences->>'session_minutes'~'^[0-9]+$' THEN (settings.preferences->>'session_minutes')::numeric*60 END INTO time_budget
    FROM public.readiness_preferences pref JOIN public.user_context_settings settings ON settings.user_id=pref.user_id WHERE pref.athlete_id=p_athlete_id AND pref.enabled LIMIT 1;
  END IF;
  time_budget:=coalesce(time_budget,base_duration+rest_budget);
  effective_factor:=greatest(.7,least(1.1,1+delta/100,coalesce((time_budget-rest_budget)/nullif(base_duration,0),1)));
 END IF;
 desired:=CASE WHEN delta<0 THEN least(floor(original*.3)::int,floor(original*abs(delta)/100)::int) WHEN delta>=10 THEN least(1,floor(original*.1)::int) ELSE 0 END;
 phase:=CASE WHEN p_workout_id IS NULL OR original=0 THEN 'skipped_no_workout'
  WHEN w.override_locked OR locked OR w.changes_json->>'readiness_suppressed_date'=(d->>'date') OR w.prescription_issue IS NOT NULL OR EXISTS(SELECT 1 FROM public.workout_executions WHERE daily_workout_id=w.id AND status IN('started','in_progress','paused','completed')) THEN 'skipped_locked'
  WHEN (d->>'gate_level')::int>0 OR (is_timed AND (parsed_missing OR base_duration<=0 OR time_budget-rest_budget<base_duration*.7)) THEN 'skipped_review'
  WHEN w.changes_json#>'{readiness,after_exercises}' IS NOT NULL AND before_rows IS DISTINCT FROM w.changes_json#>'{readiness,after_exercises}' THEN 'skipped_changed'
  WHEN p_observe_only OR now()<(d->>'apply_after')::timestamptz THEN 'shadow'
  ELSE 'applied' END;
 IF is_timed AND phase='skipped_review' THEN d:=jsonb_set(d,'{flags}',(d->'flags')||'["timed_session_review"]');END IF;
 IF is_timed THEN d:=jsonb_set(d,'{inputs,time_budget_seconds}',to_jsonb(time_budget));END IF;
 key:=md5(p_athlete_id::text||coalesce(p_workout_id::text,'none')||(d-'apply_after')::text||base_rows::text||CASE WHEN phase='skipped_changed' THEN before_rows::text ELSE '' END);
 SELECT * INTO rec FROM public.daily_readiness_decisions WHERE decision_key=key;
 IF rec.id IS NOT NULL AND (rec.status=phase OR (rec.status='applied' AND phase IN('skipped_locked','shadow'))) THEN RETURN to_jsonb(rec); END IF;
 IF phase='applied' THEN
  remaining:=desired;
  -- Restore only the recorded base doses. Never delete or replace exercise identities.
  FOR item IN SELECT value FROM jsonb_array_elements(base_rows) LOOP
   UPDATE public.workout_exercises SET sets=(item->>'sets')::int,reps_range=item->>'reps_range',rest_seconds=(item->>'rest_seconds')::int,rpe_target=(item->>'rpe_target')::int WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
  END LOOP;
  IF is_timed THEN
   FOR item IN SELECT value FROM jsonb_array_elements(base_rows) LOOP
    UPDATE public.workout_exercises SET reps_range=private.readiness_scaled_duration(item->>'reps_range',effective_factor) WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
   END LOOP;
  ELSE
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
  END IF;
  UPDATE public.workout_exercises SET rest_seconds=coalesce(rest_seconds,60)+(d->>'rest_delta_s')::int,
   rpe_target=CASE WHEN rpe_target IS NOT NULL THEN greatest(1,floor(rpe_target+(d->>'rpe_cap_delta')::numeric)::int) ELSE rpe_target END WHERE daily_workout_id=w.id;
  SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]'),coalesce(sum(sets),0)::int INTO after_rows,applied FROM public.workout_exercises e WHERE daily_workout_id=w.id;
  IF is_timed THEN SELECT coalesce(sum(private.readiness_duration_seconds(x->>'reps_range')*greatest(1,coalesce((x->>'sets')::int,1))),0) INTO after_duration FROM jsonb_array_elements(after_rows)x;END IF;
  INSERT INTO public.workout_adjustment_versions(daily_workout_id,athlete_id,changed_by,before_exercises,after_exercises) VALUES(w.id,p_athlete_id,auth.uid(),before_rows,after_rows);
  UPDATE public.daily_workouts SET changes_json=coalesce(changes_json,'{}')||jsonb_build_object('readiness',jsonb_build_object('base_exercises',base_rows,'after_exercises',after_rows,'decision_key',key,'warmup_add_min',(d->>'warmup_add_min')::int,'base_estimated_duration_minutes',coalesce(w.changes_json#>'{readiness,base_estimated_duration_minutes}',to_jsonb(w.estimated_duration_minutes)))),estimated_duration_minutes=CASE WHEN is_timed THEN ceil((after_duration+rest_budget)/60)::int ELSE estimated_duration_minutes END,updated_at=now() WHERE id=w.id;
 ELSE applied:=original;after_duration:=base_duration; END IF;
 UPDATE public.daily_readiness_decisions SET status='superseded',updated_at=now() WHERE athlete_id=p_athlete_id AND decision_date=(d->>'date')::date AND applied_workout_id IS NOT DISTINCT FROM p_workout_id AND decision_key<>key AND (status NOT IN('superseded','applied') OR (phase='skipped_changed' AND status='applied'));
 INSERT INTO public.daily_readiness_decisions(decision_key,athlete_id,decision_date,checkin_id,rule_set_version,mode,volume_pct_total,volume_pct_applied,rpe_cap_delta,rest_delta_s,warmup_add_min,gate_level,flags,reasons,inputs,applied_workout_id,status,base_sets,applied_sets,duration_seconds_base,duration_seconds_applied)
 VALUES(key,p_athlete_id,(d->>'date')::date,(d->>'checkin_id')::uuid,d->>'rule_set_version',d->>'mode',delta,CASE WHEN phase='applied' AND is_timed AND base_duration>0 THEN round((after_duration-base_duration)*100.0/base_duration,1) WHEN original>0 AND phase='applied' THEN round((applied-original)*100.0/original,1) ELSE 0 END,(d->>'rpe_cap_delta')::numeric,(d->>'rest_delta_s')::int,(d->>'warmup_add_min')::int,(d->>'gate_level')::int,d->'flags',d->'reasons',d->'inputs',p_workout_id,phase,original,applied,base_duration,after_duration)
 ON CONFLICT(decision_key) DO UPDATE SET status=excluded.status,volume_pct_applied=excluded.volume_pct_applied,base_sets=excluded.base_sets,applied_sets=excluded.applied_sets,duration_seconds_base=excluded.duration_seconds_base,duration_seconds_applied=excluded.duration_seconds_applied,updated_at=now() RETURNING * INTO rec;
 RETURN to_jsonb(rec);
END $$;


NOTIFY pgrst,'reload schema';
