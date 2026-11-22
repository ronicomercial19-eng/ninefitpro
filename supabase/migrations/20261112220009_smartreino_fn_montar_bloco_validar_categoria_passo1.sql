CREATE OR REPLACE FUNCTION public.fn_montar_bloco_exercicios(p_descricao text, p_qtd_alvo integer, p_seed text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb; v_count integer;
  v_expected integer := greatest(1, least(coalesce(p_qtd_alvo,1), 6));
  v_categoria text;
BEGIN
  -- CORRIGIDO 12/11: o Passo 1 (match textual) agora so aceita o exercicio encontrado
  -- se ele tambem for de categoria curinga (mobilidade/ativacao) -- a MESMA regra que
  -- o Passo 2 (fallback) ja aplica. Antes, um match textual correto como "Bracing
  -- abdominal" (categoria core) era aceito aqui sem checagem, e so era rejeitado depois,
  -- no filtro de foco do dia em prescrever_treino -- esvaziando o bloco inteiro e
  -- derrubando a prescricao (unmatched_prescription_requires_review) mesmo quando o
  -- exercicio era a escolha tecnicamente certa para aquele protocolo de preparacao/
  -- recuperacao. Agora, se o match textual achar algo fora de mobilidade/ativacao,
  -- cai no fallback de categoria (Passo 2) em vez de usar esse resultado.
  SELECT count(*), jsonb_agg(jsonb_build_object('id',e.id,'nome',e.name,
    'grupo_muscular',e.target_muscles[1],'series',1,'reps','1','rpe',4,'descanso','30s',
    'cadencia',NULL,'nota_tecnica',p_descricao,
    'selection_rationale', jsonb_build_object('metodo','match_textual')) ORDER BY e.id)
  INTO v_count, v_result FROM public.exercises e
  WHERE (public.fitpro_normalize_term(p_descricao) = public.fitpro_normalize_term(e.name)
     OR (length(public.fitpro_normalize_term(e.name)) >= 8 AND
         (' '||public.fitpro_normalize_term(p_descricao)||' ') LIKE '% '||public.fitpro_normalize_term(e.name)||' %'))
    AND (e.muscle_groups ? 'mobilidade' OR e.muscle_groups ? 'exercicios de ativacao');

  IF v_count = v_expected THEN
    RETURN coalesce(v_result, '[]'::jsonb);
  END IF;

  v_categoria := CASE
    WHEN p_descricao ~* 'relaxamento|alongamento|respiracao|respiração|liberacao|liberação|miofascial'
      THEN 'mobilidade'
    ELSE 'exercicios de ativacao'
  END;

  SELECT jsonb_agg(jsonb_build_object('id',r.id,'nome',r.name,
    'grupo_muscular',r.target_muscles[1],'series',1,'reps','1','rpe',4,'descanso','30s',
    'cadencia',NULL,'nota_tecnica',p_descricao,
    'selection_rationale', jsonb_build_object('metodo','fallback_categoria','categoria',v_categoria)) ORDER BY r.n)
  INTO v_result FROM (
    SELECT e.*, row_number() OVER (ORDER BY hashtextextended(e.id::text||coalesce(p_seed,''),0), e.id) n
    FROM public.exercises e
    WHERE e.muscle_groups ? v_categoria
    ORDER BY hashtextextended(e.id::text||coalesce(p_seed,''),0), e.id
    LIMIT v_expected
  ) r;

  IF jsonb_array_length(coalesce(v_result,'[]'::jsonb)) <> v_expected THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN v_result;
END
$function$;;
