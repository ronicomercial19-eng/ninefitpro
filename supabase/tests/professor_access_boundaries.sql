-- Run after the migration inside BEGIN/ROLLBACK. Fixtures never persist.
CREATE TEMP TABLE qa_professor_ids AS SELECT gen_random_uuid() coach_a, gen_random_uuid() coach_b,
  gen_random_uuid() student_user, gen_random_uuid() admin_user,
  gen_random_uuid() athlete_a, gen_random_uuid() athlete_b, gen_random_uuid() appointment_a;
GRANT SELECT ON qa_professor_ids TO authenticated, anon;
INSERT INTO auth.users (id,email,raw_user_meta_data,raw_app_meta_data)
SELECT coach_a,coach_a::text || '@qa.invalid','{}'::jsonb,'{"fitpro_role":"professor"}'::jsonb FROM qa_professor_ids
UNION ALL SELECT coach_b,coach_b::text || '@qa.invalid','{}'::jsonb,'{"fitpro_role":"professor"}'::jsonb FROM qa_professor_ids
UNION ALL SELECT student_user,student_user::text || '@qa.invalid','{"user_type":"professor"}'::jsonb,'{}'::jsonb FROM qa_professor_ids
UNION ALL SELECT admin_user,admin_user::text || '@qa.invalid','{}'::jsonb,'{"fitpro_role":"admin"}'::jsonb FROM qa_professor_ids;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles p,qa_professor_ids q WHERE p.user_id=q.student_user AND p.role::text <> 'student') THEN
    RAISE EXCEPTION 'User metadata granted staff role';
  END IF;
END $$;

-- Skip unrelated integration/bootstrap triggers only while staging fixtures.
ALTER TABLE public.athletes DISABLE TRIGGER USER;
INSERT INTO public.athletes (id,coach_id,user_id,name,is_test_account)
SELECT athlete_a,coach_a,student_user,'QA synthetic A',true FROM qa_professor_ids
UNION ALL SELECT athlete_b,coach_b,NULL,'QA synthetic B',true FROM qa_professor_ids;
ALTER TABLE public.athletes ENABLE TRIGGER USER;
INSERT INTO public.appointments (id,student_id,teacher_id,title,scheduled_at)
SELECT appointment_a,athlete_a,coach_a,'QA synthetic appointment',now()+interval '1 day' FROM qa_professor_ids;
INSERT INTO public.student_training_assignments (student_id,created_by,training_name)
SELECT athlete_a,coach_a,'QA synthetic training' FROM qa_professor_ids;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',coach_a::text,true) FROM qa_professor_ids;
DO $$ DECLARE n integer; BEGIN
  IF (SELECT count(*) FROM public.athletes WHERE id IN (SELECT athlete_a FROM qa_professor_ids UNION SELECT athlete_b FROM qa_professor_ids)) <> 1 THEN
    RAISE EXCEPTION 'Coach horizontal isolation failed';
  END IF;
  UPDATE public.appointments SET title='QA allowed update' WHERE id=(SELECT appointment_a FROM qa_professor_ids);
  GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Own appointment update denied'; END IF;
  BEGIN
    INSERT INTO public.student_training_assignments (student_id,created_by,training_name)
    SELECT athlete_b,coach_a,'QA forbidden' FROM qa_professor_ids;
    RAISE EXCEPTION 'Cross-coach assignment insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET role='admin' WHERE user_id=(SELECT coach_a FROM qa_professor_ids);
    RAISE EXCEPTION 'Self-promotion allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.athlete_auth_link (athlete_id,user_id)
    SELECT athlete_b,coach_a FROM qa_professor_ids;
    RAISE EXCEPTION 'Coach creates unauthorized login link';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.athletes SET coach_id=(SELECT coach_b FROM qa_professor_ids) WHERE id=(SELECT athlete_a FROM qa_professor_ids);
    RAISE EXCEPTION 'Coach reassignment allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub',coach_b::text,true) FROM qa_professor_ids;
DO $$ DECLARE n integer; BEGIN
  IF EXISTS (SELECT 1 FROM public.appointments WHERE id=(SELECT appointment_a FROM qa_professor_ids)) THEN
    RAISE EXCEPTION 'Another coach reads appointment';
  END IF;
  IF EXISTS (SELECT 1 FROM public.student_training_assignments WHERE student_id=(SELECT athlete_a FROM qa_professor_ids)) THEN
    RAISE EXCEPTION 'Another coach reads assignment';
  END IF;
  UPDATE public.appointments SET title='QA forbidden update' WHERE id=(SELECT appointment_a FROM qa_professor_ids);
  GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Another coach updates appointment'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',student_user::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.appointments WHERE id=(SELECT appointment_a FROM qa_professor_ids)) THEN
    RAISE EXCEPTION 'Student cannot read own appointment';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.student_training_assignments WHERE student_id=(SELECT athlete_a FROM qa_professor_ids)) THEN
    RAISE EXCEPTION 'Student cannot read delivered assignment';
  END IF;
  BEGIN
    INSERT INTO public.student_training_assignments (student_id,created_by,training_name)
    SELECT athlete_a,student_user,'QA forbidden self assignment' FROM qa_professor_ids;
    RAISE EXCEPTION 'Student can prescribe';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET role='professor' WHERE user_id=(SELECT student_user FROM qa_professor_ids);
    RAISE EXCEPTION 'Student can become professor';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.profiles SET full_name='QA personal edit' WHERE user_id=(SELECT student_user FROM qa_professor_ids);
  BEGIN
    UPDATE public.appointments SET teacher_id=(SELECT coach_b FROM qa_professor_ids) WHERE id=(SELECT appointment_a FROM qa_professor_ids);
    RAISE EXCEPTION 'Student changes appointment ownership';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub',admin_user::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.athletes WHERE id IN (SELECT athlete_a FROM qa_professor_ids UNION SELECT athlete_b FROM qa_professor_ids)) <> 2 THEN
    RAISE EXCEPTION 'Admin authorized view denied';
  END IF;
END $$;

RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM 1 FROM public.appointments;
    RAISE EXCEPTION 'Anonymous appointment read allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM 1 FROM public.student_training_assignments;
    RAISE EXCEPTION 'Anonymous prescription read allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
