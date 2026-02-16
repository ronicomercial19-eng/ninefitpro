
-- =============================================
-- FIX 1: Storage policies for training-html-files
-- =============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Professores upload HTML treinos" ON storage.objects;
DROP POLICY IF EXISTS "Professores veem arquivos HTML" ON storage.objects;
DROP POLICY IF EXISTS "Professores deletam arquivos HTML" ON storage.objects;
DROP POLICY IF EXISTS "Professores atualizam arquivos HTML" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view training HTML files" ON storage.objects;

-- Trainers can upload training files
CREATE POLICY "Trainers upload training files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'training-html-files' AND
  public.is_trainer((select auth.uid()))
);

-- Trainers and assigned students can view training files
CREATE POLICY "View assigned training files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'training-html-files' AND
  (
    public.is_trainer((select auth.uid())) OR
    (storage.foldername(name))[1]::uuid IN (
      SELECT athlete_id FROM athlete_auth_link WHERE user_id = (select auth.uid())
      UNION
      SELECT id FROM athletes WHERE user_id = (select auth.uid())
    )
  )
);

-- Trainers can update training files
CREATE POLICY "Trainers update training files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'training-html-files' AND
  public.is_trainer((select auth.uid()))
);

-- Trainers can delete training files
CREATE POLICY "Trainers delete training files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'training-html-files' AND
  public.is_trainer((select auth.uid()))
);

-- =============================================
-- FIX 2: Storage policies for diet-html-files
-- =============================================

DROP POLICY IF EXISTS "Anyone can view diet files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload diet files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete diet files" ON storage.objects;

-- Trainers can upload diet files
CREATE POLICY "Trainers upload diet files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'diet-html-files' AND
  public.is_trainer((select auth.uid()))
);

-- Trainers and assigned students can view diet files
CREATE POLICY "View assigned diet files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'diet-html-files' AND
  (
    public.is_trainer((select auth.uid())) OR
    (storage.foldername(name))[1]::uuid IN (
      SELECT athlete_id FROM athlete_auth_link WHERE user_id = (select auth.uid())
      UNION
      SELECT id FROM athletes WHERE user_id = (select auth.uid())
    )
  )
);

-- Trainers can delete diet files
CREATE POLICY "Trainers delete diet files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'diet-html-files' AND
  public.is_trainer((select auth.uid()))
);

-- =============================================
-- FIX 3: student_pdf_assessments - Fix permissive SELECT
-- =============================================

DROP POLICY IF EXISTS "Authenticated can view assessments" ON student_pdf_assessments;
DROP POLICY IF EXISTS "Users can view assessments" ON student_pdf_assessments;

-- Trainers can view all assessments
CREATE POLICY "Trainers view all assessments"
ON student_pdf_assessments FOR SELECT
TO authenticated
USING (
  public.is_trainer((select auth.uid()))
);

-- Students can view their own assessments
CREATE POLICY "Students view own assessments"
ON student_pdf_assessments FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT athlete_id FROM athlete_auth_link WHERE user_id = (select auth.uid())
    UNION
    SELECT id FROM athletes WHERE user_id = (select auth.uid())
  )
);
