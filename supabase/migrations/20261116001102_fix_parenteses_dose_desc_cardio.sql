
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
    'rpe', COALESCE(NULLIF(regexp_replace(COALESCE(p_block_9_template->>'rpe',''),'[^0-9]','','g'),'')::numeric, 6),
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
