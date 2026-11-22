
-- 1) Novo treino/periodização atribuído ao aluno -> notifica o aluno
CREATE OR REPLACE FUNCTION public.fn_notify_training_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.student_id);
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
    VALUES (v_user_id, 'training_assigned', 'Novo treino disponível',
      COALESCE(NEW.training_name, 'Um novo treino') || ' foi liberado pra você', 'student_training_assignments', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_training_assigned ON public.student_training_assignments;
CREATE TRIGGER trg_notify_training_assigned
AFTER INSERT ON public.student_training_assignments
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_training_assigned();

-- 2) Feedback do aluno num protocolo -> notifica o professor/coach responsável
CREATE OR REPLACE FUNCTION public.fn_notify_protocol_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_coach_id UUID; v_athlete_name TEXT;
BEGIN
  SELECT coach_id, name INTO v_coach_id, v_athlete_name FROM public.athletes WHERE id = NEW.athlete_id;
  IF v_coach_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
    VALUES (v_coach_id, 'protocol_feedback', 'Novo feedback de protocolo',
      COALESCE(v_athlete_name, 'Aluno') || ' enviou feedback sobre o protocolo', 'protocol_feedback', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_protocol_feedback ON public.protocol_feedback;
CREATE TRIGGER trg_notify_protocol_feedback
AFTER INSERT ON public.protocol_feedback
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_protocol_feedback();

-- 3) Relato de dor com bandeira vermelha -> notifica TODO staff (admin/trainer) com urgência
CREATE OR REPLACE FUNCTION public.fn_notify_pain_red_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_athlete_name TEXT; v_staff RECORD;
BEGIN
  IF NEW.is_red_flag IS TRUE THEN
    SELECT name INTO v_athlete_name FROM public.athletes WHERE id = NEW.athlete_id;
    FOR v_staff IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin','trainer')
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
      VALUES (v_staff.user_id, 'pain_red_flag', '⚠️ Alerta de dor (bandeira vermelha)',
        COALESCE(v_athlete_name, 'Um aluno') || ' reportou sintoma que precisa de atenção imediata', 'pain_reports', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_pain_red_flag ON public.pain_reports;
CREATE TRIGGER trg_notify_pain_red_flag
AFTER INSERT ON public.pain_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_pain_red_flag();

-- 4) Avaliação física concluída -> notifica o aluno
CREATE OR REPLACE FUNCTION public.fn_notify_avaliacao_pronta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  IF NEW.aluno_id IS NOT NULL THEN
    v_user_id := public.fn_get_user_id_for_athlete(NEW.aluno_id);
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
      VALUES (v_user_id, 'avaliacao_pronta', 'Nova avaliação registrada',
        'Sua avaliação física foi registrada. Confira seus resultados.', 'avaliacoes_unificadas', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_avaliacao_pronta ON public.avaliacoes_unificadas;
CREATE TRIGGER trg_notify_avaliacao_pronta
AFTER INSERT ON public.avaliacoes_unificadas
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_avaliacao_pronta();

-- 5) Novo plano de créditos/plano ativado -> notifica o aluno (mesmo mecanismo do user_plans)
CREATE OR REPLACE FUNCTION public.fn_notify_plan_activated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  IF NEW.is_active IS TRUE THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = NEW.user_email;
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
      VALUES (v_user_id, 'plan_activated', 'Plano ativado',
        'Seu plano foi ativado/atualizado.', 'user_plans', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_plan_activated ON public.user_plans;
CREATE TRIGGER trg_notify_plan_activated
AFTER INSERT ON public.user_plans
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_plan_activated();
;
