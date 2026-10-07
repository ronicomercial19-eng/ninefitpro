-- O trigger legado de XP por treino concluído sobrescrevia athletes.level com uma fórmula própria (raiz quadrada de xp_total),
-- divergindo da fórmula oficial de fn_award_xp (total_xp/1000 + 1). Ele continua atualizando xp_total (legado), mas não toca mais em level.
DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.fn_award_xp_on_workout_completion()'::regprocedure) INTO d;
  IF d NOT LIKE '%sqrt(coalesce(xp_total,0) + xp_ganho)%' THEN RAISE EXCEPTION 'fn_award_xp_on_workout_completion fora do estado esperado'; END IF;
  d := replace(d, E',\n          level = greatest(1, floor(sqrt(coalesce(xp_total,0) + xp_ganho) / 10)::int + 1)', '');
  IF d LIKE '%sqrt(%' THEN RAISE EXCEPTION 'substituicao falhou'; END IF;
  EXECUTE d;
END
$mig$;
