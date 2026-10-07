-- Sync score: a calibração diária agora conta humor, motivação, alimentação e dor (invertida); antes só sono/energia/alimentação.
-- Campos nulos são ignorados (antes alimentação nula virava 3). Data do check-in em horário de São Paulo (antes CURRENT_DATE/UTC).
-- Aplica por substituição sobre o estado atual e aborta se o estado for outro.
DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.calcular_sync_score_real(uuid)'::regprocedure) INTO d;
  IF d NOT LIKE '%AVG((COALESCE(sono,3) + COALESCE(energia,3) + COALESCE(alimentacao,3)) / 3.0)%' THEN RAISE EXCEPTION 'calcular_sync_score_real fora do estado esperado'; END IF;
  d := replace(d, 'EXISTS(SELECT 1 FROM daily_checkins WHERE athlete_id = p_athlete_id AND checkin_date = CURRENT_DATE)', 'EXISTS(SELECT 1 FROM daily_checkins WHERE athlete_id = p_athlete_id AND checkin_date = (now() AT TIME ZONE ''America/Sao_Paulo'')::date)');
  d := replace(d, 'AVG((COALESCE(sono,3) + COALESCE(energia,3) + COALESCE(alimentacao,3)) / 3.0)', 'AVG((SELECT avg(v) FROM unnest(ARRAY[sono, energia, humor, motivacao, alimentacao, CASE WHEN dor IS NOT NULL THEN 6 - dor END]) AS v))');
  d := replace(d, 'AND checkin_date >= CURRENT_DATE - 7;', 'AND checkin_date >= (now() AT TIME ZONE ''America/Sao_Paulo'')::date - 7;');
  IF d NOT LIKE '%motivacao, alimentacao%' OR d LIKE '%CURRENT_DATE%' THEN RAISE EXCEPTION 'substituicao falhou'; END IF;
  EXECUTE d;
END
$mig$;
