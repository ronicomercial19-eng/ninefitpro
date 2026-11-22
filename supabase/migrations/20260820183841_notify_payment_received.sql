
CREATE OR REPLACE FUNCTION public.fn_notify_payment_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_coach_id UUID; v_student_user_id UUID; v_athlete_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'paid' THEN
    SELECT coach_id, name INTO v_coach_id, v_athlete_name FROM public.athletes WHERE id = NEW.student_id;
    v_student_user_id := public.fn_get_user_id_for_athlete(NEW.student_id);

    IF v_coach_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
      VALUES (v_coach_id, 'payment_received', 'Pagamento recebido',
        COALESCE(v_athlete_name, 'Aluno') || ' pagou R$ ' || NEW.amount::text, 'payments', NEW.id);
    END IF;

    IF v_student_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
      VALUES (v_student_user_id, 'payment_received', 'Pagamento confirmado',
        'Recebemos seu pagamento de R$ ' || NEW.amount::text, 'payments', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_payment_received ON public.payments;
CREATE TRIGGER trg_notify_payment_received
AFTER UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_payment_received();
;
