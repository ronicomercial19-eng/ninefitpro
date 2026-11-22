-- Hybrid Staff/FitPro booking contract.
-- The FitPro appointment remains the source of truth for credits and ownership;
-- Staff API identifiers are stored for reconciliation with the external workflow.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS staff_professional_id text,
  ADD COLUMN IF NOT EXISTS staff_method_id text,
  ADD COLUMN IF NOT EXISTS staff_booking_id text,
  ADD COLUMN IF NOT EXISTS integration_status text NOT NULL DEFAULT 'not_sent';

CREATE INDEX IF NOT EXISTS idx_appointments_staff_booking_id
  ON public.appointments (staff_booking_id)
  WHERE staff_booking_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_create_staff_appointment(
  p_athlete_id uuid,
  p_teacher_id uuid,
  p_title text,
  p_scheduled_at timestamptz,
  p_duration integer DEFAULT 60,
  p_appointment_type text DEFAULT 'staff',
  p_notes text DEFAULT NULL,
  p_staff_professional_id text DEFAULT NULL,
  p_staff_method_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_credit public.student_credits%ROWTYPE;
  v_appointment public.appointments%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = p_athlete_id AND (
      a.user_id = v_uid OR EXISTS (
        SELECT 1 FROM public.athlete_auth_link aal
        WHERE aal.athlete_id = a.id AND aal.user_id = v_uid
      )
    )
  ) THEN
    RAISE EXCEPTION 'athlete_not_owned' USING ERRCODE = '42501';
  END IF;

  IF p_scheduled_at <= now() OR p_duration < 15 OR p_duration > 240 THEN
    RAISE EXCEPTION 'invalid_schedule';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.status IN ('scheduled'::appointment_status, 'confirmed'::appointment_status)
      AND (a.student_id = p_athlete_id OR (p_teacher_id IS NOT NULL AND a.teacher_id = p_teacher_id))
      AND a.scheduled_at < p_scheduled_at + make_interval(mins => p_duration)
      AND a.scheduled_at + make_interval(mins => COALESCE(a.duration, 60)) > p_scheduled_at
  ) THEN
    RAISE EXCEPTION 'schedule_conflict';
  END IF;

  SELECT * INTO v_credit
  FROM public.student_credits
  WHERE student_id = p_athlete_id
  FOR UPDATE;

  IF v_credit.id IS NULL OR (v_credit.total_credits - v_credit.used_credits) < 1 THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  UPDATE public.student_credits
  SET used_credits = used_credits + 1, updated_at = now()
  WHERE id = v_credit.id;

  INSERT INTO public.credit_transactions (athlete_id, amount, reason, metadata)
  VALUES (p_athlete_id, -1, 'staff_appointment_reserved', jsonb_build_object(
    'method_id', p_staff_method_id, 'professional_id', p_staff_professional_id
  ));

  INSERT INTO public.appointments (
    student_id, teacher_id, title, scheduled_at, duration, status,
    appointment_type, notes, staff_professional_id, staff_method_id, integration_status
  ) VALUES (
    p_athlete_id, p_teacher_id, p_title, p_scheduled_at, p_duration, 'scheduled',
    p_appointment_type, p_notes, p_staff_professional_id, p_staff_method_id, 'pending'
  ) RETURNING * INTO v_appointment;

  RETURN jsonb_build_object(
    'ok', true,
    'appointment_id', v_appointment.id,
    'credits_remaining', v_credit.total_credits - v_credit.used_credits - 1,
    'integration_status', 'pending'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_staff_appointment(uuid, uuid, text, timestamptz, integer, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_staff_appointment(uuid, uuid, text, timestamptz, integer, text, text, text, text) TO authenticated;
