-- Run after professor_access_boundaries.sql in the same BEGIN/ROLLBACK transaction.
INSERT INTO storage.objects (bucket_id, name)
SELECT 'student-photos', athlete_a::text || '/qa.png' FROM qa_professor_ids
UNION ALL SELECT 'student-photos', athlete_b::text || '/qa.png' FROM qa_professor_ids;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',coach_a::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id='student-photos' AND name LIKE '%/qa.png') <> 1 THEN
    RAISE EXCEPTION 'Coach sees another athlete photo';
  END IF;
  INSERT INTO public.student_photos (athlete_id,photo_url,photo_type)
  SELECT athlete_a,athlete_a::text || '/qa.png','frente' FROM qa_professor_ids;
  BEGIN
    INSERT INTO public.student_photos (athlete_id,photo_url,photo_type)
    SELECT athlete_b,athlete_b::text || '/qa.png','frente' FROM qa_professor_ids;
    RAISE EXCEPTION 'Coach inserted another athlete photo';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub',coach_b::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.student_photos WHERE photo_type='frente' AND photo_url LIKE '%/qa.png') THEN
    RAISE EXCEPTION 'Another coach sees private photo metadata';
  END IF;
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id='student-photos' AND name LIKE '%/qa.png') <> 1 THEN
    RAISE EXCEPTION 'Another coach sees wrong files';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub',student_user::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.student_photos WHERE photo_url LIKE '%/qa.png') <> 1 THEN
    RAISE EXCEPTION 'Student cannot read own photo metadata';
  END IF;
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id='student-photos' AND name LIKE '%/qa.png') <> 1 THEN
    RAISE EXCEPTION 'Student cannot read own private file';
  END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='student-photos' AND name LIKE '%/qa.png') THEN
      RAISE EXCEPTION 'Anonymous can read private photo';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
