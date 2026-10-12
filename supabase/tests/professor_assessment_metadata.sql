-- Run after professor_access_boundaries.sql in a single BEGIN/ROLLBACK transaction.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',coach_a::text,true) FROM qa_professor_ids;
INSERT INTO public.student_pdf_assessments (student_id,file_url,file_name)
SELECT athlete_a,athlete_a::text || '/qa.pdf','qa.pdf' FROM qa_professor_ids;
INSERT INTO public.user_assessments (athlete_id,user_id,file_url,file_type,assessment_date)
SELECT athlete_a,coach_a,athlete_a::text || '/qa.png','image/png',current_date FROM qa_professor_ids;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.student_pdf_assessments (student_id,file_url,file_name)
    SELECT athlete_b,athlete_b::text || '/qa.pdf','qa.pdf' FROM qa_professor_ids;
    RAISE EXCEPTION 'Coach inserted another athlete PDF';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.user_assessments (athlete_id,user_id,file_url)
    SELECT athlete_b,coach_a,athlete_b::text || '/qa.png' FROM qa_professor_ids;
    RAISE EXCEPTION 'Coach inserted another athlete document';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub',coach_b::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.student_pdf_assessments WHERE file_name='qa.pdf')
    OR EXISTS (SELECT 1 FROM public.user_assessments WHERE file_url LIKE '%/qa.png') THEN
    RAISE EXCEPTION 'Other coach reads private assessment metadata';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',student_user::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.student_pdf_assessments WHERE file_name='qa.pdf')<>1
    OR (SELECT count(*) FROM public.user_assessments WHERE file_url LIKE '%/qa.png')<>1 THEN
    RAISE EXCEPTION 'Student cannot read own assessments';
  END IF;
END $$;
RESET ROLE;
