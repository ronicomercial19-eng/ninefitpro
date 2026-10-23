-- Run inside BEGIN/ROLLBACK. No emails, partner calls or persistent fixtures.
CREATE TEMP TABLE qa_workspace AS SELECT gen_random_uuid() coach_a,gen_random_uuid() coach_b,gen_random_uuid() student_user,gen_random_uuid() athlete_a,gen_random_uuid() athlete_b,gen_random_uuid() request_id,gen_random_uuid() message_id,gen_random_uuid() credit_id;
GRANT SELECT ON qa_workspace TO authenticated;
INSERT INTO auth.users(id,email,raw_user_meta_data,raw_app_meta_data)
SELECT coach_a,coach_a::text||'@qa.invalid','{}'::jsonb,'{"fitpro_role":"professor"}'::jsonb FROM qa_workspace
UNION ALL SELECT coach_b,coach_b::text||'@qa.invalid','{}'::jsonb,'{"fitpro_role":"professor"}'::jsonb FROM qa_workspace
UNION ALL SELECT student_user,student_user::text||'@qa.invalid','{}'::jsonb,'{}'::jsonb FROM qa_workspace;
ALTER TABLE public.athletes DISABLE TRIGGER USER;
INSERT INTO public.athletes(id,coach_id,user_id,name,is_test_account) SELECT athlete_a,coach_a,student_user,'QA workspace A',false FROM qa_workspace UNION ALL SELECT athlete_b,coach_b,NULL,'QA workspace B',false FROM qa_workspace;
ALTER TABLE public.athletes ENABLE TRIGGER USER;
CREATE TEMP TABLE qa_exercise AS SELECT id FROM public.exercises ORDER BY id LIMIT 1;
GRANT SELECT ON qa_exercise TO authenticated;
CREATE TEMP TABLE qa_adjustment AS SELECT gen_random_uuid() id;
GRANT SELECT ON qa_adjustment TO authenticated;
INSERT INTO public.training_adjustment_recommendations(id,athlete_id,week_start,status,recommendation_type,rationale,proposed_changes)
SELECT qa_adjustment.id,q.athlete_a,date_trunc('week',(now() AT TIME ZONE 'America/Sao_Paulo')::date+1)::date,'pending','reduce_volume','QA revisão concreta','{"reduce_volume_percent":25}'::jsonb FROM qa_workspace q,qa_adjustment;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',coach_a::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',coach_a,'role','authenticated','is_anonymous',false)::text,true) FROM qa_workspace;
DO $$ DECLARE q record;e uuid;payload jsonb;r jsonb;r2 jsonb;v_draft uuid:=gen_random_uuid();v_cycle_request uuid:=gen_random_uuid();v_week jsonb;d date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date+1;BEGIN
 SELECT * INTO q FROM qa_workspace;SELECT id INTO e FROM qa_exercise;IF e IS NULL THEN RAISE EXCEPTION 'test_catalog_empty';END IF;
 IF jsonb_array_length(public.fn_coach_students())<>1 THEN RAISE EXCEPTION 'student_list_scope_failed';END IF;
 r:=public.fn_coach_student_context(q.athlete_a);IF r#>>'{athlete,id}'<>q.athlete_a::text OR r#>>'{daily_context,status}'<>'available' THEN RAISE EXCEPTION 'context_failed';END IF;
 BEGIN PERFORM public.fn_coach_student_context(q.athlete_b);RAISE EXCEPTION 'foreign_context_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 payload:=jsonb_build_array(jsonb_build_object('exercise_id',e,'sets',3,'reps_range','8-12','rest_seconds',60));
 r:=public.fn_professor_publish_workout(q.athlete_a,d,'QA sessão',payload,q.request_id,NULL);
 r2:=public.fn_professor_publish_workout(q.athlete_a,d,'QA sessão',payload,q.request_id,NULL);
 IF NOT (r->>'saved')::boolean OR NOT(r2->>'already_published')::boolean THEN RAISE EXCEPTION 'publication_receipt_failed';END IF;
 IF (SELECT count(*) FROM public.student_prescription_versions WHERE athlete_id=q.athlete_a)<>1 THEN RAISE EXCEPTION 'duplicate_publication';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workout_exercises WHERE daily_workout_id=(r->>'daily_workout_id')::uuid AND sets=3) THEN RAISE EXCEPTION 'student_exercises_missing';END IF;
 BEGIN PERFORM public.fn_professor_publish_workout(q.athlete_b,d,'QA proibido',payload,gen_random_uuid(),NULL);RAISE EXCEPTION 'foreign_publish_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 PERFORM public.fn_send_student_message(q.athlete_a,'QA mensagem',q.message_id);
 PERFORM public.fn_send_student_message(q.athlete_a,'QA mensagem',q.message_id);
 IF(SELECT count(*) FROM public.student_professional_messages WHERE athlete_id=q.athlete_a)<>1 THEN RAISE EXCEPTION 'message_duplicated';END IF;
 r:=public.fn_professor_grant_credits(q.athlete_a,2,q.credit_id);r2:=public.fn_professor_grant_credits(q.athlete_a,2,q.credit_id);
 IF(r2->>'total_credits')::integer<>2 OR (r2->>'used_credits')::integer<>0 THEN RAISE EXCEPTION 'credit_duplicated';END IF;
 IF jsonb_array_length(public.fn_coach_overview(d-1,d)->'students')<>1 THEN RAISE EXCEPTION 'overview_scope_failed';END IF;
 PERFORM public.fn_professor_review_adjustment((SELECT id FROM qa_adjustment),'accept');
 r:=public.fn_professor_adjustment_preview((SELECT id FROM qa_adjustment));
 IF NOT(r->>'supported')::boolean OR jsonb_array_length(r->'changes')=0 THEN RAISE EXCEPTION 'adjustment_preview_missing';END IF;
 r2:=public.fn_professor_apply_adjustment((SELECT id FROM qa_adjustment),r->>'revision');
 IF NOT(r2->>'success')::boolean THEN RAISE EXCEPTION 'adjustment_apply_failed';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workout_exercises w JOIN public.daily_workouts dw ON dw.id=w.daily_workout_id WHERE dw.athlete_id=q.athlete_a AND dw.workout_date=d AND w.sets=2) THEN RAISE EXCEPTION 'adjustment_not_concrete';END IF;
 r2:=public.fn_professor_apply_adjustment((SELECT id FROM qa_adjustment),r->>'revision');
 IF NOT(r2->>'already_applied')::boolean THEN RAISE EXCEPTION 'adjustment_reapplied';END IF;
 PERFORM public.fn_professor_confirm_adjustment_delivery((SELECT id FROM qa_adjustment));

 INSERT INTO public.student_workout_drafts(id,author_id,athlete_id,workout_date,title,exercises) VALUES(v_draft,q.coach_a,q.athlete_a,d+7,'QA semana',payload);
 SELECT jsonb_build_array(jsonb_build_object('draft_id',id,'updated_at',updated_at,'weekday',extract(isodow FROM workout_date))) INTO v_week FROM public.student_workout_drafts WHERE id=v_draft;
 r:=public.fn_professor_publish_cycle(q.athlete_a,d+7,2,'QA ciclo',v_week,v_cycle_request);
 r2:=public.fn_professor_publish_cycle(q.athlete_a,d+7,2,'QA ciclo',v_week,v_cycle_request);
 IF(r->>'sessions')::integer<>2 OR r2->>'cycle_id' IS DISTINCT FROM r->>'cycle_id' THEN RAISE EXCEPTION 'cycle_receipt_failed';END IF;
 IF(SELECT count(*) FROM public.daily_workouts WHERE student_cycle_id=(r->>'cycle_id')::uuid)<>2 THEN RAISE EXCEPTION 'cycle_delivery_failed';END IF;
 INSERT INTO public.appointments(student_id,teacher_id,title,scheduled_at,duration) VALUES(q.athlete_a,q.coach_a,'QA agenda',now()+interval '10 days',60);
 BEGIN
  INSERT INTO public.appointments(student_id,teacher_id,title,scheduled_at,duration) VALUES(q.athlete_a,q.coach_a,'QA conflito',now()+interval '10 days 30 minutes',60);
  RAISE EXCEPTION 'appointment_overlap_allowed';
 EXCEPTION WHEN exclusion_violation THEN NULL;END;
 PERFORM public.fn_save_professional_ai_turn(q.athlete_a,q.message_id,'QA pergunta','QA resposta','chat');
 PERFORM public.fn_save_professional_ai_turn(q.athlete_a,q.message_id,'QA pergunta','QA resposta','chat');
 IF(SELECT count(*) FROM public.professional_ai_turns WHERE athlete_id=q.athlete_a)<>1 THEN RAISE EXCEPTION 'ai_history_duplicate';END IF;
 PERFORM public.fn_coach_subscription_context(q.athlete_a);
 BEGIN PERFORM public.fn_professor_publish_reviewed_adjustment(q.athlete_b,(SELECT id FROM qa_adjustment),d,'QA alvo incorreto',payload,gen_random_uuid(),NULL);RAISE EXCEPTION 'manual_adjustment_scope_conflict_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 INSERT INTO public.postura_scans(user_id,athlete_id) VALUES(q.coach_a,q.athlete_a);
 INSERT INTO storage.objects(bucket_id,name) VALUES('plans-pdfs',q.athlete_a::text||'/qa-plan.pdf');
 INSERT INTO public.workout_executions(athlete_id,workout_date,status,daily_workout_id) SELECT q.athlete_a,d,'in_progress',id FROM public.daily_workouts WHERE athlete_id=q.athlete_a AND workout_date=d;
 BEGIN
  PERFORM public.fn_professor_publish_workout(q.athlete_a,d,'QA não alterar',payload,gen_random_uuid(),(SELECT updated_at FROM public.daily_workouts WHERE athlete_id=q.athlete_a AND workout_date=d));
  RAISE EXCEPTION 'started_workout_replaced';
 EXCEPTION WHEN SQLSTATE '55000' THEN NULL;END;

