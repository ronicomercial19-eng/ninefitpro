
-- Guard: aluno pode transitar entre scheduled/confirmed/cancelled (só a partir de scheduled/confirmed)
CREATE OR REPLACE FUNCTION public.fn_appointments_guard_and_track()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_actor uuid := auth.uid(); v_role text; v_src public.appointments%ROWTYPE;
        v_type_charged boolean; v_has_credit boolean;
BEGIN
  IF current_setting('app.appt_internal', true) = '1' THEN RETURN NEW; END IF;
  v_role := public.fn_appt_actor_role(NEW.student_id, v_actor);
  v_type_charged := COALESCE(NEW.appointment_type,'') IN ('aula','staff');
  v_has_credit := EXISTS (SELECT 1 FROM public.student_credits WHERE student_id = NEW.student_id);

  IF TG_OP = 'INSERT' THEN
    IF v_role = 'student' THEN
      NEW.makeup_status := NULL; NEW.cancelled_at := NULL; NEW.cancelled_by := NULL; NEW.cancelled_by_role := NULL;
      NEW.credit_waived := false;
    END IF;
    NEW.credit_charged := false;
    IF NEW.makeup_for_id IS NOT NULL THEN
      SELECT * INTO v_src FROM public.appointments WHERE id = NEW.makeup_for_id;
      IF v_src.id IS NULL OR v_src.student_id <> NEW.student_id OR v_src.status <> 'cancelled' OR v_src.makeup_status IS DISTINCT FROM 'owed' THEN
        RAISE EXCEPTION 'makeup_not_owed' USING ERRCODE = '42501';
      END IF;
    END IF;
    IF v_role IN ('student','teacher') AND v_type_charged AND v_has_credit AND NOT NEW.credit_waived
       AND NEW.status IN ('scheduled','confirmed') THEN
      PERFORM public.fn_class_credit_debit(NEW.student_id, NEW.id, 'Aula agendada');
      NEW.credit_charged := true;
    END IF;
    RETURN NEW;
  END IF;

  IF v_role = 'student' THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
       OR NEW.integration_status IS DISTINCT FROM OLD.integration_status
       OR NEW.staff_professional_id IS DISTINCT FROM OLD.staff_professional_id
       OR NEW.staff_method_id IS DISTINCT FROM OLD.staff_method_id
       OR NEW.staff_booking_id IS DISTINCT FROM OLD.staff_booking_id
       OR NEW.makeup_status IS DISTINCT FROM OLD.makeup_status
       OR NEW.makeup_for_id IS DISTINCT FROM OLD.makeup_for_id
       OR NEW.credit_charged IS DISTINCT FROM OLD.credit_charged
       OR NEW.credit_waived IS DISTINCT FROM OLD.credit_waived
       OR NEW.gym_class_id IS DISTINCT FROM OLD.gym_class_id THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status NOT IN ('scheduled','confirmed') OR NEW.status NOT IN ('scheduled','confirmed','cancelled') THEN
        RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    NEW.cancelled_at := now(); NEW.cancelled_by := v_actor; NEW.cancelled_by_role := v_role;
    IF NEW.makeup_status IS NULL THEN
      NEW.makeup_status := CASE WHEN v_role = 'teacher' THEN 'owed' ELSE 'undecided' END;
    END IF;
  END IF;

  IF OLD.status = 'cancelled' AND NEW.status IN ('scheduled','confirmed') THEN
    IF OLD.makeup_status = 'done' THEN RAISE EXCEPTION 'makeup_already_used' USING ERRCODE = 'P0001'; END IF;
    NEW.cancelled_at := NULL; NEW.cancelled_by := NULL; NEW.cancelled_by_role := NULL; NEW.cancel_reason := NULL;
    NEW.makeup_status := NULL;
    IF NOT NEW.credit_charged AND v_type_charged AND v_has_credit AND NOT NEW.credit_waived THEN
      PERFORM public.fn_class_credit_debit(NEW.student_id, NEW.id, 'Cancelamento desfeito');
      NEW.credit_charged := true;
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND NEW.makeup_status = 'owed' AND OLD.makeup_status IS DISTINCT FROM 'owed' AND NEW.credit_charged THEN
    PERFORM public.fn_class_credit_refund(NEW.student_id, NEW.id, 'Crédito devolvido — reposição');
    NEW.credit_charged := false;
  ELSIF NEW.status = 'cancelled' AND OLD.makeup_status = 'owed' AND NEW.makeup_status IN ('not_owed','undecided')
        AND NOT NEW.credit_charged AND v_has_credit AND v_type_charged AND NOT NEW.credit_waived THEN
    PERFORM public.fn_class_credit_debit(NEW.student_id, NEW.id, 'Reposição revogada');
    NEW.credit_charged := true;
  END IF;

  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at AND NEW.status IN ('scheduled','confirmed') THEN
    NEW.reschedule_count := COALESCE(OLD.reschedule_count,0) + 1;
  END IF;
  RETURN NEW;
END $$;

