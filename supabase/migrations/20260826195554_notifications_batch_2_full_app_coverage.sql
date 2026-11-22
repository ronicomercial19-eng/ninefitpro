
-- 1) Movimentação de crédito (extrato) -> notifica o aluno
CREATE OR REPLACE FUNCTION public.fn_notify_credit_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.athlete_id);
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
    VALUES (v_user_id, 'credit_transaction',
      CASE WHEN NEW.amount > 0 THEN 'Créditos adicionados' ELSE 'Crédito utilizado' END,
      COALESCE(NEW.reason, 'Movimentação de crédito') || ' (' || NEW.amount || ')',
      'credit_transactions', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_credit_transaction ON public.credit_transactions;
CREATE TRIGGER trg_notify_credit_transaction
AFTER INSERT ON public.credit_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_credit_transaction();

-- 2) Nova dieta atribuída -> notifica o aluno
CREATE OR REPLACE FUNCTION public.fn_notify_diet_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.student_id);
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
    VALUES (v_user_id, 'diet_assigned', 'Nova dieta disponível',
      COALESCE(NEW.diet_name, 'Um novo plano alimentar') || ' foi liberado pra você', 'student_diet_assignments', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_diet_assigned ON public.student_diet_assignments;
CREATE TRIGGER trg_notify_diet_assigned
AFTER INSERT ON public.student_diet_assignments
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_diet_assigned();

-- 3) Nova periodização atribuída -> notifica o aluno
CREATE OR REPLACE FUNCTION public.fn_notify_periodization_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.athlete_id);
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
    VALUES (v_user_id, 'periodization_assigned', 'Nova periodização atribuída',
      'Seu professor definiu uma nova periodização de treino pra você', 'athlete_periodizations', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_periodization_assigned ON public.athlete_periodizations;
CREATE TRIGGER trg_notify_periodization_assigned
AFTER INSERT ON public.athlete_periodizations
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_periodization_assigned();

-- 4) Novo conteúdo de biblioteca atribuído -> notifica o aluno
CREATE OR REPLACE FUNCTION public.fn_notify_library_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.athlete_id);
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
    VALUES (v_user_id, 'library_assigned', 'Novo conteúdo pra você',
      COALESCE(NEW.content_title, 'Um novo conteúdo') || ' foi atribuído pelo seu professor', 'student_library_assignments', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_library_assigned ON public.student_library_assignments;
CREATE TRIGGER trg_notify_library_assigned
AFTER INSERT ON public.student_library_assignments
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_library_assigned();

-- 5) Pedido de férias/pausa: aluno pede -> notifica staff; staff decide -> notifica aluno
CREATE OR REPLACE FUNCTION public.fn_notify_vacation_request()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id UUID; v_athlete_name TEXT; v_staff RECORD;
BEGIN
  v_user_id := public.fn_get_user_id_for_athlete(NEW.student_id);
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_athlete_name FROM public.athletes WHERE id = NEW.student_id;
    FOR v_staff IN SELECT user_id FROM public.user_roles WHERE role IN ('admin','super_admin','trainer')
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
      VALUES (v_staff.user_id, 'vacation_requested', 'Pedido de pausa/férias',
        COALESCE(v_athlete_name, 'Um aluno') || ' solicitou pausa/férias', 'vacation_requests', NEW.id);
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND v_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
    VALUES (v_user_id, 'vacation_status', 'Pedido de pausa/férias atualizado',
      'Seu pedido foi ' || CASE WHEN NEW.status = 'approved' THEN 'aprovado' WHEN NEW.status = 'rejected' THEN 'recusado' ELSE NEW.status END,
      'vacation_requests', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_vacation_request ON public.vacation_requests;
CREATE TRIGGER trg_notify_vacation_request
AFTER INSERT OR UPDATE ON public.vacation_requests
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_vacation_request();
;
