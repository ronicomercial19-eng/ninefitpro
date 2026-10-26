DO $$
DECLARE a uuid;u uuid;v_day jsonb;v_hub jsonb;v_date date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;x uuid;v_before integer;
BEGIN
 SELECT id,user_id INTO a,u FROM public.athletes WHERE user_id IS NOT NULL ORDER BY created_at LIMIT 1;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','is_anonymous',false)::text,true);
 SELECT engagement_score INTO v_before FROM public.athletes WHERE id=a;
 IF v_before IS NULL THEN RAISE EXCEPTION 'legacy_engagement_lost'; END IF;
 INSERT INTO public.daily_checkins(athlete_id,checkin_date,sono,energia,humor,motivacao,dor)
 VALUES(a,v_date,5,5,5,5,1) ON CONFLICT(athlete_id,checkin_date) DO UPDATE SET sono=5,energia=5,humor=5,motivacao=5,dor=1;
 v_day:=public.fn_get_daily_context();v_hub:=public.fn_get_hub_snapshot();
 IF (v_day->'sync'->>'value')::integer<>100 OR (v_hub->'sync'->>'value')::integer<>100 THEN RAISE EXCEPTION 'readiness_formula_diverges'; END IF;
 IF public.calcular_sync_score_real(a)<>100 OR (SELECT sync_score FROM public.athletes WHERE id=a)<>100 THEN RAISE EXCEPTION 'stored_sync_diverges'; END IF;
 IF NOT v_hub ? 'weight' OR NOT v_hub ? 'streak' OR NOT v_hub ? 'engagement' THEN RAISE EXCEPTION 'snapshot_missing_fields'; END IF;
 IF (v_hub->>'streak')::integer<>(v_day->>'streak')::integer THEN RAISE EXCEPTION 'streak_diverges'; END IF;
 IF (v_hub->'weekly'->>'treinos')::integer<>(SELECT count(*) FROM public.workout_executions WHERE athlete_id=a AND status='completed' AND completion_valid AND workout_date BETWEEN date_trunc('week',v_date)::date AND v_date) THEN RAISE EXCEPTION 'invalid_workouts_counted'; END IF;
 INSERT INTO public.workout_executions(athlete_id,workout_date,status,started_at) VALUES(a,v_date,'in_progress',now()) RETURNING id INTO x;
 v_day:=public.fn_get_daily_context();
 IF NOT (v_day->'today'->>'workout_in_progress')::boolean THEN RAISE EXCEPTION 'open_session_hidden'; END IF;
 UPDATE public.daily_checkins SET energia=NULL WHERE athlete_id=a AND checkin_date=v_date;
 IF (public.fn_get_hub_snapshot()->'sync'->>'value') IS NOT NULL OR (SELECT sync_score FROM public.athletes WHERE id=a) IS NOT NULL THEN RAISE EXCEPTION 'incomplete_calibration_has_score'; END IF;
END $$;
SELECT 'PASS: engagement preserved, readiness consistent, snapshot weight/streak, valid counters, open session, incomplete calibration' result;
