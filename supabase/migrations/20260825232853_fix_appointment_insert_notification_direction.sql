
CREATE OR REPLACE FUNCTION public.fn_notify_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_user_id UUID;
  v_actor UUID := auth.uid();
BEGIN
  v_student_user_id := public.fn_get_user_id_for_athlete(NEW.student_id);

  IF TG_OP = 'INSERT' THEN
    IF v_actor IS NOT NULL AND v_actor = v_student_user_id THEN
      -- Aluno agendou (Aulas/AulasCreditos/Staff) -> avisa o professor que precisa confirmar/olhar
      IF NEW.teacher_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id, 'appointment_created', 'Novo agendamento de aluno',
          COALESCE(NEW.title, 'Sessão') || ' em ' || to_char(NEW.scheduled_at, 'DD/MM às HH24:MI'), 'appointments', NEW.id);
      END IF;
    ELSE
      -- Professor/staff agendou pelo aluno -> avisa o aluno
      IF v_student_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
        VALUES (v_student_user_id, 'appointment_created', 'Novo agendamento',
          COALESCE(NEW.title,'Sessão') || ' em ' || to_char(NEW.scheduled_at, 'DD/MM às HH24:MI'), 'appointments', NEW.id);
      END IF;
    END IF;

  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' AND NEW.teacher_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
      VALUES (NEW.teacher_id, 'appointment_confirmed', 'Presença confirmada',
        COALESCE(NEW.title, 'Agendamento') || ' confirmado pelo aluno', 'appointments', NEW.id);
    ELSIF NEW.status = 'completed' AND NEW.teacher_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
      VALUES (NEW.teacher_id, 'workout_completed', 'Sessão concluída',
        COALESCE(NEW.title, 'Agendamento') || ' marcado como concluído', 'appointments', NEW.id);
    ELSIF NEW.status = 'no_show' THEN
      IF NEW.teacher_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id, 'appointment_no_show', 'Aluno faltou',
          COALESCE(NEW.title, 'Sessão') || ' sem confirmação de presença', 'appointments', NEW.id);
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF v_student_user_id IS NOT NULL AND v_actor != v_student_user_id THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
        VALUES (v_student_user_id, 'appointment_cancelled', 'Agendamento cancelado',
          COALESCE(NEW.title, 'Sua sessão') || ' foi cancelada', 'appointments', NEW.id);
      END IF;
      IF NEW.teacher_id IS NOT NULL AND (v_actor IS NULL OR v_actor != NEW.teacher_id) THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id, 'appointment_cancelled', 'Agendamento cancelado',
          COALESCE(NEW.title, 'Sessão') || ' foi cancelada', 'appointments', NEW.id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
;
