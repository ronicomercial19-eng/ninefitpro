-- Keep document metadata scoped to the same athlete as its private Storage path.
DROP POLICY IF EXISTS "Students view own assessments" ON public.student_pdf_assessments;
DROP POLICY IF EXISTS "Trainers can delete assessments" ON public.student_pdf_assessments;
DROP POLICY IF EXISTS "Trainers can insert assessments" ON public.student_pdf_assessments;
DROP POLICY IF EXISTS "Trainers view all assessments" ON public.student_pdf_assessments;
CREATE POLICY "FitPro PDF read" ON public.student_pdf_assessments FOR SELECT TO authenticated
USING ((SELECT private.fitpro_actor_role()) IS NOT NULL
  AND (private.fitpro_can_manage_athlete(student_id) OR student_id=(SELECT public.fn_current_athlete_id())));
CREATE POLICY "FitPro PDF insert" ON public.student_pdf_assessments FOR INSERT TO authenticated
WITH CHECK ((SELECT private.fitpro_actor_role()) IS NOT NULL
  AND private.fitpro_can_manage_athlete(student_id)
  AND (file_url LIKE student_id::text || '/%' OR file_url LIKE '%/assessments/' || student_id::text || '/%'));
CREATE POLICY "FitPro PDF delete" ON public.student_pdf_assessments FOR DELETE TO authenticated
USING ((SELECT private.fitpro_actor_role()) IS NOT NULL AND private.fitpro_can_manage_athlete(student_id));
REVOKE ALL ON public.student_pdf_assessments FROM anon;
GRANT SELECT, INSERT, DELETE ON public.student_pdf_assessments TO authenticated;

ALTER TABLE public.user_assessments
  ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.athletes(id),
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS assessment_date date;
CREATE INDEX IF NOT EXISTS idx_user_assessments_athlete_id ON public.user_assessments(athlete_id);
DROP POLICY IF EXISTS "users insert own assessments" ON public.user_assessments;
DROP POLICY IF EXISTS "users see own assessments" ON public.user_assessments;
CREATE POLICY "FitPro document read" ON public.user_assessments FOR SELECT TO authenticated
USING (athlete_id IS NOT NULL AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND (private.fitpro_can_manage_athlete(athlete_id) OR athlete_id=(SELECT public.fn_current_athlete_id())));
CREATE POLICY "FitPro document insert" ON public.user_assessments FOR INSERT TO authenticated
WITH CHECK (athlete_id IS NOT NULL AND user_id=(SELECT auth.uid())
  AND file_url LIKE athlete_id::text || '/%'
  AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND (private.fitpro_can_manage_athlete(athlete_id) OR athlete_id=(SELECT public.fn_current_athlete_id())));
CREATE POLICY "FitPro document delete" ON public.user_assessments FOR DELETE TO authenticated
USING (athlete_id IS NOT NULL AND (SELECT private.fitpro_actor_role()) IS NOT NULL
  AND (private.fitpro_can_manage_athlete(athlete_id) OR athlete_id=(SELECT public.fn_current_athlete_id())));
REVOKE ALL ON public.user_assessments FROM anon;
GRANT SELECT, INSERT, DELETE ON public.user_assessments TO authenticated;
