
-- Preserva o tipo específico do evento numa coluna livre; 'type' vira só a severidade (enum válido)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_type TEXT;

-- ===== APPOINTMENTS =====
CREATE OR REPLACE FUNCTION public.fn_notify_appointment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_student_user_id UUID; v_actor UUID := auth.uid();
BEGIN
  v_student_user_id := public.fn_get_user_id_for_athlete(NEW.student_id);
  IF TG_OP = 'INSERT' THEN
    IF v_actor IS NOT NULL AND v_actor = v_student_user_id THEN
      IF NEW.teacher_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id, 'info', 'appointment_created', 'Novo agendamento de aluno',
          COALESCE(NEW.title, 'Sessão') || ' em ' || to_char(NEW.scheduled_at, 'DD/MM às HH24:MI'), 'appointments', NEW.id);
      END IF;
    ELSE
      IF v_student_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (v_student_user_id, 'info', 'appointment_created', 'Novo agendamento',
          COALESCE(NEW.title,'Sessão') || ' em ' || to_char(NEW.scheduled_at, 'DD/MM às HH24:MI'), 'appointments', NEW.id);
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' AND NEW.teacher_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (NEW.teacher_id, 'success', 'appointment_confirmed', 'Presença confirmada',
        COALESCE(NEW.title, 'Agendamento') || ' confirmado pelo aluno', 'appointments', NEW.id);
    ELSIF NEW.status = 'completed' AND NEW.teacher_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (NEW.teacher_id, 'success', 'workout_completed', 'Sessão concluída',
        COALESCE(NEW.title, 'Agendamento') || ' marcado como concluído', 'appointments', NEW.id);
    ELSIF NEW.status = 'no_show' THEN
      IF NEW.teacher_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id, 'warning', 'appointment_no_show', 'Aluno faltou',
          COALESCE(NEW.title, 'Sessão') || ' sem confirmação de presença', 'appointments', NEW.id);
      END IF;
    ELSIF NEW.status = 'cancelled' THEN
      IF v_student_user_id IS NOT NULL AND v_actor != v_student_user_id THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (v_student_user_id, 'warning', 'appointment_cancelled', 'Agendamento cancelado',
          COALESCE(NEW.title, 'Sua sessão') || ' foi cancelada', 'appointments', NEW.id);
      END IF;
      IF NEW.teacher_id IS NOT NULL AND (v_actor IS NULL OR v_actor != NEW.teacher_id) THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id, 'warning', 'appointment_cancelled', 'Agendamento cancelado',
          COALESCE(NEW.title, 'Sessão') || ' foi cancelada', 'appointments', NEW.id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ===== WORKOUT UPDATED (professor edita treino do dia) =====
CREATE OR REPLACE FUNCTION public.fn_notify_workout_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID;
BEGIN
  IF NEW.changes_json IS DISTINCT FROM OLD.changes_json THEN
    v_user_id := public.fn_get_user_id_for_athlete(NEW.athlete_id);
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_user_id, 'info', 'workout_updated', 'Treino atualizado', 'Seu professor fez um ajuste no treino de hoje', 'daily_workouts', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ===== WORKOUT COMPLETED =====
CREATE OR REPLACE FUNCTION public.fn_notify_workout_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_coach_id UUID; v_athlete_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'completed' THEN
    SELECT coach_id, name INTO v_coach_id, v_athlete_name FROM public.athletes WHERE id = NEW.athlete_id;
    IF v_coach_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_coach_id, 'success', 'workout_completed', 'Treino concluído', COALESCE(v_athlete_name, 'Aluno') || ' concluiu o treino de hoje', 'workout_executions', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ===== PAYMENT =====
CREATE OR REPLACE FUNCTION public.fn_notify_payment_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_coach_id UUID; v_student_user_id UUID; v_athlete_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'paid' THEN
    SELECT coach_id, name INTO v_coach_id, v_athlete_name FROM public.athletes WHERE id = NEW.student_id;
    v_student_user_id := public.fn_get_user_id_for_athlete(NEW.student_id);
    IF v_coach_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_coach_id, 'success', 'payment_received', 'Pagamento recebido', COALESCE(v_athlete_name, 'Aluno') || ' pagou R$ ' || NEW.amount::text, 'payments', NEW.id);
    END IF;
    IF v_student_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_student_user_id, 'success', 'payment_received', 'Pagamento confirmado', 'Recebemos seu pagamento de R$ ' || NEW.amount::text, 'payments', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ===== TRAINING ASSIGNED =====
