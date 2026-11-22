
-- Professor ajusta o treino do dia -> notifica o aluno
CREATE OR REPLACE FUNCTION public.fn_notify_workout_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id UUID;
BEGIN
  IF NEW.changes_json IS DISTINCT FROM OLD.changes_json THEN
    v_user_id := public.fn_get_user_id_for_athlete(NEW.athlete_id);
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
      VALUES (v_user_id, 'workout_updated', 'Treino atualizado',
        'Seu professor fez um ajuste no treino de hoje', 'daily_workouts', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_workout_updated ON public.daily_workouts;
CREATE TRIGGER trg_notify_workout_updated
AFTER UPDATE ON public.daily_workouts
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_workout_updated();

-- Aluno conclui treino -> notifica o professor (coach_id em athletes)
CREATE OR REPLACE FUNCTION public.fn_notify_workout_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_coach_id UUID; v_athlete_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'completed' THEN
    SELECT coach_id, name INTO v_coach_id, v_athlete_name FROM public.athletes WHERE id = NEW.athlete_id;
    IF v_coach_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, related_table, related_id)
      VALUES (v_coach_id, 'workout_completed', 'Treino concluído',
        COALESCE(v_athlete_name, 'Aluno') || ' concluiu o treino de hoje', 'workout_executions', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_workout_completed ON public.workout_executions;
CREATE TRIGGER trg_notify_workout_completed
AFTER UPDATE ON public.workout_executions
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_workout_completed();
;
