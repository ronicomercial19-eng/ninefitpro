CREATE OR REPLACE FUNCTION public.prescrever_treino(p_aluno_id uuid, p_data date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_athlete RECORD;
  v_periodizacao RECORD;
  v_wave RECORD;
  v_macro_rules RECORD;
  v_protocol RECORD;
  v_sugestao json;
  v_semana_atual int;
  v_dia_treino jsonb;
  v_result json;
BEGIN
  SELECT id, name INTO v_athlete FROM athletes WHERE id = p_aluno_id;
  IF v_athlete.id IS NULL THEN
    RETURN json_build_object('sucesso', false, 'motivo', 'aluno_nao_encontrado');
  END IF;

  SELECT ap.id AS periodizacao_id, ap.annual_plan_id
  INTO v_periodizacao
  FROM athlete_periodizations ap
  WHERE ap.athlete_id = p_aluno_id AND ap.status IN ('in_progress', 'active')
  ORDER BY ap.created_at DESC
  LIMIT 1;

  IF v_periodizacao.periodizacao_id IS NULL THEN
    RETURN json_build_object(
      'sucesso', false,
      'motivo', 'sem_periodizacao_ativa',
      'sugestao_cta', 'Atribua uma periodização a este aluno antes de gerar o treino do dia.'
    );
  END IF;

  SELECT w.id, w.wave_order, w.wave_label, w.focus, w.duration_weeks, w.started_at
  INTO v_wave
  FROM fitpro_smartperiodizer_waves w
  JOIN fitpro_smartperiodizer_periodizations fsp ON fsp.id = w.smartperiodizer_periodization_id
  WHERE fsp.fitpro_student_id = p_aluno_id AND w.status = 'current'
  ORDER BY w.started_at DESC NULLS LAST
  LIMIT 1;

  v_semana_atual := CASE
    WHEN v_wave.started_at IS NOT NULL THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p_data - v_wave.started_at::date)) / (7*86400.0))::int)
    ELSE 1
  END;

  SELECT id, protocol_code, weekly_frequency, rpe_target, carga_inicial_percent
  INTO v_macro_rules
  FROM smart_treino_macro_rules
  WHERE aluno_id = p_aluno_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_macro_rules.protocol_code IS NOT NULL THEN
    SELECT * INTO v_protocol FROM smart_treino_protocols WHERE id = v_macro_rules.protocol_code;
  END IF;

  IF v_protocol.id IS NULL THEN
    v_sugestao := fn_sugerir_protocolo_por_perfil(p_aluno_id);
    IF (v_sugestao->>'has_suggestion')::boolean THEN
      SELECT * INTO v_protocol FROM smart_treino_protocols WHERE id = v_sugestao->>'protocol_id';
    END IF;
  END IF;

  IF v_protocol.id IS NULL THEN
    RETURN json_build_object(
      'sucesso', false,
      'motivo', 'protocolo_nao_encontrado',
      'sugestao_cta', 'Cadastre o perfil técnico do aluno (objetivo/nível) para sugestão automática de protocolo.'
    );
  END IF;

  v_dia_treino := jsonb_build_object(
    'neural', fn_montar_bloco_exercicios(v_protocol.block_neural, 1),
    'integracao', fn_montar_bloco_exercicios(v_protocol.block_integration, 1),
    'bloco9', fn_montar_bloco_exercicios(v_protocol.block_9_template->>'reps',
                COALESCE((v_protocol.block_9_template->>'sets')::int, 3)),
    'reset', fn_montar_bloco_exercicios(v_protocol.block_reset, 1)
  );

  v_result := json_build_object(
    'sucesso', true,
    'data', p_data,
    'contexto', json_build_object(
      'aluno_id', p_aluno_id,
      'aluno_nome', v_athlete.name,
      'periodizacao_id', v_periodizacao.periodizacao_id,
      'annual_plan_id', v_periodizacao.annual_plan_id,
      'semana_atual', v_semana_atual,
      'fase', COALESCE(v_wave.wave_label, 'Fase não definida'),
      'protocolo', v_protocol.protocol_name,
      'protocol_code', v_protocol.id,
      'variacao', v_protocol.variation_name,
      'pillar', v_protocol.pillar
    ),
    'parametros', json_build_object(
      'rpe_alvo', v_protocol.rpe_range,
      'descanso_padrao', COALESCE(v_protocol.block_9_template->>'rest', '60') || 's',
      'cadencia_padrao', COALESCE(v_protocol.block_9_template->>'cadence', 'padrão'),
      'duracao_estimada', '45-60min',
      'reps_range', COALESCE(v_protocol.block_9_template->>'reps', '8-12'),
      'progressao', 'technique_first'
    ),
    'treino', v_dia_treino
  );

  RETURN v_result;
END;
$function$;;