CREATE OR REPLACE FUNCTION public.fn_notify_training_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.student_id);
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
    VALUES (v_user_id, 'info', 'training_assigned', 'Novo treino disponível', COALESCE(NEW.training_name, 'Um novo treino') || ' foi liberado pra você', 'student_training_assignments', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ===== PROTOCOL FEEDBACK =====
CREATE OR REPLACE FUNCTION public.fn_notify_protocol_feedback()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_coach_id UUID; v_athlete_name TEXT;
BEGIN
  SELECT coach_id, name INTO v_coach_id, v_athlete_name FROM public.athletes WHERE id = NEW.athlete_id;
  IF v_coach_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
    VALUES (v_coach_id, 'info', 'protocol_feedback', 'Novo feedback de protocolo', COALESCE(v_athlete_name, 'Aluno') || ' enviou feedback sobre o protocolo', 'protocol_feedback', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ===== PAIN RED FLAG =====
CREATE OR REPLACE FUNCTION public.fn_notify_pain_red_flag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_athlete_name TEXT; v_staff RECORD;
BEGIN
  IF NEW.is_red_flag IS TRUE THEN
    SELECT name INTO v_athlete_name FROM public.athletes WHERE id = NEW.athlete_id;
    FOR v_staff IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin','trainer') LOOP
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_staff.user_id, 'error', 'pain_red_flag', '⚠️ Alerta de dor (bandeira vermelha)', COALESCE(v_athlete_name, 'Um aluno') || ' reportou sintoma que precisa de atenção imediata', 'pain_reports', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- ===== AVALIAÇÃO =====
CREATE OR REPLACE FUNCTION public.fn_notify_avaliacao_pronta()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID;
BEGIN
  IF NEW.aluno_id IS NOT NULL THEN
    v_user_id := public.fn_get_user_id_for_athlete(NEW.aluno_id);
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_user_id, 'info', 'avaliacao_pronta', 'Nova avaliação registrada', 'Sua avaliação física foi registrada. Confira seus resultados.', 'avaliacoes_unificadas', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ===== PLAN ACTIVATED =====
CREATE OR REPLACE FUNCTION public.fn_notify_plan_activated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID;
BEGIN
  IF NEW.is_active IS TRUE THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = NEW.user_email;
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_user_id, 'success', 'plan_activated', 'Plano ativado', 'Seu plano foi ativado/atualizado.', 'user_plans', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ===== CREDIT TRANSACTION =====
CREATE OR REPLACE FUNCTION public.fn_notify_credit_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.athlete_id);
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
    VALUES (v_user_id, CASE WHEN NEW.amount > 0 THEN 'success' ELSE 'info' END, 'credit_transaction',
      CASE WHEN NEW.amount > 0 THEN 'Créditos adicionados' ELSE 'Crédito utilizado' END,
      COALESCE(NEW.reason, 'Movimentação de crédito') || ' (' || NEW.amount || ')', 'credit_transactions', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ===== DIET ASSIGNED =====
CREATE OR REPLACE FUNCTION public.fn_notify_diet_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.student_id);
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
    VALUES (v_user_id, 'info', 'diet_assigned', 'Nova dieta disponível', COALESCE(NEW.diet_name, 'Um novo plano alimentar') || ' foi liberado pra você', 'student_diet_assignments', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ===== PERIODIZATION ASSIGNED =====
CREATE OR REPLACE FUNCTION public.fn_notify_periodization_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.athlete_id);
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
    VALUES (v_user_id, 'info', 'periodization_assigned', 'Nova periodização atribuída', 'Seu professor definiu uma nova periodização de treino pra você', 'athlete_periodizations', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ===== LIBRARY ASSIGNED =====
CREATE OR REPLACE FUNCTION public.fn_notify_library_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.athlete_id);
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
    VALUES (v_user_id, 'info', 'library_assigned', 'Novo conteúdo pra você', COALESCE(NEW.content_title, 'Um novo conteúdo') || ' foi atribuído pelo seu professor', 'student_library_assignments', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ===== VACATION REQUEST =====
CREATE OR REPLACE FUNCTION public.fn_notify_vacation_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID; v_athlete_name TEXT; v_staff RECORD;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.student_id);
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_athlete_name FROM public.athletes WHERE id = NEW.student_id;
    FOR v_staff IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin','trainer') LOOP
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_staff.user_id, 'info', 'vacation_requested', 'Pedido de pausa/férias', COALESCE(v_athlete_name, 'Um aluno') || ' solicitou pausa/férias', 'vacation_requests', NEW.id);
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
    VALUES (v_user_id, CASE WHEN NEW.status='approved' THEN 'success' WHEN NEW.status='rejected' THEN 'warning' ELSE 'info' END,
      'vacation_status', 'Pedido de pausa/férias atualizado',
      'Seu pedido foi ' || CASE WHEN NEW.status = 'approved' THEN 'aprovado' WHEN NEW.status = 'rejected' THEN 'recusado' ELSE NEW.status END,
      'vacation_requests', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
;
