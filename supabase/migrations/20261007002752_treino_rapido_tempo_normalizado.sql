DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.fn_treino_rapido(uuid,text,integer,text)'::regprocedure) INTO d;
  IF d NOT LIKE '%p_tempo_min NOT IN (15,20,30,45,60)%' THEN RAISE EXCEPTION 'fn_treino_rapido fora do estado esperado'; END IF;
  d := replace(d, 'p_tempo_min IS NULL OR p_tempo_min NOT IN (15,20,30,45,60)', 'v_tempo IS NULL');
  d := replace(d, E'  v_exercises json;\nBEGIN', E'  v_exercises json;\n  v_tempo integer := CASE WHEN p_tempo_min BETWEEN 10 AND 75 THEN (SELECT t FROM unnest(ARRAY[15,20,30,45,60]) t ORDER BY abs(t-p_tempo_min), t LIMIT 1) END;\nBEGIN');
  d := replace(d, 'floor((p_tempo_min-3)', 'floor((v_tempo-3)');
  d := replace(d, '''requested_duration_min'',p_tempo_min', '''requested_duration_min'',v_tempo');
  IF d NOT LIKE '%v_tempo integer%' OR d LIKE '%p_tempo_min NOT IN%' THEN RAISE EXCEPTION 'substituicao falhou'; END IF;
  EXECUTE d;
END
$mig$;;
