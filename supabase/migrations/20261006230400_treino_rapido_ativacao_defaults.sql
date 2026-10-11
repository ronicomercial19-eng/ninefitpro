-- Treino rápido x Ativação: Ativacao.tsx chamava fn_treino_rapido com p_equipamento=null e p_tempo_min=40,
-- e as duas coisas eram rejeitadas (a geração da ativação nunca saiu do fallback/erro).
--  1) p_equipamento NULL passa a significar kit básico (peso corporal + halteres + elástico).
--  2) p_tempo_min é normalizado para o valor permitido mais próximo (15/20/30/45/60); fora de 10-75 continua inválido.
--  3) payload devolve sets_default / reps_default / rest_default_seconds (Ativacao.tsx já lê esses campos).
-- Aplica por substituição sobre o estado da migration 20261006230200 e aborta se o estado for outro.
DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.fn_treino_rapido(uuid,text,integer,text)'::regprocedure) INTO d;
  IF d NOT LIKE '%p_tempo_min NOT IN (15,20,30,45,60)%' THEN RAISE EXCEPTION 'fn_treino_rapido fora do estado esperado'; END IF;
  d := replace(d, E'    WHEN v_new THEN string_to_array(substr(p_equipamento,11),'','')\n', E'    WHEN v_new THEN string_to_array(substr(p_equipamento,11),'','')\n    WHEN p_equipamento IS NULL THEN ARRAY[''bodyweight'',''dumbbells'',''bands'']\n');
  d := replace(d, 'p_tempo_min IS NULL OR p_tempo_min NOT IN (15,20,30,45,60)', 'v_tempo IS NULL');
  d := replace(d, E'  v_exercises json;\nBEGIN', E'  v_exercises json;\n  v_tempo integer := CASE WHEN p_tempo_min BETWEEN 10 AND 75 THEN (SELECT t FROM unnest(ARRAY[15,20,30,45,60]) t ORDER BY abs(t-p_tempo_min), t LIMIT 1) END;\nBEGIN');
  d := replace(d, 'floor((p_tempo_min-3)', 'floor((v_tempo-3)');
  d := replace(d, '''requested_duration_min'',p_tempo_min,''context''', '''requested_duration_min'',v_tempo,''sets_default'',v_sets,''reps_default'',v_reps,''rest_default_seconds'',v_rest,''context''');
  IF d NOT LIKE '%v_tempo integer%' OR d NOT LIKE '%WHEN p_equipamento IS NULL%' OR d NOT LIKE '%sets_default%' OR d LIKE '%p_tempo_min NOT IN%' THEN RAISE EXCEPTION 'substituicao falhou'; END IF;
  EXECUTE d;
END
$mig$;
