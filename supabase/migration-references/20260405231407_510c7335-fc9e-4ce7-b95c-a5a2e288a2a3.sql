-- Drop the broken UPDATE policy
DROP POLICY IF EXISTS "Students can update own appointments" ON public.appointments;

-- Recreate with correct enum values
CREATE POLICY "Students can update own appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (
  student_id IN (SELECT id FROM public.athletes WHERE user_id = (select auth.uid()))
  AND status IN ('scheduled')
);