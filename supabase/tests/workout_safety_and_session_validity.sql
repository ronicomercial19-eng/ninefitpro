-- Run inside BEGIN / ROLLBACK after the migration. All fixtures are rolled back.
DO $$
DECLARE a uuid;d uuid;e uuid;bad uuid;x uuid;ok boolean;v_name text;v_weekday jsonb;
BEGIN
 SELECT id INTO a FROM public.athletes WHERE user_id IS NOT NULL ORDER BY created_at LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM public.athletes WHERE id=a),true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT user_id FROM public.athletes WHERE id=a),'role','authenticated','is_anonymous',false)::text,true);
 IF NOT public.fitpro_matches_focus(ARRAY['glúteos'],ARRAY['Membros Inferiores']) THEN RAISE EXCEPTION 'lower_body_taxonomy_failed'; END IF;
 IF public.fitpro_matches_focus(ARRAY['Dorsais'],ARRAY['membros inferiores']) THEN RAISE EXCEPTION 'outside_focus_accepted'; END IF;
 IF public.fn_montar_bloco_exercicios('movimento inexistente QA',1,'test')<>'[]'::jsonb THEN RAISE EXCEPTION 'unknown_name_randomized'; END IF;
 IF jsonb_array_length(public.fn_montar_bloco_exercicios('Bracing abdominal',1,'test'))<>1 THEN RAISE EXCEPTION 'exact_name_not_matched'; END IF;
 IF public.fn_montar_bloco9_exercicios('força',3,ARRAY['musculo inexistente'],NULL,NULL,NULL,NULL,'test')<>'[]'::jsonb THEN RAISE EXCEPTION 'unknown_focus_randomized'; END IF;
 INSERT INTO public.daily_workouts(athlete_id,workout_date,day_number,day_name,focus_muscles,workout_type)
 VALUES(a,DATE '2098-01-01',1,'QA safety',ARRAY['membros inferiores'],'hypertrophy') RETURNING id INTO d;
 SELECT id,name INTO e,v_name FROM public.exercises WHERE NOT taxonomy_review_required AND public.fitpro_matches_focus(target_muscles,ARRAY['membros inferiores']) LIMIT 1;
 SELECT id INTO bad FROM public.exercises WHERE target_muscles && ARRAY['Dorsais'] LIMIT 1;
 INSERT INTO public.workout_exercises(daily_workout_id,exercise_id,exercise_order,sets,reps_range,rest_seconds) VALUES(d,e,1,1,'10',60);
 IF (SELECT exercise_name FROM public.workout_exercises WHERE daily_workout_id=d)<>v_name THEN RAISE EXCEPTION 'name_snapshot_missing'; END IF;
 UPDATE public.workout_exercises SET notes='QA prescrição',tempo='3-1-1' WHERE daily_workout_id=d;
 SELECT value INTO v_weekday FROM jsonb_array_elements(public.fn_get_week_workouts(a,date_trunc('week',DATE '2098-01-01')::date)::jsonb->'week') WHERE value->>'workout_date'='2098-01-01';
 IF v_weekday->'exercises'->0->>'name' IS DISTINCT FROM v_name OR v_weekday->'exercises'->0->>'notes' IS DISTINCT FROM 'QA prescrição' OR v_weekday->'exercises'->0->>'tempo' IS DISTINCT FROM '3-1-1' THEN RAISE EXCEPTION 'weekly_prescription_fields_lost'; END IF;
 BEGIN
  INSERT INTO public.workout_exercises(daily_workout_id,exercise_id,exercise_order,sets,reps_range,rest_seconds) VALUES(d,bad,2,1,'10',60);
  RAISE EXCEPTION 'outside_focus_not_blocked';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.workout_exercises(daily_workout_id,exercise_id,exercise_order,sets,reps_range,rest_seconds) VALUES(d,e,1,1,'10',60);
  RAISE EXCEPTION 'duplicate_order_not_blocked';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.workout_exercises(daily_workout_id,exercise_id,exercise_name,exercise_order,sets,reps_range,rest_seconds) VALUES(d,e,'Nome errado',2,1,'10',60);
  RAISE EXCEPTION 'name_id_mismatch_not_blocked';
 EXCEPTION WHEN check_violation THEN NULL; END;

 INSERT INTO public.workout_executions(athlete_id,workout_date,status,started_at) VALUES(a,DATE '2098-01-02','in_progress',now()-interval '44 seconds') RETURNING id INTO x;
 INSERT INTO public.workout_exercise_sets(execution_id,exercise_name,exercise_order,set_number,completed,actual_reps) VALUES(x,v_name,1,1,true,10);
 UPDATE public.workout_executions SET status='completed',completed_at=now() WHERE id=x;
 IF (SELECT completion_valid FROM public.workout_executions WHERE id=x) THEN RAISE EXCEPTION '44_second_workout_counted'; END IF;
 IF (SELECT completion_validation_reason FROM public.workout_executions WHERE id=x)<>'duration_under_5_minutes' THEN RAISE EXCEPTION 'short_workout_reason_missing'; END IF;

 INSERT INTO public.workout_executions(athlete_id,workout_date,status,started_at) VALUES(a,DATE '2098-01-03','in_progress',now()-interval '6 minutes') RETURNING id INTO x;
 UPDATE public.workout_executions SET status='completed',completed_at=now() WHERE id=x;
 IF (SELECT completion_valid FROM public.workout_executions WHERE id=x) THEN RAISE EXCEPTION 'zero_sets_workout_counted'; END IF;

 INSERT INTO public.workout_executions(athlete_id,workout_date,status,started_at) VALUES(a,DATE '2098-01-04','in_progress',now()-interval '6 minutes') RETURNING id INTO x;
 INSERT INTO public.workout_exercise_sets(execution_id,exercise_name,exercise_order,set_number,completed,actual_reps) VALUES(x,v_name,1,1,true,10);
 UPDATE public.workout_executions SET status='completed',completed_at=now() WHERE id=x;
 IF NOT (SELECT completion_valid FROM public.workout_executions WHERE id=x) THEN RAISE EXCEPTION 'valid_workout_not_counted'; END IF;
 UPDATE public.workout_executions SET completion_valid=false WHERE id=x;
 IF NOT (SELECT completion_valid FROM public.workout_executions WHERE id=x) THEN RAISE EXCEPTION 'validity_client_override_accepted'; END IF;

 INSERT INTO public.workout_executions(athlete_id,workout_date,status,started_at) VALUES(a,DATE '2098-01-05','in_progress',now()-interval '13 hours') RETURNING id INTO x;
 PERFORM private.fitpro_abandon_stale_sessions();
 IF (SELECT status FROM public.workout_executions WHERE id=x)<>'abandoned' THEN RAISE EXCEPTION 'stale_session_not_abandoned'; END IF;
 IF private.fitpro_abandon_stale_sessions()<>0 THEN RAISE EXCEPTION 'stale_cleanup_not_idempotent'; END IF;
 IF has_function_privilege('authenticated','private.fitpro_abandon_stale_sessions()','execute') THEN RAISE EXCEPTION 'cleanup_rpc_exposed'; END IF;
 IF EXISTS(SELECT 1 FROM public.workout_executions WHERE status='in_progress' AND coalesce(started_at,created_at)<now()-interval '12 hours') THEN RAISE EXCEPTION 'stale_sessions_remain'; END IF;
END $$;
SELECT 'PASS: taxonomy, exact resolution, focus, ordering, names, completion validity, stale cleanup, privileges' result;
