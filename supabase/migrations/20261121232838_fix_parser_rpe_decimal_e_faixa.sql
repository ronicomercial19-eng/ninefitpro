
-- CORREÇÃO (21/11): o parser de RPE usado em fn_montar_bloco9_exercicios e
-- fn_montar_sessao_cardio fazia regexp_replace(texto,'[^0-9]','','g') para
-- "limpar" o valor de RPE antes de converter pra número. Isso remove TODO
-- caractere não-numérico, inclusive ponto decimal e hífen de faixa -- então
-- "7.5" virava "75" e "6-7" virava "67", nos dois casos estourando o CHECK
-- (rpe_target BETWEEN 1 AND 10) de workout_exercises e derrubando a
-- prescrição inteira com uma exceção não tratada. Isso já acontecia mesmo
-- sem o catálogo (RPE "7.5"/"8.5" já existem no block_9_template original
-- dos protocolos) e piorou com o catálogo de periodização, que usa faixas
-- como "6-7". Esta função extrai o número certo: se for uma faixa, usa o
-- limite superior (é um "cap"); se for um decimal solto, usa ele arredondado;
-- sempre top no intervalo 1-10.
CREATE OR REPLACE FUNCTION public.fn_extrair_rpe_cap(p_rpe text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT LEAST(10, GREATEST(1, ROUND(
    COALESCE(
      (regexp_match(p_rpe, '([0-9]+(?:\.[0-9]+)?)\s*-\s*([0-9]+(?:\.[0-9]+)?)'))[2]::numeric,
      (regexp_match(p_rpe, '([0-9]+(?:\.[0-9]+)?)'))[1]::numeric,
      6
    )
  ))::integer);
$function$;

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
  v_is_cardio boolean := COALESCE(p_modality = 'cardio', p_descricao ~* '(sprint|corrida|rodagem|fartlek|pace|tiro|bike|pedal|remo|elíptico)');
BEGIN
  SELECT jsonb_agg(jsonb_build_object('ordem',r.n,'id',r.id,'nome',r.name,
 'grupo_muscular',r.target_muscles[1],'series',v_count,'reps',coalesce(p_reps,'8-12'),
 'rpe', public.fn_extrair_rpe_cap(p_rpe),
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

CREATE OR REPLACE FUNCTION public.fn_montar_sessao_cardio(
  p_protocol_axis text,
  p_variation_focus text,
  p_block_9_template jsonb,
  p_seed text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_exercicio_nome text;
  v_exercicio record;
  v_dose_desc text;
  v_sets int;
BEGIN
  v_exercicio_nome := CASE
    WHEN p_variation_focus = 'Acima de 90min' THEN 'Rodagem Longa (Long Run)'
    WHEN p_variation_focus = 'Baixa reserva' THEN 'Corrida Contínua Z2'
    WHEN p_variation_focus = 'Descarga e regeneração' THEN 'Corrida Contínua Z2'
    WHEN p_variation_focus = 'Pico de volume' THEN 'Rodagem Longa (Long Run)'
    WHEN p_variation_focus = 'Regenerativo' THEN 'Corrida Contínua Z2'
    WHEN p_variation_focus = 'Rodagens 30-45min' THEN 'Corrida Contínua Z2'
    WHEN p_variation_focus = 'RPM e economia' THEN 'Corrida com Cadência Controlada'
    WHEN p_variation_focus = 'Terrenos variados' THEN 'Rodagem Longa (Long Run)'
    WHEN p_variation_focus = 'Volume até 60min' THEN 'Rodagem Longa (Long Run)'
    WHEN p_variation_focus = 'Aumento de ritmo' THEN 'Corrida em Ritmo de Limiar (Tempo Run)'
    WHEN p_variation_focus = 'Blocos de 1km' THEN 'Intervalado Longo (800m-2km)'
    WHEN p_variation_focus = 'Intervalos rec mínima' THEN 'Intervalado Longo (800m-2km)'
    WHEN p_variation_focus = 'Limiar + tiros curtos' THEN 'Corrida em Ritmo de Limiar (Tempo Run)'
    WHEN p_variation_focus = 'Simulados meia maratona' THEN 'Corrida em Ritmo de Prova (Race Pace)'
    WHEN p_variation_focus = 'Sustentação 15-20min' THEN 'Corrida em Ritmo de Limiar (Tempo Run)'
    WHEN p_variation_focus = 'Sustentação 30-40min' THEN 'Corrida em Ritmo de Limiar (Tempo Run)'
    WHEN p_variation_focus = 'Volume em limiar' THEN 'Corrida em Ritmo de Limiar (Tempo Run)'
    WHEN p_variation_focus = 'Z2 estável' THEN 'Corrida Contínua Z2'
    WHEN p_variation_focus = 'Intervalados 400-800m' THEN 'Intervalado Curto (200-400m)'
    WHEN p_variation_focus = 'Rampas e saltos' THEN 'Hill Sprints (Tiros em Subida)'
    WHEN p_variation_focus = 'Recuperação com brilho' THEN 'Strides (Acelerações Curtas)'
    WHEN p_variation_focus = 'Redução de intervalo' THEN '30/30 (Intervalado Curto por Tempo)'
    WHEN p_variation_focus = 'Ritmo de prova' THEN 'Corrida em Ritmo de Prova (Race Pace)'
    WHEN p_variation_focus = 'Sprints curtos <60m' THEN 'Sprint Alático (<60m)'
    WHEN p_variation_focus = 'Técnica e Drills' THEN 'Strides (Acelerações Curtas)'
    WHEN p_variation_focus = 'Tiros de 200m' THEN 'Intervalado Curto (200-400m)'
    WHEN p_variation_focus = 'Validação de performance' THEN 'Corrida em Ritmo de Prova (Race Pace)'
    ELSE 'Corrida Contínua Z2'
  END;

  SELECT e.id, e.name, e.target_muscles INTO v_exercicio
  FROM public.exercises e
  WHERE e.name = v_exercicio_nome AND e.target_muscles && ARRAY['cardio']
  LIMIT 1;

  IF v_exercicio.id IS NULL THEN
    SELECT e.id, e.name, e.target_muscles INTO v_exercicio
    FROM public.exercises e
    WHERE e.target_muscles && ARRAY['cardio']
    ORDER BY (e.name = 'Corrida Contínua Z2') DESC, e.id LIMIT 1;
  END IF;
  IF v_exercicio.id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  v_sets := NULLIF(regexp_replace(COALESCE(p_block_9_template->>'sets',''),'[^0-9]','','g'),'')::int;

  v_dose_desc := CASE
    WHEN (p_block_9_template->>'dose_value') IS NOT NULL AND (p_block_9_template->>'dose_unit') IS NOT NULL
      THEN (p_block_9_template->>'dose_value') || (p_block_9_template->>'dose_unit')
    ELSE COALESCE(p_block_9_template->>'reps', p_block_9_template->>'source_description', p_block_9_template->>'note')
  END;

  RETURN jsonb_build_array(jsonb_build_object(
    'ordem', 1,
    'id', v_exercicio.id,
    'nome', v_exercicio.name,
    'grupo_muscular', 'Cardio',
    'series', COALESCE(v_sets, 1),
    'reps', COALESCE(v_dose_desc, '1'),
    'rpe', public.fn_extrair_rpe_cap(p_block_9_template->>'rpe'),
    'descanso', COALESCE(NULLIF(regexp_replace(COALESCE((p_block_9_template->>'rest'),''),'[^0-9]','','g'),''), '60') || 's',
    'cadencia', p_block_9_template->>'cadence',
    'nota_tecnica', COALESCE(p_block_9_template->>'note', p_block_9_template->>'source_description'),
    'selection_rationale', jsonb_build_object(
      'metodo', 'selecao_cardio_por_eixo_variacao',
      'protocol_axis', p_protocol_axis,
      'variation_focus', p_variation_focus,
      'dose_type', p_block_9_template->>'dose_type',
      'dose_unit', p_block_9_template->>'dose_unit'
    )
  ));
END;
$function$;
;
