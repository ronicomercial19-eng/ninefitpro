
CREATE OR REPLACE FUNCTION public.fn_montar_bloco9_exercicios(
  p_descricao text, p_qtd_alvo integer, p_grupos_musculares text[],
  p_rpe text, p_rest text, p_cadence text, p_reps text, p_seed text,
  p_modality text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_count integer := greatest(1,least(coalesce(p_qtd_alvo,1),6));
  -- CORREÇÃO (13/11, parte 2): a detecção de cardio por regex no texto da
  -- descrição cobria só 43 dos 243 protocolos de cardio reais do catálogo
  -- (block_9_template->>'modality' = 'cardio' já existe no banco e é a fonte
  -- correta -- os outros 200 protocolos de cardio tinham descrições como
  -- "Tiro de 30 segundos", "Bike indoor Z2" etc., que o regex
  -- sprint|corrida|rodagem|fartlek|pace nunca pegava). Isso fazia a maioria
  -- absoluta do sistema 9x9x9 (33% do catálogo inteiro) ser tratada como
  -- treino de força e travar em qualquer dia de push/pull, exatamente o
  -- sintoma relatado ("9x9x9 não consigo usar pra prescrever"). Agora usa o
  -- campo modality como fonte principal, com o regex como fallback só para
  -- chamadas antigas que não passem modality.
  v_is_cardio boolean := COALESCE(p_modality = 'cardio', p_descricao ~* '(sprint|corrida|rodagem|fartlek|pace|tiro|bike|pedal|remo|elíptico)');
BEGIN
  SELECT jsonb_agg(jsonb_build_object('ordem',r.n,'id',r.id,'nome',r.name,
 'grupo_muscular',r.target_muscles[1],'series',v_count,'reps',coalesce(p_reps,'8-12'),
 'rpe',coalesce(nullif(regexp_replace(coalesce(p_rpe,''),'[^0-9]','','g'),'')::numeric,6),
 'descanso',coalesce(p_rest,'60')||'s','cadencia',p_cadence,'nota_tecnica',p_descricao,
 'selection_rationale', jsonb_build_object('metodo','selecao_por_foco','grupos_candidatos',to_jsonb(p_grupos_musculares),'cardio_ignora_grupo_dia',v_is_cardio,'modality',p_modality)) ORDER BY r.n)
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
