
-- Self-service scheduling enhancements
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_appointments_student_scheduled
  ON public.appointments(student_id, scheduled_at DESC);

-- Plan capacity
ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS classes_per_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_period_start date DEFAULT date_trunc('month', now())::date,
  ADD COLUMN IF NOT EXISTS current_period_end date DEFAULT (date_trunc('month', now()) + interval '1 month - 1 day')::date;

-- Allow students to update their own appointments to confirm/cancel (not just scheduled)
DROP POLICY IF EXISTS "Students can update own appointments" ON public.appointments;
CREATE POLICY "Students can update own appointments"
ON public.appointments
FOR UPDATE
USING (
  student_id IN (
    SELECT a.id FROM athletes a WHERE a.user_id = auth.uid()
    UNION
    SELECT aal.athlete_id FROM athlete_auth_link aal WHERE aal.user_id = auth.uid()
  )
)
WITH CHECK (
  student_id IN (
    SELECT a.id FROM athletes a WHERE a.user_id = auth.uid()
    UNION
    SELECT aal.athlete_id FROM athlete_auth_link aal WHERE aal.user_id = auth.uid()
  )
);

-- Reconcile expired appointments: mark scheduled past as no_show, confirmed past as completed
CREATE OR REPLACE FUNCTION public.reconcile_appointments_for_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- mark completed: confirmed and finished (>30 min after start)
  UPDATE public.appointments
    SET status = 'completed'::appointment_status, updated_at = now()
    WHERE status = 'confirmed'::appointment_status
      AND scheduled_at + (COALESCE(duration,60) || ' minutes')::interval + interval '30 minutes' < now()
      AND student_id IN (
        SELECT a.id FROM athletes a WHERE a.user_id = v_uid
        UNION SELECT aal.athlete_id FROM athlete_auth_link aal WHERE aal.user_id = v_uid
      );

  -- mark no_show: scheduled but never confirmed and past start + 30 min
  UPDATE public.appointments
    SET status = 'no_show'::appointment_status, updated_at = now()
    WHERE status = 'scheduled'::appointment_status
      AND scheduled_at + interval '30 minutes' < now()
      AND student_id IN (
        SELECT a.id FROM athletes a WHERE a.user_id = v_uid
        UNION SELECT aal.athlete_id FROM athlete_auth_link aal WHERE aal.user_id = v_uid
      );
END;
$$;
