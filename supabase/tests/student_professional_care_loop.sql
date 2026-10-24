-- Run after professor_student_workspace.sql in BEGIN/ROLLBACK.
CREATE TEMP TABLE qa_care AS SELECT gen_random_uuid() thread,gen_random_uuid() event,gen_random_uuid() reply,gen_random_uuid() ack;
GRANT SELECT ON qa_care TO authenticated;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',student_user::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',student_user,'role','authenticated','is_anonymous',false)::text,true) FROM qa_workspace;
DO $$ DECLARE r jsonb;r2 jsonb;BEGIN
 r:=public.fn_care_write((SELECT thread FROM qa_care),'training','QA dúvida de exercício','QA não tenho o equipamento',(SELECT event FROM qa_care),'open',NULL,NULL);
 r2:=public.fn_care_write((SELECT thread FROM qa_care),'training','QA dúvida de exercício','QA não tenho o equipamento',(SELECT event FROM qa_care),'open',NULL,NULL);
 IF NOT(r->>'saved')::boolean OR NOT(r2->>'already_saved')::boolean THEN RAISE EXCEPTION 'care_receipt_failed';END IF;
 IF(SELECT count(*)FROM public.student_care_events WHERE thread_id=(SELECT thread FROM qa_care))<>1 THEN RAISE EXCEPTION 'care_event_duplicated';END IF;
 BEGIN PERFORM public.fn_care_write(gen_random_uuid(),'training','QA proibido','QA',gen_random_uuid(),'open',NULL,(SELECT athlete_b FROM qa_workspace));RAISE EXCEPTION 'student_target_spoof_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN UPDATE public.student_care_threads SET status='closed' WHERE id=(SELECT thread FROM qa_care);RAISE EXCEPTION 'direct_thread_write_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
SELECT set_config('request.jwt.claim.sub',coach_b::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',coach_b,'role','authenticated','is_anonymous',false)::text,true) FROM qa_workspace;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.student_care_threads WHERE id=(SELECT thread FROM qa_care)) OR EXISTS(SELECT 1 FROM public.student_care_events WHERE thread_id=(SELECT thread FROM qa_care)) THEN RAISE EXCEPTION 'foreign_care_visible';END IF;
 BEGIN PERFORM public.fn_care_seen((SELECT thread FROM qa_care),1);RAISE EXCEPTION 'foreign_care_seen_allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
SELECT set_config('request.jwt.claim.sub',coach_a::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',coach_a,'role','authenticated','is_anonymous',false)::text,true) FROM qa_workspace;
DO $$ DECLARE r jsonb;BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.student_care_threads WHERE id=(SELECT thread FROM qa_care) AND status='awaiting_professional')THEN RAISE EXCEPTION 'request_missing_from_professional';END IF;
 PERFORM public.fn_care_seen((SELECT thread FROM qa_care),1);
 IF NOT EXISTS(SELECT 1 FROM public.student_care_threads WHERE id=(SELECT thread FROM qa_care)AND status='awaiting_professional' AND professional_seen_revision=1) THEN RAISE EXCEPTION 'reading_closed_request';END IF;
 BEGIN PERFORM public.fn_care_seen((SELECT thread FROM qa_care),99);RAISE EXCEPTION 'future_revision_seen';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'invalid_seen_revision' THEN RAISE;END IF;END;
 r:=public.fn_care_write((SELECT thread FROM qa_care),'training','QA dúvida de exercício','QA revise a alternativa no treino',(SELECT reply FROM qa_care),'resolve',1,(SELECT athlete_a FROM qa_workspace));
 IF r->>'status'<>'awaiting_student' OR(r->>'revision')::integer<>2 THEN RAISE EXCEPTION 'reply_not_delivered';END IF;
 BEGIN PERFORM public.fn_care_write((SELECT thread FROM qa_care),'training','QA dúvida de exercício','QA stale',gen_random_uuid(),'reply',1,(SELECT athlete_a FROM qa_workspace));RAISE EXCEPTION 'stale_reply_allowed';EXCEPTION WHEN serialization_failure THEN NULL;END;
 BEGIN PERFORM public.fn_care_write((SELECT thread FROM qa_care),'training','QA dúvida de exercício','',(SELECT ack FROM qa_care),'acknowledge',2,(SELECT athlete_a FROM qa_workspace));RAISE EXCEPTION 'professor_acknowledged_for_student';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
SELECT set_config('request.jwt.claim.sub',student_user::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',student_user,'role','authenticated','is_anonymous',false)::text,true) FROM qa_workspace;
DO $$ DECLARE r jsonb;BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.student_care_events WHERE thread_id=(SELECT thread FROM qa_care)AND revision=2 AND actor_role='professional') THEN RAISE EXCEPTION 'student_cannot_read_reply';END IF;
 PERFORM public.fn_care_seen((SELECT thread FROM qa_care),2);
 IF(SELECT status FROM public.student_care_threads WHERE id=(SELECT thread FROM qa_care))<>'awaiting_student' THEN RAISE EXCEPTION 'reading_acknowledged_delivery';END IF;
 r:=public.fn_care_write((SELECT thread FROM qa_care),'training','QA dúvida de exercício','',(SELECT ack FROM qa_care),'acknowledge',2,(SELECT athlete_a FROM qa_workspace));
 IF r->>'status'<>'closed' THEN RAISE EXCEPTION 'acknowledgement_failed';END IF;
 IF(SELECT count(*)FROM public.student_care_events WHERE thread_id=(SELECT thread FROM qa_care))<>3 THEN RAISE EXCEPTION 'care_history_incomplete';END IF;
 r:=public.fn_care_write((SELECT thread FROM qa_care),'training','QA dúvida de exercício','QA preciso de mais ajuda',gen_random_uuid(),'reply',3,(SELECT athlete_a FROM qa_workspace));
 IF r->>'status'<>'awaiting_professional' THEN RAISE EXCEPTION 'care_reopen_failed';END IF;
 BEGIN PERFORM public.fn_care_write(gen_random_uuid(),'unknown','QA','QA',gen_random_uuid(),'open',NULL,NULL);RAISE EXCEPTION 'invalid_module_allowed';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'invalid_care_open' THEN RAISE;END IF;END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF(SELECT count(*)FROM public.notifications WHERE related_table='student_care_events' AND related_id IN(SELECT id FROM public.student_care_events WHERE thread_id=(SELECT thread FROM qa_care)))<>4 THEN RAISE EXCEPTION 'care_notifications_missing_or_duplicated';END IF;
 IF has_column_privilege('authenticated','public.student_care_events','fingerprint','SELECT') THEN RAISE EXCEPTION 'private_fingerprint_exposed';END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',coach_a::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',coach_a,'role','authenticated','is_anonymous',true)::text,true) FROM qa_workspace;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.student_care_threads) THEN RAISE EXCEPTION 'anonymous_care_visible';END IF;BEGIN PERFORM public.fn_care_seen((SELECT thread FROM qa_care),1);RAISE EXCEPTION 'anonymous_care_seen';EXCEPTION WHEN insufficient_privilege THEN NULL;END;END $$;
RESET ROLE;
SELECT jsonb_build_object('open_request',true,'retry_idempotent',true,'foreign_target_denied',true,'direct_mutation_denied',true,'foreign_read_denied',true,'professional_inbox',true,'reading_does_not_close',true,'future_read_denied',true,'professional_reply',true,'optimistic_revision',true,'student_confirmation_only',true,'student_reads_reply',true,'explicit_confirmation',true,'reopen',true,'invalid_module_denied',true,'notification_once_per_event',true,'fingerprint_private',true,'anonymous_denied',true) care_checks;
