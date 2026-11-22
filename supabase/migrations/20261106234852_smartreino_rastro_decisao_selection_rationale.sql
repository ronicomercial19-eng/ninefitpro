-- 1) Coluna nova para rastro de decisão (fidedignidade).
ALTER TABLE public.workout_exercises ADD COLUMN IF NOT EXISTS selection_rationale jsonb;

-- 2) fn_montar_bloco_exercicios: cada slot já diz se veio de match_textual ou fallback_categoria.
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
  SELECT count(*), jsonb_agg(jsonb_build_object('id',e.id,'nome',e.name,
    'grupo_muscular',e.target_muscles[1],'series',1,'reps','1','rpe',4,'descanso','30s',
    'cadencia',NULL,'nota_tecnica',p_descricao,
    'selection_rationale', jsonb_build_object('metodo','match_textual')) ORDER BY e.id)
  INTO v_count, v_result FROM public.exercises e
  WHERE public.fitpro_normalize_term(p_descricao) = public.fitpro_normalize_term(e.name)
     OR (length(public.fitpro_normalize_term(e.name)) >= 8 AND
         (' '||public.fitpro_normalize_term(p_descricao)||' ') LIKE '% '||public.fitpro_normalize_term(e.name)||' %');

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
$function$;

-- 3) fn_montar_bloco9_exercicios: marca o método usado (seleção por foco/grupo do dia).
CREATE OR REPLACE FUNCTION public.fn_montar_bloco9_exercicios(p_descricao text, p_qtd_alvo integer, p_grupos_musculares text[], p_rpe text, p_rest text, p_cadence text, p_reps text, p_seed text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE v_result jsonb;v_count integer:=greatest(1,least(coalesce(p_qtd_alvo,1),6));
BEGIN
 SELECT jsonb_agg(jsonb_build_object('ordem',r.n,'id',r.id,'nome',r.name,
 'grupo_muscular',r.target_muscles[1],'series',v_count,'reps',coalesce(p_reps,'8-12'),
 'rpe',coalesce(nullif(regexp_replace(coalesce(p_rpe,''),'[^0-9]','','g'),'')::numeric,6),
 'descanso',coalesce(p_rest,'60')||'s','cadencia',p_cadence,'nota_tecnica',p_descricao,
 'selection_rationale', jsonb_build_object('metodo','selecao_por_foco','grupos_candidatos',to_jsonb(p_grupos_musculares))) ORDER BY r.n)
 INTO v_result FROM (
 SELECT e.*,row_number() OVER(ORDER BY hashtextextended(e.id::text||coalesce(p_seed,''),0),e.id) n
 FROM public.exercises e
 WHERE NOT e.taxonomy_review_required AND public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)),p_grupos_musculares)
 AND (CASE WHEN p_descricao ~* '(sprint|corrida|rodagem|fartlek|pace)' THEN e.target_muscles && ARRAY['cardio'] ELSE NOT e.target_muscles && ARRAY['cardio'] END)
 ORDER BY hashtextextended(e.id::text||coalesce(p_seed,''),0),e.id LIMIT v_count
 )r;
 IF jsonb_array_length(coalesce(v_result,'[]'::jsonb))<>v_count THEN RETURN '[]'::jsonb; END IF;
 RETURN v_result;
END $function$;;