END $$;
SELECT set_config('request.jwt.claim.sub',student_user::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',student_user,'role','authenticated','is_anonymous',false)::text,true) FROM qa_workspace;
DO $$ DECLARE q record;BEGIN SELECT * INTO q FROM qa_workspace;
 IF NOT EXISTS(SELECT 1 FROM public.student_training_cycles WHERE athlete_id=q.athlete_a) THEN RAISE EXCEPTION 'student_cannot_read_cycle';END IF;
 IF EXISTS(SELECT 1 FROM public.professional_ai_turns WHERE athlete_id=q.athlete_a) THEN RAISE EXCEPTION 'student_reads_professional_ai';END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='plans-pdfs' AND name=q.athlete_a::text||'/qa-plan.pdf') THEN RAISE EXCEPTION 'private_pdf_denied_to_student';END IF;
 BEGIN
  INSERT INTO public.postura_scans(user_id,athlete_id,status,result) VALUES(q.student_user,q.athlete_a,'done','{"score":100}'::jsonb);
  RAISE EXCEPTION 'posture_result_forged';
 EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN
  PERFORM public.fn_ajustar_treino_dia(q.athlete_a,(now() AT TIME ZONE 'America/Sao_Paulo')::date+1,jsonb_build_array(jsonb_build_object('exercise_id',(SELECT id FROM qa_exercise),'sets',1)));
  RAISE EXCEPTION 'legacy_rpc_changed_started_workout';
 EXCEPTION WHEN SQLSTATE '55000' THEN NULL;END;
 IF NOT EXISTS(SELECT 1 FROM public.student_prescription_versions WHERE athlete_id=q.athlete_a) THEN RAISE EXCEPTION 'student_cannot_read_version';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.postura_scans WHERE athlete_id=q.athlete_a AND user_id=q.coach_a) THEN RAISE EXCEPTION 'student_cannot_read_professional_scan';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.student_professional_messages WHERE athlete_id=q.athlete_a) THEN RAISE EXCEPTION 'student_cannot_read_message';END IF;
 PERFORM public.fn_send_student_message(q.athlete_a,'QA resposta do aluno',gen_random_uuid());
 BEGIN PERFORM public.fn_professor_grant_credits(q.athlete_a,2,gen_random_uuid());RAISE EXCEPTION 'student_can_grant_credit';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.fn_coach_student_context(q.athlete_a);RAISE EXCEPTION 'student_can_open_professional_context';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
