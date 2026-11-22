
CREATE OR REPLACE FUNCTION public.fn_montar_bloco9_exercicios(p_descricao text, p_qtd_alvo integer, p_grupos_musculares text[], p_rpe text, p_rest text, p_cadence text, p_reps text, p_seed text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_count integer := greatest(1,least(coalesce(p_qtd_alvo,1),6));
  v_is_cardio boolean := (p_descricao ~* '(sprint|corrida|rodagem|fartlek|pace)');
BEGIN
  -- CORREÇÃO (13/11): protocolos de cardio (sprint/corrida/fartlek/rodagem/pace)
  -- são fisiologicamente só pernas no catálogo (muscle_groups = ['cardio','membros
  -- inferiores']) e não têm nenhuma variante de peito/costas/bíceps/tríceps/ombro.
  -- Antes, a query exigia o exercício bater o grupo muscular do DIA (push/pull/legs
  -- do rodízio semanal) *e* ser cardio ao mesmo tempo -- em qualquer dia de push
  -- ("peitoral/deltoides/tríceps") ou pull ("dorsais/bíceps") essa interseção é
  -- vazia por definição, e o bloco9 inteiro (e a prescrição do dia) caía com
  -- unmatched_prescription_requires_review. Um treino de corrida não é "dia de
  -- peito" nem "dia de costas" -- não deve ficar preso ao rodízio de grupo
  -- muscular da musculação. Agora, quando é cardio, o filtro de grupo do dia é
  -- ignorado e só importa ser um exercício de cardio.
  SELECT jsonb_agg(jsonb_build_object('ordem',r.n,'id',r.id,'nome',r.name,
 'grupo_muscular',r.target_muscles[1],'series',v_count,'reps',coalesce(p_reps,'8-12'),
 'rpe',coalesce(nullif(regexp_replace(coalesce(p_rpe,''),'[^0-9]','','g'),'')::numeric,6),
 'descanso',coalesce(p_rest,'60')||'s','cadencia',p_cadence,'nota_tecnica',p_descricao,
 'selection_rationale', jsonb_build_object('metodo','selecao_por_foco','grupos_candidatos',to_jsonb(p_grupos_musculares),'cardio_ignora_grupo_dia',v_is_cardio)) ORDER BY r.n)
 INTO v_result FROM (
 SELECT e.*,row_number() OVER(ORDER BY hashtextextended(e.id::text||coalesce(p_seed,''),0),e.id) n
 FROM public.exercises e
 WHERE NOT e.taxonomy_review_required
   AND (
     (v_is_cardio AND e.target_muscles && ARRAY['cardio'])
     OR
     (NOT v_is_cardio
        AND public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)),p_grupos_musculares)
        AND NOT e.target_muscles && ARRAY['cardio'])
   )
 ORDER BY hashtextextended(e.id::text||coalesce(p_seed,''),0),e.id LIMIT v_count
 )r;
  IF jsonb_array_length(coalesce(v_result,'[]'::jsonb))<>v_count THEN RETURN '[]'::jsonb; END IF;
  RETURN v_result;
END $function$;
;
