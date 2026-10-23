BEGIN;
DO $test$
DECLARE u uuid; a uuid; w uuid; e uuid; stamp timestamptz; d date; s int; r jsonb; r2 jsonb; snapshot_id uuid; remote_id uuid; view_row record;
BEGIN
 SELECT at.user_id,at.id,dw.id,x.id,dw.updated_at,dw.workout_date,x.sets
 INTO u,a,w,e,stamp,d,s FROM public.athletes at JOIN public.daily_workouts dw ON dw.athlete_id=at.id
 JOIN public.workout_exercises x ON x.daily_workout_id=dw.id
 WHERE at.user_id IS NOT NULL AND at.name ILIKE '%fernanda%'
 AND dw.workout_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
 AND NOT EXISTS(SELECT 1 FROM public.workout_executions z WHERE z.athlete_id=at.id AND z.workout_date=dw.workout_date AND z.status IN('started','in_progress','paused','completed','skipped'))
 ORDER BY dw.workout_date,x.exercise_order LIMIT 1;
 IF w IS NULL THEN RAISE EXCEPTION 'eligible_workout_required'; END IF;
 INSERT INTO public.daily_checkins(athlete_id,checkin_date,dor,dor_local)
 VALUES(a,(now() AT TIME ZONE 'America/Sao_Paulo')::date,1,NULL)
 ON CONFLICT(athlete_id,checkin_date) DO UPDATE SET dor=1,dor_local=NULL;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 r:=public.fn_publicar_ajuste_treino_dia(a,d,w,stamp,jsonb_build_array(jsonb_build_object('workout_exercise_id',e,'sets',s)));
 IF NOT (r->>'success')::boolean OR r->>'updated_at' IS NULL THEN RAISE EXCEPTION 'missing_version'; END IF;
 BEGIN
   PERFORM public.fn_publicar_ajuste_treino_dia(a,d,w,stamp,jsonb_build_array(jsonb_build_object('workout_exercise_id',e,'sets',s)));
   RAISE EXCEPTION 'stale_version_accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'A prescrição mudou%' THEN RAISE; END IF; END;
 r2:=public.fn_publicar_ajuste_treino_dia(a,d,w,(r->>'updated_at')::timestamptz,jsonb_build_array(jsonb_build_object('workout_exercise_id',e,'sets',s)));
 IF (r2->>'updated_at')::timestamptz <= (r->>'updated_at')::timestamptz THEN RAISE EXCEPTION 'version_not_advanced'; END IF;
 BEGIN
   PERFORM public.fn_publicar_ajuste_treino_dia(a,(now() AT TIME ZONE 'America/Sao_Paulo')::date-1,w,stamp,'[]');
   RAISE EXCEPTION 'past_accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Ajuste apenas%' THEN RAISE; END IF; END;
 INSERT INTO public.ai_context_snapshots(user_id,context) VALUES(u,'{"type":"training_adjustment","qa_rollback":true}') RETURNING id INTO snapshot_id;
 IF snapshot_id IS NULL THEN RAISE EXCEPTION 'snapshot_not_saved'; END IF;
 RESET ROLE;
 UPDATE public.daily_checkins SET dor=3 WHERE athlete_id=a AND checkin_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
 SET LOCAL ROLE authenticated;
 BEGIN
   PERFORM public.fn_publicar_ajuste_treino_dia(a,d,w,(r2->>'updated_at')::timestamptz,jsonb_build_array(jsonb_build_object('workout_exercise_id',e,'sets',s)));
   RAISE EXCEPTION 'pain_review_bypassed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','is_anonymous',true)::text,true);
 BEGIN PERFORM public.fn_publicar_ajuste_treino_dia(a,d,w,stamp,'[]'); RAISE EXCEPTION 'anonymous_allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RESET ROLE;
 INSERT INTO public.periodization_plans_remote(athlete_id,external_plan_id,plan_name,total_weeks,current_week,waves,raw_payload,status,last_synced_at)
 VALUES(a,'qa_rollback_contract','QA rollback',4,2,'[{"start_week":1,"end_week":4,"intensity":"RPE 7"}]','{"total_weeks":4,"current_week":2}','active',clock_timestamp()+interval '1 minute') RETURNING id INTO remote_id;
 SELECT * INTO view_row FROM public.vw_athlete_periodizacao_ativa WHERE athlete_id=a;
 IF view_row.plan_id<>remote_id OR view_row.source<>'periodization_plans_remote' OR view_row.macro_weeks<>4 OR view_row.current_week_index<>2 THEN RAISE EXCEPTION 'remote_canonical_contract_failed'; END IF;
END $test$;
ROLLBACK;
