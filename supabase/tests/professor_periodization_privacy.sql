-- Requires professor_access_boundaries.sql fixtures in the same transaction.
INSERT INTO public.periodization_annual_plans (athlete_id,coach_id,status)
SELECT athlete_a,coach_a,'active' FROM qa_professor_ids
UNION ALL SELECT athlete_b,coach_b,'active' FROM qa_professor_ids;
INSERT INTO public.postura_scans (user_id,athlete_id)
SELECT student_user,athlete_a FROM qa_professor_ids;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',coach_a::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.periodization_annual_plans WHERE athlete_id IN (SELECT athlete_a FROM qa_professor_ids UNION SELECT athlete_b FROM qa_professor_ids)) <> 1 THEN
    RAISE EXCEPTION 'Coach periodization isolation failed';
  END IF;
  IF (SELECT count(*) FROM public.vw_athlete_periodizacao_ativa WHERE athlete_id IN (SELECT athlete_a FROM qa_professor_ids UNION SELECT athlete_b FROM qa_professor_ids)) <> 1 THEN
    RAISE EXCEPTION 'View bypasses coach isolation or own plan unavailable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.postura_scans WHERE athlete_id=(SELECT athlete_a FROM qa_professor_ids)) THEN
    RAISE EXCEPTION 'Own student posture read denied';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',coach_b::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.postura_scans WHERE athlete_id=(SELECT athlete_a FROM qa_professor_ids)) THEN
    RAISE EXCEPTION 'Another coach reads posture scan';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',student_user::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.vw_athlete_periodizacao_ativa WHERE athlete_id=(SELECT athlete_a FROM qa_professor_ids)) THEN
    RAISE EXCEPTION 'Student active periodization unavailable';
  END IF;
  BEGIN
    UPDATE public.postura_scans SET result='{"summary":"forged"}' WHERE athlete_id=(SELECT athlete_a FROM qa_professor_ids);
    RAISE EXCEPTION 'Student forges posture result';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
