
CREATE OR REPLACE FUNCTION public.fn_create_staff_appointment(
  p_athlete_id uuid, p_teacher_id uuid, p_title text, p_scheduled_at timestamptz,
  p_duration integer DEFAULT 60, p_appointment_type text DEFAULT 'staff', p_notes text DEFAULT NULL,
  p_staff_professional_id text DEFAULT NULL, p_staff_method_id text DEFAULT NULL, p_makeup_for_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid(); v_coach uuid; v_teacher uuid; v_appt public.appointments%ROWTYPE;
  v_rem int; v_charged boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND (a.user_id = v_uid OR EXISTS (
        SELECT 1 FROM public.athlete_auth_link aal WHERE aal.athlete_id = a.id AND aal.user_id = v_uid))) THEN
    RAISE EXCEPTION 'athlete_not_owned' USING ERRCODE = '42501';
  END IF;
  IF p_appointment_type NOT IN ('aula','staff','consultoria','avaliacao_fisica') THEN
    RAISE EXCEPTION 'invalid_type';
  END IF;
  v_charged := p_appointment_type IN ('aula','staff');

  SELECT coach_id INTO v_coach FROM public.athletes WHERE id = p_athlete_id;
  -- profissional escolhido (se for um profissional ativo da plataforma), senão o coach do aluno
  IF p_teacher_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.profiles pr
        WHERE pr.user_id = p_teacher_id AND pr.is_active
          AND pr.role::text IN ('admin','super_admin','professor','trainer','nutritionist')) THEN
    v_teacher := p_teacher_id;
  ELSE
    v_teacher := v_coach;
  END IF;

  IF p_scheduled_at <= now() OR p_duration < 15 OR p_duration > 240 THEN RAISE EXCEPTION 'invalid_schedule'; END IF;
  IF EXISTS (SELECT 1 FROM public.appointments a
      WHERE a.status IN ('scheduled'::appointment_status,'confirmed'::appointment_status)
        AND (a.student_id = p_athlete_id OR (v_teacher IS NOT NULL AND a.teacher_id = v_teacher))
        AND a.scheduled_at < p_scheduled_at + make_interval(mins => p_duration)
        AND a.scheduled_at + make_interval(mins => COALESCE(a.duration,60)) > p_scheduled_at) THEN
    RAISE EXCEPTION 'schedule_conflict';
  END IF;
  IF v_charged AND NOT EXISTS (SELECT 1 FROM public.student_credits WHERE student_id = p_athlete_id AND total_credits - used_credits >= 1) THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  INSERT INTO public.appointments (student_id, teacher_id, title, scheduled_at, duration, status, appointment_type, notes,
      staff_professional_id, staff_method_id, integration_status, makeup_for_id)
  VALUES (p_athlete_id, v_teacher, COALESCE(NULLIF(p_title,''), 'Agendamento'), p_scheduled_at, p_duration, 'scheduled', p_appointment_type, p_notes,
      p_staff_professional_id, p_staff_method_id, 'not_sent', p_makeup_for_id)
  RETURNING * INTO v_appt;

  SELECT total_credits - used_credits INTO v_rem FROM public.student_credits WHERE student_id = p_athlete_id;
  RETURN jsonb_build_object('ok', true, 'appointment_id', v_appt.id, 'teacher_id', v_appt.teacher_id,
                            'credits_remaining', v_rem, 'credit_charged', v_appt.credit_charged,
                            'integration_status', v_appt.integration_status);
END $$;
REVOKE ALL ON FUNCTION public.fn_create_staff_appointment(uuid,uuid,text,timestamptz,integer,text,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_create_staff_appointment(uuid,uuid,text,timestamptz,integer,text,text,text,text,uuid) TO authenticated;

-- conector staff aponta pro Stevent (era um app Base44 antigo)
UPDATE public.api_connectors SET iframe_url = 'https://stevent.lovable.app/fitpro-staff', updated_at = now() WHERE key = 'staff';
;
