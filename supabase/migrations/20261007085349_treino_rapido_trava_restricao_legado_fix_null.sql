-- Correção: com p_equipamento NULL, v_new é NULL e "NOT v_new" não era verdadeiro; usa IS NOT TRUE.
DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.fn_treino_rapido(uuid,text,integer,text)'::regprocedure) INTO d;
  IF d NOT LIKE '%IF NOT v_new AND v_goal NOT IN (''mobility'',''recovery'')%' THEN RAISE EXCEPTION 'fn_treino_rapido fora do estado esperado'; END IF;
  d := replace(d, 'IF NOT v_new AND v_goal NOT IN (''mobility'',''recovery'')', 'IF v_new IS NOT TRUE AND v_goal NOT IN (''mobility'',''recovery'')');
  IF d LIKE '%IF NOT v_new AND%' THEN RAISE EXCEPTION 'substituicao falhou'; END IF;
  EXECUTE d;
END
$mig$;;