-- Notificação: professor não recebe aviso das próprias ações
CREATE OR REPLACE FUNCTION public.fn_notify_appointment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_student_uid uuid; v_actor uuid := auth.uid(); v_by_student boolean;
BEGIN
  v_student_uid := public.fn_get_user_id_for_athlete(NEW.student_id);
  v_by_student := v_actor IS NOT NULL AND v_actor = v_student_uid;
  IF TG_OP = 'INSERT' THEN
    IF v_by_student THEN
      IF NEW.teacher_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id,'info','appointment_created','Novo agendamento de aluno',
          COALESCE(NEW.title,'Sessão')||' em '||to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM às HH24:MI'),'appointments',NEW.id);
      END IF;
    ELSIF v_student_uid IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_student_uid,'info','appointment_created','Novo agendamento',
        COALESCE(NEW.title,'Sessão')||' em '||to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM às HH24:MI'),'appointments',NEW.id);
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      IF v_by_student AND NEW.teacher_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id,'success','appointment_confirmed','Presença confirmada',COALESCE(NEW.title,'Agendamento')||' confirmado pelo aluno','appointments',NEW.id);
      ELSIF NOT v_by_student AND v_student_uid IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (v_student_uid,'success','appointment_confirmed','Aula confirmada',COALESCE(NEW.title,'Sua sessão')||' foi confirmada','appointments',NEW.id);
      END IF;
    ELSIF NEW.status = 'completed' AND NEW.teacher_id IS NOT NULL AND v_actor IS DISTINCT FROM NEW.teacher_id THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (NEW.teacher_id,'success','workout_completed','Sessão concluída',COALESCE(NEW.title,'Agendamento')||' marcado como concluído','appointments',NEW.id);
    ELSIF NEW.status = 'no_show' AND NEW.teacher_id IS NOT NULL AND v_actor IS DISTINCT FROM NEW.teacher_id THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (NEW.teacher_id,'warning','appointment_no_show','Aluno faltou',COALESCE(NEW.title,'Sessão')||' sem confirmação de presença','appointments',NEW.id);
    ELSIF NEW.status = 'cancelled' THEN
      IF v_student_uid IS NOT NULL AND NOT v_by_student THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (v_student_uid,'warning','appointment_cancelled','Agendamento cancelado',COALESCE(NEW.title,'Sua sessão')||' foi cancelada','appointments',NEW.id);
      END IF;
      IF NEW.teacher_id IS NOT NULL AND v_actor IS DISTINCT FROM NEW.teacher_id THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id,'warning','appointment_cancelled','Agendamento cancelado',COALESCE(NEW.title,'Sessão')||' foi cancelada','appointments',NEW.id);
      END IF;
    END IF;
  ELSIF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at AND NEW.status IN ('scheduled','confirmed') THEN
    IF v_by_student AND NEW.teacher_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (NEW.teacher_id,'info','appointment_rescheduled','Aluno remarcou',COALESCE(NEW.title,'Sessão')||' para '||to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM às HH24:MI'),'appointments',NEW.id);
    ELSIF NOT v_by_student AND v_student_uid IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_student_uid,'info','appointment_rescheduled','Aula remarcada',COALESCE(NEW.title,'Sua sessão')||' agora é '||to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM às HH24:MI'),'appointments',NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Remarcar com checagem de conflito (aluno dono, professor do agendamento ou trainer)
CREATE OR REPLACE FUNCTION public.fn_reschedule_appointment(p_id uuid, p_new_at timestamptz, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); a public.appointments%ROWTYPE; v_role text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO a FROM public.appointments WHERE id = p_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  v_role := public.fn_appt_actor_role(a.student_id, v_uid);
  IF NOT (v_role = 'student' AND EXISTS (SELECT 1 FROM public.athletes x WHERE x.id = a.student_id AND x.user_id = v_uid)
          OR v_role = 'student' AND EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = a.student_id AND l.user_id = v_uid)
          OR a.teacher_id = v_uid OR public.is_trainer(v_uid)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF a.status NOT IN ('scheduled','confirmed') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  IF p_new_at <= now() THEN RAISE EXCEPTION 'invalid_schedule'; END IF;
  IF EXISTS (SELECT 1 FROM public.appointments o
      WHERE o.id <> a.id AND o.status IN ('scheduled','confirmed')
        AND (o.student_id = a.student_id OR (a.teacher_id IS NOT NULL AND o.teacher_id = a.teacher_id))
        AND o.scheduled_at < p_new_at + make_interval(mins => COALESCE(a.duration,60))
        AND o.scheduled_at + make_interval(mins => COALESCE(o.duration,60)) > p_new_at) THEN
    RAISE EXCEPTION 'schedule_conflict';
  END IF;
  UPDATE public.appointments SET scheduled_at = p_new_at, status = 'scheduled', confirmed_at = NULL, updated_at = now() WHERE id = a.id;
  IF p_reason IS NOT NULL THEN
    UPDATE public.appointment_events SET reason = p_reason
     WHERE id = (SELECT id FROM public.appointment_events WHERE appointment_id = a.id AND event_type = 'rescheduled' ORDER BY created_at DESC LIMIT 1);
  END IF;
  RETURN jsonb_build_object('ok', true, 'appointment_id', a.id, 'scheduled_at', p_new_at);
END $$;
REVOKE ALL ON FUNCTION public.fn_reschedule_appointment(uuid,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_reschedule_appointment(uuid,timestamptz,text) TO authenticated;

-- Baixa em lote (professor)
CREATE OR REPLACE FUNCTION public.fn_close_appointments(p_ids uuid[], p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); n int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('completed','no_show') THEN RAISE EXCEPTION 'invalid_status'; END IF;
  UPDATE public.appointments SET status = p_status::appointment_status, updated_at = now()
   WHERE id = ANY(p_ids) AND status IN ('scheduled','confirmed') AND (teacher_id = v_uid OR public.is_trainer(v_uid));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'updated', n);
END $$;
REVOKE ALL ON FUNCTION public.fn_close_appointments(uuid[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_close_appointments(uuid[],text) TO authenticated;
;
