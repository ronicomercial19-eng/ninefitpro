-- Trigger: toda vez que um treino é marcado como concluído (ou atualizado),
-- recalcula automaticamente user_stats_agg para aquele atleta — elimina a
-- dependência de alguém chamar recalc_athlete_stats() manualmente, mesma
-- causa raiz que deixou os contadores zerados por semanas sem ninguém notar.

CREATE OR REPLACE FUNCTION public.trg_fn_recalc_athlete_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.athlete_id IS NOT NULL THEN
    PERFORM public.recalc_athlete_stats(NEW.athlete_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_recalc_stats_on_workout_execution ON public.workout_executions;
CREATE TRIGGER trg_recalc_stats_on_workout_execution
AFTER INSERT OR UPDATE OF status ON public.workout_executions
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_recalc_athlete_stats();

DROP TRIGGER IF EXISTS trg_recalc_stats_on_pr ON public.personal_records;
CREATE TRIGGER trg_recalc_stats_on_pr
AFTER INSERT ON public.personal_records
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_recalc_athlete_stats();;
