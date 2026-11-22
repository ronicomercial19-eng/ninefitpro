-- Fix: Students can view their appointments (student_id is athletes.id, not auth.uid())
DROP POLICY IF EXISTS "Students can view their appointments" ON public.appointments;
CREATE POLICY "Students can view their appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT a.id FROM public.athletes a WHERE a.user_id = auth.uid()
      UNION
      SELECT aal.athlete_id FROM public.athlete_auth_link aal WHERE aal.user_id = auth.uid()
    )
    OR teacher_id = auth.uid()
  );

-- Fix: Students can INSERT appointments (request scheduling)
CREATE POLICY "Students can request appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT a.id FROM public.athletes a WHERE a.user_id = auth.uid()
      UNION
      SELECT aal.athlete_id FROM public.athlete_auth_link aal WHERE aal.user_id = auth.uid()
    )
  );

-- Fix: Students can update own appointments (UPDATE policy already uses JOIN but let's ensure consistency)
DROP POLICY IF EXISTS "Students can update own appointments" ON public.appointments;
CREATE POLICY "Students can update own appointments"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT a.id FROM public.athletes a WHERE a.user_id = auth.uid()
      UNION
      SELECT aal.athlete_id FROM public.athlete_auth_link aal WHERE aal.user_id = auth.uid()
    )
    AND status = 'scheduled'
  );

-- Fix: Students can update their own credits (for check-in deduction)
CREATE POLICY "Students can update own credits on checkin"
  ON public.student_credits
  FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT a.id FROM public.athletes a WHERE a.user_id = auth.uid()
      UNION
      SELECT aal.athlete_id FROM public.athlete_auth_link aal WHERE aal.user_id = auth.uid()
    )
  );