SELECT set_config('request.jwt.claim.sub',coach_b::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',coach_b,'role','authenticated','is_anonymous',false)::text,true) FROM qa_workspace;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.student_professional_messages WHERE athlete_id=(SELECT athlete_a FROM qa_workspace)) THEN RAISE EXCEPTION 'foreign_message_visible';END IF;END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',coach_a::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',coach_a,'role','authenticated','is_anonymous',true)::text,true) FROM qa_workspace;
DO $$ BEGIN
 IF jsonb_array_length(public.fn_coach_students())<>0 THEN RAISE EXCEPTION 'anonymous_coach_students_visible';END IF;
 IF EXISTS(SELECT 1 FROM public.student_professional_messages) THEN RAISE EXCEPTION 'anonymous_messages_visible';END IF;
 BEGIN PERFORM public.fn_coach_student_context((SELECT athlete_a FROM qa_workspace));RAISE EXCEPTION 'anonymous_professional_context_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
SELECT jsonb_build_object('student_scope',true,'context',true,'foreign_access_denied',true,'publication_idempotent',true,'student_delivery',true,'private_scan_shared',true,'messages_bidirectional',true,'message_idempotent',true,'credits_idempotent',true,'overview_scope',true,'cycle_idempotent',true,'cycle_delivered',true,'appointment_conflict_blocked',true,'adjustment_preview',true,'adjustment_changes_exercises',true,'adjustment_idempotent',true,'native_delivery_confirmed',true,'private_pdf_read',true,'posture_forgery_blocked',true,'started_session_preserved',true,'legacy_adjustment_guarded',true,'anonymous_denied',true,'professional_ai_private',true,'professional_ai_history_idempotent',true,'subscription_context',true,'manual_student_scope_guarded',true,'fixture_persists',false) workspace_checks;
