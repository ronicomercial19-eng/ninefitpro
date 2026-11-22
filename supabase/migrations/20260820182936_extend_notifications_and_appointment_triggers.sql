
-- Estende a tabela notifications existente com o que falta pra rastrear a origem
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_table TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id UUID;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem suas próprias notificações" ON public.notifications;
CREATE POLICY "Usuários veem suas próprias notificações"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários marcam suas notificações como lidas" ON public.notifications;
CREATE POLICY "Usuários marcam suas notificações como lidas"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sistema insere notificações" ON public.notifications;
CREATE POLICY "Sistema insere notificações"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Web Push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários gerenciam suas subscriptions" ON public.push_subscriptions;
CREATE POLICY "Usuários gerenciam suas subscriptions"
ON public.push_subscriptions FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper: resolve auth user_id de um athlete_id
CREATE OR REPLACE FUNCTION public.fn_get_user_id_for_athlete(p_athlete_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM public.athletes WHERE id = p_athlete_id;
  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id FROM public.athlete_auth_link WHERE athlete_id = p_athlete_id;
  END IF;
  RETURN v_user_id;
END;
$$;

-- Trigger: notifica em cima de mudanças em appointments
CREATE OR REPLACE FUNCTION public.fn_notify_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_user_id UUID;
BEGIN
  v_student_user_id := public.fn_get_user_id_for_athlete(NEW.student_id);

  IF TG_OP = 'INSERT' THEN
    IF v_student_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
      VALUES (v_student_user_id, 'appointment_created', 'Novo agendamento',
        COALESCE(NEW.title,'Sessão') || ' em ' || to_char(NEW.scheduled_at, 'DD/MM às HH24:MI'), 'appointments', NEW.id);
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
    ELSIF NEW.status = 'cancelled' THEN
      IF v_student_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
        VALUES (v_student_user_id, 'appointment_cancelled', 'Agendamento cancelado',
          COALESCE(NEW.title, 'Sua sessão') || ' foi cancelada', 'appointments', NEW.id);
      END IF;
      IF NEW.teacher_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id, 'appointment_cancelled', 'Agendamento cancelado',
          COALESCE(NEW.title, 'Sessão') || ' foi cancelada', 'appointments', NEW.id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_appointment_change ON public.appointments;
CREATE TRIGGER trg_notify_appointment_change
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_appointment_change();
;
