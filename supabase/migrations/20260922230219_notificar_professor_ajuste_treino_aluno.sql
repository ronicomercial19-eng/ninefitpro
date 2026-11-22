
-- Espelho de fn_notify_workout_updated: quando o ALUNO (ou FitCopilot) ajusta o treino
-- do dia via fn_ajustar_treino_dia (tela "Ajuste de Treino" do FitPro), o PROFESSOR
-- precisa saber. Antes disso, o ajuste desaparecia no Smart Treino — o professor só
-- descobriria olhando manualmente. Solução enxuta: notifica o coach_id direto,
-- sem tabela nova, sem edge function, sem HTTP.

CREATE OR REPLACE FUNCTION public.fn_notify_coach_workout_adjusted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_coach_user_id uuid;
  v_athlete_name text;
BEGIN
  IF NEW.changes_json IS DISTINCT FROM OLD.changes_json THEN
    SELECT a.coach_id, a.name INTO v_coach_user_id, v_athlete_name
    FROM public.athletes a
    WHERE a.id = NEW.athlete_id;

    IF v_coach_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id, type, event_type, title, message, related_table, related_id, action_url
      ) VALUES (
        v_coach_user_id, 'info', 'aluno_ajustou_treino',
        'Aluno ajustou o treino',
        COALESCE(v_athlete_name, 'Um aluno') || ' alterou o treino de ' || NEW.workout_date::text,
        'daily_workouts', NEW.id,
        '/smart-treino-builder?athlete_id=' || NEW.athlete_id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_coach_workout_adjusted
  AFTER UPDATE ON public.daily_workouts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_coach_workout_adjusted();
;
