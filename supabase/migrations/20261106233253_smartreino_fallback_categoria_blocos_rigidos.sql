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
  -- Passo 1 (comportamento original, preservado): tenta match textual exato/contém.
  SELECT count(*), jsonb_agg(jsonb_build_object('id',e.id,'nome',e.name,
    'grupo_muscular',e.target_muscles[1],'series',1,'reps','1','rpe',4,'descanso','30s',
    'cadencia',NULL,'nota_tecnica',p_descricao) ORDER BY e.id)
  INTO v_count, v_result FROM public.exercises e
  WHERE public.fitpro_normalize_term(p_descricao) = public.fitpro_normalize_term(e.name)
     OR (length(public.fitpro_normalize_term(e.name)) >= 8 AND
         (' '||public.fitpro_normalize_term(p_descricao)||' ') LIKE '% '||public.fitpro_normalize_term(e.name)||' %');

  IF v_count = v_expected THEN
    RETURN coalesce(v_result, '[]'::jsonb);
  END IF;

  -- Passo 2 (NOVO, 06/11): fallback por categoria funcional quando não há match textual.
  -- Causa raiz: block_neural/integration/reset em smart_treino_protocols são descrições
  -- técnicas em prosa (ex. "Ativação de arco plantar (Short Foot) + Stiffness drills"),
  -- nunca nomes literais de exercises.name. Match textual sempre resultava em [] (0/729
  -- confirmado em auditoria). mobilidade/ativação já são categorias curinga no sistema
  -- (ver fitpro_matches_focus), então selecionamos por elas em vez de descartar o bloco.
  v_categoria := CASE
    WHEN p_descricao ~* 'relaxamento|alongamento|respiracao|respiração|liberacao|liberação|miofascial'
      THEN 'mobilidade'
    ELSE 'exercicios de ativacao'
  END;

  SELECT jsonb_agg(jsonb_build_object('id',r.id,'nome',r.name,
    'grupo_muscular',r.target_muscles[1],'series',1,'reps','1','rpe',4,'descanso','30s',
    'cadencia',NULL,'nota_tecnica',p_descricao) ORDER BY r.n)
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
