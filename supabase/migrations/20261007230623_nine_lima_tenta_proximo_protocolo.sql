-- NINE/LIMA: o protocolo do dia (rotação por dia do ano) às vezes não pode ser aplicado como treino de musculação
-- (protocolo_modalidade_incompativel: distância/duração) ou não tem exercícios compatíveis no acervo (sem_exercicios_compativeis).
-- Antes o aluno via erro nesses dias. Agora tenta o próximo protocolo do mesmo pilar/nível até um funcionar.
-- Essas duas validações acontecem antes de qualquer escrita em fn_aplicar_protocolo_9x9x9, então tentar de novo é seguro.
DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.fn_aplicar_nine_lima(uuid,date)'::regprocedure) INTO d;
  IF d NOT LIKE E'%  offset (extract(doy from p_data)::int % v_count) limit 1;\n\n  v_res := public.fn_aplicar_protocolo_9x9x9(p_athlete_id, v_protocol_id, p_data);%'
     OR d NOT LIKE E'%  v_res json;\nbegin%' THEN
    RAISE EXCEPTION 'fn_aplicar_nine_lima fora do estado esperado';
  END IF;
  d := replace(d, E'  v_res json;\nbegin', E'  v_res json;\n  v_try int;\nbegin');
  d := replace(d,
    E'  select id into v_protocol_id\n  from smart_treino_protocols\n  where pillar = v_pillar and v_level = any(recommended_for)\n  order by protocol_id, variation_id, id\n  offset (extract(doy from p_data)::int % v_count) limit 1;\n\n  v_res := public.fn_aplicar_protocolo_9x9x9(p_athlete_id, v_protocol_id, p_data);',
    $r$  FOR v_try IN 0 .. v_count - 1 LOOP
    select id into v_protocol_id
    from smart_treino_protocols
    where pillar = v_pillar and v_level = any(recommended_for)
    order by protocol_id, variation_id, id
    offset ((extract(doy from p_data)::int + v_try) % v_count) limit 1;

    v_res := public.fn_aplicar_protocolo_9x9x9(p_athlete_id, v_protocol_id, p_data);
    EXIT WHEN coalesce((v_res->>'success')::boolean, false);
    EXIT WHEN coalesce(v_res->>'error', '') NOT IN ('sem_exercicios_compativeis', 'protocolo_modalidade_incompativel');
  END LOOP;$r$);
  IF d NOT LIKE '%v_try int%' OR d NOT LIKE '%FOR v_try IN 0 .. v_count - 1 LOOP%' THEN RAISE EXCEPTION 'substituicao falhou'; END IF;
  EXECUTE d;
END
$mig$;;
