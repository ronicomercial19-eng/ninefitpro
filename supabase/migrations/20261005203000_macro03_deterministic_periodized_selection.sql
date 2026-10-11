-- Periodized prescriptions use deterministic, non-repeating exercise selection.
CREATE OR REPLACE FUNCTION public.fn_montar_bloco_exercicios(
  p_descricao text,
  p_qtd_alvo integer,
  p_seed text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_terms text[];
  v_result jsonb := '[]'::jsonb;
  v_ex_id uuid;
  v_ex_name text;
  v_ex_muscles text[];
  v_order integer;
  v_count integer := greatest(1, least(coalesce(p_qtd_alvo, 1), 6));
  v_is_cardio boolean;
BEGIN
  IF p_descricao IS NULL OR trim(p_descricao) = '' THEN RETURN v_result; END IF;
  v_is_cardio := p_descricao ~* '[0-9]+\s*(m|km|min)([^a-zA-Z]|$)'
    OR p_descricao ~* '(sprint|corrida|rodagem|tempo run|fartlek|z1|z2|limiar|hill|stride|pace|30/30)';
  v_terms := ARRAY(SELECT unnest(string_to_array(lower(p_descricao), ' ')));

  FOR v_order IN 1..v_count LOOP
    v_ex_id := NULL; v_ex_name := NULL; v_ex_muscles := NULL;
    IF v_is_cardio THEN
      SELECT e.id, e.name, e.target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles
      FROM public.exercises e
      WHERE EXISTS (SELECT 1 FROM unnest(e.target_muscles) m WHERE m ILIKE 'cardio')
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_result) old WHERE old->>'id' = e.id::text)
      ORDER BY hashtextextended(e.id::text || coalesce(p_seed, '') || v_order::text, 0), e.id LIMIT 1;
    END IF;
    IF v_ex_id IS NULL THEN
      SELECT e.id, e.name, e.target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles
      FROM public.exercises e
      WHERE EXISTS (
        SELECT 1 FROM unnest(e.target_muscles) m, unnest(v_terms) t
        WHERE m ILIKE '%' || t || '%' AND length(t) > 3
      )
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_result) old WHERE old->>'id' = e.id::text)
      ORDER BY hashtextextended(e.id::text || coalesce(p_seed, '') || v_order::text, 0), e.id LIMIT 1;
    END IF;
    IF v_ex_id IS NULL THEN
      SELECT e.id, e.name, e.target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles
      FROM public.exercises e
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_result) old WHERE old->>'id' = e.id::text)
      ORDER BY hashtextextended(e.id::text || coalesce(p_seed, '') || v_order::text, 0), e.id LIMIT 1;
    END IF;
    IF v_ex_id IS NOT NULL THEN
      v_result := v_result || jsonb_build_object(
        'id', v_ex_id, 'nome', v_ex_name, 'grupo_muscular', v_ex_muscles[1],
        'series', 1, 'reps', '1', 'rpe', 4, 'descanso', '30s',
        'cadencia', null, 'nota_tecnica', p_descricao
      );
    END IF;
  END LOOP;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_montar_bloco9_exercicios(
  p_descricao text,
  p_qtd_alvo integer,
  p_grupos_musculares text[],
  p_rpe text,
  p_rest text,
  p_cadence text,
  p_reps text,
  p_seed text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_ex_id uuid;
  v_ex_name text;
  v_ex_muscles text[];
  v_order integer;
  v_count integer := greatest(1, least(coalesce(p_qtd_alvo, 1), 6));
  v_is_cardio boolean;
BEGIN
  v_is_cardio := p_descricao ~* '[0-9]+\s*(m|km|min)([^a-zA-Z]|$)'
    OR p_descricao ~* '(sprint|corrida|rodagem|tempo run|fartlek|z1|z2|limiar|hill|stride|pace|30/30)';
  FOR v_order IN 1..v_count LOOP
    v_ex_id := NULL; v_ex_name := NULL; v_ex_muscles := NULL;
    IF v_is_cardio THEN
      SELECT e.id, e.name, e.target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles
      FROM public.exercises e
      WHERE EXISTS (SELECT 1 FROM unnest(e.target_muscles) m WHERE m ILIKE 'cardio')
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_result) old WHERE old->>'id' = e.id::text)
      ORDER BY hashtextextended(e.id::text || coalesce(p_seed, '') || v_order::text, 0), e.id LIMIT 1;
    ELSIF coalesce(cardinality(p_grupos_musculares), 0) > 0 THEN
      SELECT e.id, e.name, e.target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles
      FROM public.exercises e
      WHERE EXISTS (SELECT 1 FROM unnest(e.target_muscles) m, unnest(p_grupos_musculares) g WHERE m ILIKE g)
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_result) old WHERE old->>'id' = e.id::text)
      ORDER BY hashtextextended(e.id::text || coalesce(p_seed, '') || v_order::text, 0), e.id LIMIT 1;
    END IF;
    IF v_ex_id IS NULL THEN
      SELECT e.id, e.name, e.target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles
      FROM public.exercises e
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_result) old WHERE old->>'id' = e.id::text)
      ORDER BY hashtextextended(e.id::text || coalesce(p_seed, '') || v_order::text, 0), e.id LIMIT 1;
    END IF;
    IF v_ex_id IS NOT NULL THEN
      v_result := v_result || jsonb_build_object(
        'ordem', v_order, 'id', v_ex_id, 'nome', v_ex_name,
        'grupo_muscular', v_ex_muscles[1], 'series', v_count,
        'reps', coalesce(p_reps, '8-12'),
        'rpe', coalesce(nullif(regexp_replace(coalesce(p_rpe, ''), '[^0-9]', '', 'g'), '')::numeric, 6),
        'descanso', coalesce(p_rest, '60') || 's', 'cadencia', p_cadence,
        'nota_tecnica', p_descricao
      );
    END IF;
  END LOOP;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_montar_bloco_exercicios(text, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_montar_bloco9_exercicios(text, integer, text[], text, text, text, text, text) FROM PUBLIC, anon;

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
  v_bloco9_termo text;
  v_grupos text[];
  v_daily_workout_id uuid;
  v_slot jsonb;
  v_order int := 0;
  v_rows_inserted int := 0;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_aluno_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_aluno_id::text || p_data::text,0));
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_aluno_id AND workout_date=p_data AND status IN ('started','in_progress','paused','completed','skipped')) THEN
    RAISE EXCEPTION 'workout_prescription_locked' USING ERRCODE='55000';
  END IF;
  SELECT * INTO v_protocol FROM smart_treino_protocols WHERE false;

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
      'sucesso', false, 'motivo', 'sem_periodizacao_ativa',
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
    WHEN v_wave.started_at IS NOT NULL THEN GREATEST(1, CEIL((p_data - v_wave.started_at::date) / 7.0)::int)
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
      'sucesso', false, 'motivo', 'protocolo_nao_encontrado',
      'sugestao_cta', 'Cadastre o perfil técnico do aluno (objetivo/nível) para sugestão automática de protocolo.'
    );
  END IF;

  v_bloco9_termo := COALESCE(v_protocol.model_description, v_protocol.protocol_axis, v_protocol.variation_focus, v_protocol.protocol_name);
  v_grupos := fn_grupo_muscular_do_dia(p_aluno_id, p_data, COALESCE(v_macro_rules.weekly_frequency, 4));

  v_dia_treino := jsonb_build_object(
    'neural', fn_montar_bloco_exercicios(v_protocol.block_neural, 1, p_aluno_id::text || ':' || p_data::text || ':neural'),
    'integracao', fn_montar_bloco_exercicios(v_protocol.block_integration, 1, p_aluno_id::text || ':' || p_data::text || ':integration'),
    'bloco9', fn_montar_bloco9_exercicios(
                v_bloco9_termo,
                COALESCE((v_protocol.block_9_template->>'sets')::int, 3),
                v_grupos,
                v_protocol.block_9_template->>'rpe',
                v_protocol.block_9_template->>'rest',
                v_protocol.block_9_template->>'cadence',
                v_protocol.block_9_template->>'reps',
                p_aluno_id::text || ':' || p_data::text || ':block9'
              ),
    'reset', fn_montar_bloco_exercicios(v_protocol.block_reset, 1, p_aluno_id::text || ':' || p_data::text || ':reset')
  );

  -- ---- PERSISTÊNCIA DIRETA (29/09): prescrever_treino antes só retornava JSON e
  -- dependia 100% de generate-quick-workout -> fitpro-deliver-workout (rota HTTP
  -- quebrada, /v1/fitpro/events inexistente) para o aluno ver qualquer coisa.
  -- Agora grava direto em daily_workouts/workout_exercises, igual ao Smart Treino,
  -- tornando a entrega HTTP legada redundante/best-effort em vez de bloqueante. ----
  SELECT id INTO v_daily_workout_id
  FROM daily_workouts
  WHERE athlete_id = p_aluno_id AND workout_date = p_data;

  IF v_daily_workout_id IS NULL THEN
    INSERT INTO daily_workouts (athlete_id, workout_date, day_number, day_name, focus_muscles, workout_type)
    VALUES (
      p_aluno_id, p_data, v_semana_atual,
      'Treino Rápido — ' || COALESCE(v_protocol.protocol_name, 'Hoje'),
      COALESCE(v_grupos, ARRAY[]::text[]),
      CASE WHEN v_protocol.pillar = 'performance' THEN 'endurance'
           WHEN v_protocol.pillar = 'longevidade' THEN 'recovery'
           ELSE 'hypertrophy' END
    )
    RETURNING id INTO v_daily_workout_id;
  ELSE
    DELETE FROM workout_exercises WHERE daily_workout_id = v_daily_workout_id;
    UPDATE daily_workouts SET
      day_name = 'Treino Rápido — ' || COALESCE(v_protocol.protocol_name, 'Hoje'),
      focus_muscles = COALESCE(v_grupos, focus_muscles),
      updated_at = now()
    WHERE id = v_daily_workout_id;
  END IF;

  v_order := 0;
  FOR v_slot IN SELECT * FROM jsonb_array_elements(v_dia_treino->'neural') LOOP
    v_order := v_order + 1;
    INSERT INTO workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target, tempo, observations)
    VALUES (v_daily_workout_id, (v_slot->>'id')::uuid, v_order, COALESCE((v_slot->>'series')::int,1), COALESCE(v_slot->>'reps','1'), COALESCE(NULLIF(regexp_replace(v_slot->>'descanso','[^0-9]','','g'),'')::int,30), (v_slot->>'rpe')::int, v_slot->>'cadencia', jsonb_build_object('notes', v_slot->>'nota_tecnica', 'bloco','neural'));
    v_rows_inserted := v_rows_inserted + 1;
  END LOOP;
  FOR v_slot IN SELECT * FROM jsonb_array_elements(v_dia_treino->'integracao') LOOP
    v_order := v_order + 1;
    INSERT INTO workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target, tempo, observations)
    VALUES (v_daily_workout_id, (v_slot->>'id')::uuid, v_order, COALESCE((v_slot->>'series')::int,1), COALESCE(v_slot->>'reps','1'), COALESCE(NULLIF(regexp_replace(v_slot->>'descanso','[^0-9]','','g'),'')::int,30), (v_slot->>'rpe')::int, v_slot->>'cadencia', jsonb_build_object('notes', v_slot->>'nota_tecnica', 'bloco','integracao'));
    v_rows_inserted := v_rows_inserted + 1;
  END LOOP;
  FOR v_slot IN SELECT * FROM jsonb_array_elements(v_dia_treino->'bloco9') LOOP
    v_order := v_order + 1;
    INSERT INTO workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target, tempo, observations)
    VALUES (v_daily_workout_id, (v_slot->>'id')::uuid, v_order, COALESCE((v_slot->>'series')::int,3), COALESCE(v_slot->>'reps','10'), COALESCE(NULLIF(regexp_replace(v_slot->>'descanso','[^0-9]','','g'),'')::int,60), (v_slot->>'rpe')::int, v_slot->>'cadencia', jsonb_build_object('notes', v_slot->>'nota_tecnica', 'bloco','bloco9'));
    v_rows_inserted := v_rows_inserted + 1;
  END LOOP;
  FOR v_slot IN SELECT * FROM jsonb_array_elements(v_dia_treino->'reset') LOOP
    v_order := v_order + 1;
    INSERT INTO workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target, tempo, observations)
    VALUES (v_daily_workout_id, (v_slot->>'id')::uuid, v_order, COALESCE((v_slot->>'series')::int,1), COALESCE(v_slot->>'reps','1'), COALESCE(NULLIF(regexp_replace(v_slot->>'descanso','[^0-9]','','g'),'')::int,30), (v_slot->>'rpe')::int, v_slot->>'cadencia', jsonb_build_object('notes', v_slot->>'nota_tecnica', 'bloco','reset'));
    v_rows_inserted := v_rows_inserted + 1;
  END LOOP;

  v_result := json_build_object(
    'sucesso', true,
    'data', p_data,
    'daily_workout_id', v_daily_workout_id,
    'exercicios_gravados', v_rows_inserted,
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
      'pillar', v_protocol.pillar,
      'grupo_muscular_dia', v_grupos
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
$function$;
REVOKE EXECUTE ON FUNCTION public.prescrever_treino(uuid,date) FROM PUBLIC,anon;
