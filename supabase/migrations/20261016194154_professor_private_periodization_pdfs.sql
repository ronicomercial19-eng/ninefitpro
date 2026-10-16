-- Periodization PDFs are stored under <athlete_id>/<filename> in a private bucket.
-- A coach may upload for a linked athlete; the athlete may read their own plan.
UPDATE storage.buckets SET public = false, allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'plans-pdfs';

DROP POLICY IF EXISTS "Delete own plan PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Read own plan PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Update own plan PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Upload own plan PDFs" ON storage.objects;

CREATE POLICY "FitPro periodization PDF read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'plans-pdfs' AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN private.fitpro_can_manage_athlete(((storage.foldername(name))[1])::uuid)
      OR ((storage.foldername(name))[1])::uuid = (SELECT public.fn_current_athlete_id())
    ELSE false END
);
CREATE POLICY "FitPro periodization PDF upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'plans-pdfs' AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN private.fitpro_can_manage_athlete(((storage.foldername(name))[1])::uuid)
    ELSE false END
);
CREATE POLICY "FitPro periodization PDF delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'plans-pdfs' AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN private.fitpro_can_manage_athlete(((storage.foldername(name))[1])::uuid)
    ELSE false END
);
