DO $$
DECLARE a uuid;u uuid;c uuid;p uuid;v_path text;v_count integer;v_appt uuid;
BEGIN
 SELECT a1.id,a1.user_id,a1.coach_id INTO a,u,c FROM public.athletes a1
 WHERE a1.user_id IS NOT NULL AND a1.coach_id IS NOT NULL AND a1.coach_id<>a1.user_id LIMIT 1;
 IF a IS NULL THEN RAISE EXCEPTION 'photo_test_linked_fixture_required'; END IF;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','is_anonymous',false)::text,true);
 v_path:=a::text||'/qa_consent.jpg';
 INSERT INTO public.student_photos(athlete_id,photo_url,photo_type,consented_at,share_with_coach) VALUES(a,v_path,'avaliacao',now(),false) RETURNING id INTO p;
 INSERT INTO storage.objects(bucket_id,name) VALUES('student-photos',v_path);
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF NOT EXISTS(SELECT 1 FROM public.student_photos WHERE id=p) THEN RAISE EXCEPTION 'owner_cannot_read_photo'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='student-photos' AND name=v_path) THEN RAISE EXCEPTION 'owner_cannot_read_storage'; END IF;
 PERFORM set_config('request.jwt.claim.sub',c::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated','is_anonymous',false)::text,true);
 IF EXISTS(SELECT 1 FROM public.student_photos WHERE id=p) OR EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='student-photos' AND name=v_path) THEN RAISE EXCEPTION 'coach_read_without_permission'; END IF;
 EXECUTE 'RESET ROLE';
 UPDATE public.student_photos SET share_with_coach=true WHERE id=p;
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF NOT EXISTS(SELECT 1 FROM public.student_photos WHERE id=p) OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='student-photos' AND name=v_path) THEN RAISE EXCEPTION 'coach_permission_not_effective'; END IF;
 EXECUTE 'RESET ROLE';
 UPDATE public.student_photos SET share_with_coach=false WHERE id=p;
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='student-photos' AND name=v_path) THEN RAISE EXCEPTION 'revoked_photo_still_accessible'; END IF;
 EXECUTE 'RESET ROLE';
 IF has_function_privilege('authenticated','public.fn_record_staff_sync(uuid,text,text)','execute') THEN RAISE EXCEPTION 'staff_receipt_forgeable'; END IF;
 IF NOT has_function_privilege('service_role','public.fn_record_staff_sync(uuid,text,text)','execute') THEN RAISE EXCEPTION 'staff_gateway_cannot_write_receipt'; END IF;
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 INSERT INTO public.appointments(student_id,title,scheduled_at,duration,status,appointment_type,staff_professional_id,staff_method_id)
 VALUES(a,'QA Staff receipt',now()+interval '50 years',60,'scheduled','consultoria','qa-professional','strength') RETURNING id INTO v_appt;
 PERFORM public.fn_record_staff_sync(v_appt,'qa-booking','pendente');
 SELECT count(*) INTO v_count FROM public.notifications WHERE related_id=v_appt;
 PERFORM public.fn_record_staff_sync(v_appt,'qa-booking','pendente');
 IF (SELECT count(*) FROM public.notifications WHERE related_id=v_appt)<>v_count THEN RAISE EXCEPTION 'duplicate_staff_notification'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.appointments WHERE id=v_appt AND staff_booking_id='qa-booking' AND staff_status='pendente' AND integration_status='sent') THEN RAISE EXCEPTION 'staff_receipt_missing'; END IF;
END $$;
SELECT 'PASS: owner photos, coach opt-in, storage opt-in, revoke, service-only booking receipts' result;
