-- Sensitive progress and posture photos must be read through RLS or short-lived signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('student-photos', 'student-photos', false, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false;

UPDATE storage.buckets SET public = false WHERE id = 'assessments';

DROP POLICY IF EXISTS "Anyone can view assessments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload assessments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete assessments" ON storage.objects;

CREATE POLICY "FitPro private assessments read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'assessments'
  AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.fitpro_can_manage_athlete(((storage.foldername(name))[1])::uuid)
        OR ((storage.foldername(name))[1])::uuid = (SELECT public.fn_current_athlete_id())
      ELSE false END
  )
);
CREATE POLICY "FitPro private assessments upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'assessments'
  AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.fitpro_can_manage_athlete(((storage.foldername(name))[1])::uuid)
        OR ((storage.foldername(name))[1])::uuid = (SELECT public.fn_current_athlete_id())
      ELSE false END
  )
);
CREATE POLICY "FitPro private assessments update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'assessments' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text AND (SELECT private.fitpro_actor_role()) IS NOT NULL)
WITH CHECK (bucket_id = 'assessments' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text AND (SELECT private.fitpro_actor_role()) IS NOT NULL);
CREATE POLICY "FitPro private assessments delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'assessments' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text AND (SELECT private.fitpro_actor_role()) IS NOT NULL);

CREATE POLICY "FitPro student photo read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'student-photos' AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN private.fitpro_can_manage_athlete(((storage.foldername(name))[1])::uuid)
      OR ((storage.foldername(name))[1])::uuid = (SELECT public.fn_current_athlete_id())
    ELSE false END
);
CREATE POLICY "FitPro student photo upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'student-photos' AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN private.fitpro_can_manage_athlete(((storage.foldername(name))[1])::uuid)
      OR ((storage.foldername(name))[1])::uuid = (SELECT public.fn_current_athlete_id())
    ELSE false END
);
CREATE POLICY "FitPro student photo delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'student-photos' AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN private.fitpro_can_manage_athlete(((storage.foldername(name))[1])::uuid)
      OR ((storage.foldername(name))[1])::uuid = (SELECT public.fn_current_athlete_id())
    ELSE false END
);

DROP POLICY IF EXISTS "Athletes view own photos" ON public.student_photos;
DROP POLICY IF EXISTS "Professors manage athlete photos" ON public.student_photos;
CREATE POLICY "FitPro linked photo read" ON public.student_photos FOR SELECT TO authenticated
USING (athlete_id IS NOT NULL AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND (private.fitpro_can_manage_athlete(athlete_id) OR athlete_id = (SELECT public.fn_current_athlete_id())));
CREATE POLICY "FitPro linked photo insert" ON public.student_photos FOR INSERT TO authenticated
WITH CHECK (athlete_id IS NOT NULL AND photo_url LIKE athlete_id::text || '/%'
  AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND (private.fitpro_can_manage_athlete(athlete_id) OR athlete_id = (SELECT public.fn_current_athlete_id())));
CREATE POLICY "FitPro linked photo delete" ON public.student_photos FOR DELETE TO authenticated
USING (athlete_id IS NOT NULL AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND (private.fitpro_can_manage_athlete(athlete_id) OR athlete_id = (SELECT public.fn_current_athlete_id())));
REVOKE ALL ON public.student_photos FROM anon;
GRANT SELECT, INSERT, DELETE ON public.student_photos TO authenticated;
