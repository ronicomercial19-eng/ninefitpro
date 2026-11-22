
-- FIX QA Master #3: "Sync 64% vs 0%" para o mesmo atleta em telas diferentes.
--
-- Causa raiz: duas RPCs/fontes divergentes.
--   1) calcular_sync_score_real() -> grava em athletes.sync_score (fonte viva,
--      mantida por trigger a cada treino/checkin) -> usada por useProactiveRon.ts
--   2) get_athlete_scores() -> lia de aluno_score_composite (0 linhas, tabela
--      morta, nunca populada) -> caía sempre no fallback via vw_radar_5d,
--      um cálculo diferente -> usada por useAthleteScores.ts
--
-- Fix: get_athlete_scores() agora lê athletes.sync_score como fonte única de
-- verdade (mesma que o trigger fn_log_sync_score_event mantém atualizada),
-- mantendo o breakdown por eixo do radar 5D apenas para exibição.
CREATE OR REPLACE FUNCTION public.get_athlete_scores(p_athlete_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_radar record;
  v_sync numeric := 0;
  v_updated timestamptz := now();
BEGIN
  SELECT eixo_treino, eixo_nutri, eixo_sono, eixo_recovery, eixo_hrv
    INTO v_radar
    FROM public.vw_radar_5d
   WHERE athlete_id = p_athlete_id;

  -- FONTE ÚNICA: athletes.sync_score (calculado por calcular_sync_score_real,
  -- atualizado via trigger em todo workout_execution/checkin)
  SELECT sync_score, now()
    INTO v_sync, v_updated
    FROM public.athletes
   WHERE id = p_athlete_id;

  RETURN jsonb_build_object(
    'sync_score', COALESCE(v_sync, 0),
    'treino',     COALESCE(LEAST(v_radar.eixo_treino * 25, 100), 0),
    'nutri',      COALESCE(LEAST(v_radar.eixo_nutri * 5,  100), 0),
    'sono',       COALESCE(v_radar.eixo_sono, 0),
    'mob',        COALESCE(v_radar.eixo_recovery, 0),
    'hidr',       COALESCE(v_radar.eixo_hrv, 0),
    'updated_at', v_updated
  );
END;
$function$;
;
