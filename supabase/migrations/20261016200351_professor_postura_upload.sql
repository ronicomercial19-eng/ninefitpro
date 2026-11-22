DROP POLICY IF EXISTS "FitPro private assessments upload" ON storage.objects;
CREATE POLICY "FitPro private assessments upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'assessments'
  AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.fitpro_can_manage_athlete(((storage.foldername(name))[1])::uuid)
        OR ((storage.foldername(name))[1])::uuid = (SELECT public.fn_current_athlete_id())
      ELSE false END
  )
);;
