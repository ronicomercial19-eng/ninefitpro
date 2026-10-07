-- Trava de segurança também no caminho legado (sem calibração, usado pela Ativação):
-- se o aluno declarou restrição/lesão e pediu força/cardio, o servidor troca o objetivo para mobilidade
-- e avisa em restricao_aplicada/objetivo_aplicado. O fluxo novo (resources:) segue bloqueando com a mensagem atual.
-- v_new IS NOT TRUE porque com p_equipamento NULL v_new é NULL.
DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.fn_treino_rapido(uuid,text,integer,text)'::regprocedure) INTO d;
  IF d NOT LIKE '%v_tempo integer :=%' OR d NOT LIKE '%SELECT * INTO STRICT v_profile FROM public.athletes WHERE id=p_athlete_id;%' OR d NOT LIKE '%''sets_default'',v_sets%' THEN
    RAISE EXCEPTION 'fn_treino_rapido fora do estado esperado';
  END IF;
  d := replace(d, '  v_tempo integer :=', E'  v_restricted boolean := false;\n  v_tempo integer :=');
  d := replace(d, 'SELECT * INTO STRICT v_profile FROM public.athletes WHERE id=p_athlete_id;',
    $r$SELECT * INTO STRICT v_profile FROM public.athletes WHERE id=p_athlete_id;
  IF v_new IS NOT TRUE AND v_goal NOT IN ('mobility','recovery') AND nullif(trim(v_profile.injuries_limitations),'') IS NOT NULL AND lower(trim(v_profile.injuries_limitations)) NOT IN ('nenhuma','nenhum','não','nao','none','sem restrições','sem restricoes') THEN
    v_goal := 'mobility';
    v_restricted := true;
  END IF;$r$);
  d := replace(d, '''sets_default'',v_sets', '''restricao_aplicada'',v_restricted,''objetivo_aplicado'',v_goal,''sets_default'',v_sets');
  IF d NOT LIKE '%v_restricted boolean%' OR d NOT LIKE '%restricao_aplicada%' THEN RAISE EXCEPTION 'substituicao falhou'; END IF;
  EXECUTE d;
END
$mig$;
