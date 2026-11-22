-- Corrige trg_recalc_stats_on_treino, que ainda chamava recalc_user_stats
-- (função antiga, presa a treinos_realizados/aluno_id — quebrada desde que
-- user_stats_agg passou a ter athlete_id como PK). Passa a resolver
-- athlete_id corretamente e chamar a função nova recalc_athlete_stats.

CREATE OR REPLACE FUNCTION public.trg_recalc_stats_on_treino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_athlete_id uuid;
BEGIN
  v_athlete_id := COALESCE(NEW.athlete_id, OLD.athlete_id);
  IF v_athlete_id IS NOT NULL THEN
    PERFORM public.recalc_athlete_stats(v_athlete_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;;
