
CREATE OR REPLACE FUNCTION public.prescrever_treino(p_aluno_id uuid, p_data date, p_evitar_regiao text)
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
  v_foco_dia jsonb;
  v_catalogo jsonb;
  v_sugestao json;
  v_semana_atual int;
  v_dia_treino jsonb;
  v_result json;
  v_bloco9_termo text;
  v_grupos text[];
  v_grupos_enfase text[];
  v_daily_workout_id uuid;
  v_slot jsonb;
  v_order int := 0;
  v_rows_inserted int := 0;
  v_locked boolean := false;
  v_changes jsonb := '{}'::jsonb;
  v_force boolean := false;
  v_aluno_aprovou_risco boolean := false;
  v_sets_b9 int;
  v_rpe_b9 text;
  v_rest_b9 text;
  v_cadence_b9 text;
  v_reps_b9 text;
  v_fonte_parametros text;
  v_is_cardio boolean := false;
BEGIN
 PERFORM private.fitpro_require_current_access();
  PERFORM fitpro_internal.assert_athlete_access(p_aluno_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_aluno_id::text || p_data::text,0));
  IF p_evitar_regiao IS NULL AND EXISTS(SELECT 1 FROM public.daily_workouts d WHERE d.athlete_id=p_aluno_id
      AND d.workout_date=p_data AND d.workout_type IS DISTINCT FROM 'quick')
     AND NOT EXISTS(SELECT 1 FROM public.daily_workouts d WHERE d.athlete_id=p_aluno_id
      AND d.workout_date=p_data AND d.workout_type IS DISTINCT FROM 'quick'
      AND d.changes_json->>'_force_represcricao'='true') THEN
    RETURN public.fn_get_saved_prescription(p_aluno_id,p_data)::json;
  END IF;
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_aluno_id AND workout_date=p_data AND (daily_workout_id IN (SELECT id FROM public.daily_workouts WHERE athlete_id=p_aluno_id AND workout_date=p_data AND workout_type IS DISTINCT FROM 'quick') OR (daily_workout_id IS NULL AND phase_name IS DISTINCT FROM 'quick')) AND status IN ('started','in_progress','paused','completed','skipped')) THEN
    RAISE EXCEPTION 'workout_prescription_locked' USING ERRCODE='55000';
  END IF;

  SELECT override_locked, changes_json INTO v_locked, v_changes
  FROM public.daily_workouts
  WHERE athlete_id = p_aluno_id AND workout_date = p_data
    AND workout_type IS DISTINCT FROM 'quick' ORDER BY created_at DESC,id LIMIT 1;

  v_force := COALESCE((v_changes->>'_force_represcricao')::boolean, false) OR p_evitar_regiao IS NOT NULL;

  IF v_locked IS TRUE AND NOT v_force THEN
    RETURN json_build_object(
      'sucesso', false,
      'motivo', 'ajuste_bloqueado',
      'sugestao_cta', 'confirmar_represcricao'
    );
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
  WHERE fsp.fitpro_student_id = p_aluno_id AND w.status = 'current' AND fsp.status = 'active'
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

  v_foco_dia := public.fn_decidir_foco_dia(p_aluno_id, p_data);
  v_catalogo := v_foco_dia->'catalogo';

  IF (v_foco_dia->>'tem_wave_ativa')::boolean IS TRUE THEN
    SELECT * INTO v_protocol FROM smart_treino_protocols
    WHERE protocol_id = (v_foco_dia->>'protocol_sugerido')::int AND public.fn_protocol_strength_compatible(id::text)
      AND COALESCE((block_9_template->>'requires_approval')::boolean, false) = false
    ORDER BY random() LIMIT 1;
  ELSIF v_macro_rules.protocol_code IS NOT NULL THEN
    SELECT * INTO v_protocol FROM smart_treino_protocols
    WHERE id = v_macro_rules.protocol_code
      AND COALESCE((block_9_template->>'requires_approval')::boolean, false) = false;
  END IF;

  IF v_protocol.id IS NULL THEN
    v_sugestao := fn_sugerir_protocolo_por_perfil(p_aluno_id);
    IF (v_sugestao->>'has_suggestion')::boolean THEN
      SELECT * INTO v_protocol FROM smart_treino_protocols
      WHERE id = v_sugestao->>'protocol_id'
        AND COALESCE((block_9_template->>'requires_approval')::boolean, false) = false;
    END IF;
  END IF;

  IF v_protocol.id IS NULL THEN
    RETURN json_build_object(
      'sucesso', false, 'motivo', 'protocolo_nao_encontrado',
      'sugestao_cta', 'Cadastre o perfil técnico do aluno (objetivo/nível) para sugestão automática de protocolo.'
    );
  END IF;

  v_is_cardio := NOT public.fn_protocol_strength_compatible(v_protocol.id);

  v_bloco9_termo := COALESCE(v_protocol.model_description, v_protocol.protocol_axis, v_protocol.variation_focus, v_protocol.protocol_name);
  v_grupos := fn_grupo_muscular_do_dia(p_aluno_id, p_data, COALESCE(v_macro_rules.weekly_frequency, 4));

  IF v_macro_rules.id IS NOT NULL THEN
    SELECT ARRAY_AGG(DISTINCT muscle_group) INTO v_grupos_enfase
    FROM smart_treino_muscle_volume
    WHERE macro_rules_id = v_macro_rules.id AND is_emphasis = true;

    IF v_grupos_enfase IS NOT NULL AND array_length(v_grupos_enfase, 1) > 0 THEN
      v_grupos := ARRAY(SELECT DISTINCT unnest(v_grupos_enfase || COALESCE(v_grupos, ARRAY[]::text[])));
    END IF;
  END IF;

  IF v_is_cardio THEN
    v_dia_treino := jsonb_build_object(
      'cardio', public.fn_montar_sessao_cardio(
                   v_protocol.protocol_axis, v_protocol.variation_focus, v_protocol.block_9_template,
                   p_aluno_id::text || ':' || p_data::text || ':cardio'
                 )
    );
    v_sets_b9 := NULL; v_rpe_b9 := v_protocol.block_9_template->>'rpe'; v_rest_b9 := v_protocol.block_9_template->>'rest';
    v_cadence_b9 := v_protocol.block_9_template->>'cadence'; v_reps_b9 := v_protocol.block_9_template->>'reps';
    v_fonte_parametros := 'motor_cardio_eixo_variacao';
  ELSE
    v_sets_b9   := COALESCE(NULLIF(split_part(COALESCE(v_catalogo->>'sets_range', ''), '-', 1), '')::int,
                             (v_protocol.block_9_template->>'sets')::int, 3);
    v_rpe_b9    := COALESCE(v_catalogo->>'rpe_cap', v_protocol.block_9_template->>'rpe');
    v_rest_b9   := v_protocol.block_9_template->>'rest';
    v_cadence_b9:= v_protocol.block_9_template->>'cadence';
    v_reps_b9   := COALESCE(v_catalogo->>'reps_range', v_protocol.block_9_template->>'reps');
    v_fonte_parametros := CASE WHEN v_catalogo IS NOT NULL AND (v_catalogo->>'rpe_cap' IS NOT NULL OR v_catalogo->>'reps_range' IS NOT NULL)
                           THEN 'catalogo_periodizacao' ELSE 'protocolo_generico' END;

    v_dia_treino := jsonb_build_object(
      'neural', fn_montar_bloco_exercicios(v_protocol.block_neural, 1, p_aluno_id::text || ':' || p_data::text || ':neural'),
      'integracao', fn_montar_bloco_exercicios(v_protocol.block_integration, 1, p_aluno_id::text || ':' || p_data::text || ':integration'),
      'bloco9', fn_montar_bloco9_exercicios(
                  v_bloco9_termo,
                  v_sets_b9,
                  v_grupos,
                  v_rpe_b9,
                  v_rest_b9,
                  v_cadence_b9,
                  v_reps_b9,
                  p_aluno_id::text || ':' || p_data::text || ':block9'
                ),
      'reset', fn_montar_bloco_exercicios(v_protocol.block_reset, 1, p_aluno_id::text || ':' || p_data::text || ':reset')
    );

    v_dia_treino := jsonb_build_object(
      'neural', (SELECT coalesce(jsonb_agg(t.x ORDER BY t.ord),'[]'::jsonb)
                 FROM jsonb_array_elements(v_dia_treino->'neural') WITH ORDINALITY AS t(x,ord)
                 JOIN public.exercises e ON e.id=(t.x->>'id')::uuid
                 WHERE public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)), v_grupos)
                   AND (p_evitar_regiao IS NULL
                        OR NOT (coalesce(e.instructions,'') ILIKE '%'||p_evitar_regiao||'%'
                                OR coalesce(e.description,'') ILIKE '%'||p_evitar_regiao||'%'
                                OR coalesce(e.name,'') ILIKE '%'||p_evitar_regiao||'%'))),
      'integracao', (SELECT coalesce(jsonb_agg(t.x ORDER BY t.ord),'[]'::jsonb)
                 FROM jsonb_array_elements(v_dia_treino->'integracao') WITH ORDINALITY AS t(x,ord)
                 JOIN public.exercises e ON e.id=(t.x->>'id')::uuid
                 WHERE public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)), v_grupos)
                   AND (p_evitar_regiao IS NULL
                        OR NOT (coalesce(e.instructions,'') ILIKE '%'||p_evitar_regiao||'%'
                                OR coalesce(e.description,'') ILIKE '%'||p_evitar_regiao||'%'
                                OR coalesce(e.name,'') ILIKE '%'||p_evitar_regiao||'%'))),
      'bloco9', (SELECT coalesce(jsonb_agg(t.x ORDER BY t.ord),'[]'::jsonb)
                 FROM jsonb_array_elements(coalesce(v_dia_treino->'bloco9','[]'::jsonb)) WITH ORDINALITY AS t(x,ord)
                 LEFT JOIN public.exercises e ON e.id=(t.x->>'id')::uuid
                 WHERE p_evitar_regiao IS NULL
                        OR NOT (coalesce(e.instructions,'') ILIKE '%'||p_evitar_regiao||'%'
                                OR coalesce(e.description,'') ILIKE '%'||p_evitar_regiao||'%'
                                OR coalesce(e.name,'') ILIKE '%'||p_evitar_regiao||'%')),
      'reset', (SELECT coalesce(jsonb_agg(t.x ORDER BY t.ord),'[]'::jsonb)
                 FROM jsonb_array_elements(v_dia_treino->'reset') WITH ORDINALITY AS t(x,ord)
                 JOIN public.exercises e ON e.id=(t.x->>'id')::uuid
                 WHERE public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)), v_grupos)
                   AND (p_evitar_regiao IS NULL
                        OR NOT (coalesce(e.instructions,'') ILIKE '%'||p_evitar_regiao||'%'
                                OR coalesce(e.description,'') ILIKE '%'||p_evitar_regiao||'%'
                                OR coalesce(e.name,'') ILIKE '%'||p_evitar_regiao||'%')))
    );
  END IF;

  IF (v_is_cardio AND jsonb_array_length(coalesce(v_dia_treino->'cardio','[]'::jsonb))=0)
     OR (NOT v_is_cardio AND (jsonb_array_length(coalesce(v_dia_treino->'neural','[]'::jsonb))=0 OR jsonb_array_length(coalesce(v_dia_treino->'integracao','[]'::jsonb))=0 OR jsonb_array_length(coalesce(v_dia_treino->'bloco9','[]'::jsonb))=0 OR jsonb_array_length(coalesce(v_dia_treino->'reset','[]'::jsonb))=0)) THEN
    UPDATE public.daily_workouts SET prescription_issue='unmatched_prescription_requires_review'
    WHERE athlete_id=p_aluno_id AND workout_date=p_data AND workout_type IS DISTINCT FROM 'quick';
    RETURN json_build_object('sucesso',false,'motivo','unmatched_prescription_requires_review',
      'sugestao_cta', CASE WHEN p_evitar_regiao IS NOT NULL
        THEN 'Nenhum exercício seguro encontrado evitando a região informada: revisão manual necessária.'
        ELSE 'Solicite revisão ao profissional: há instrução sem exercício correspondente.' END);
  END IF;

  SELECT id INTO v_daily_workout_id
  FROM daily_workouts
  WHERE athlete_id = p_aluno_id AND workout_date = p_data
    AND workout_type IS DISTINCT FROM 'quick' ORDER BY created_at DESC,id LIMIT 1;

  IF v_daily_workout_id IS NULL THEN
    INSERT INTO daily_workouts (athlete_id, workout_date, day_number, day_name, focus_muscles, workout_type)
    VALUES (
      p_aluno_id, p_data, v_semana_atual,
      'Treino — ' || COALESCE(v_protocol.protocol_name, 'Hoje'),
      COALESCE(v_grupos, ARRAY[]::text[]),
      CASE WHEN v_is_cardio THEN 'endurance'
           WHEN v_protocol.pillar = 'performance' THEN 'endurance'
           WHEN v_protocol.pillar = 'longevidade' THEN 'recovery'
           ELSE 'hypertrophy' END
    )
    RETURNING id INTO v_daily_workout_id;
  ELSE
    UPDATE daily_workouts SET ajustes_anteriores = changes_json WHERE id = v_daily_workout_id AND changes_json IS NOT NULL AND changes_json <> '{}'::jsonb;
    DELETE FROM workout_exercises WHERE daily_workout_id = v_daily_workout_id;
    UPDATE daily_workouts SET
      day_name = 'Treino — ' || COALESCE(v_protocol.protocol_name, 'Hoje'),
      focus_muscles = COALESCE(v_grupos, focus_muscles),
      override_locked = false,
      changes_json = '{}'::jsonb,
      updated_at = now()
    WHERE id = v_daily_workout_id;
  END IF;

  v_order := 0;
  IF v_is_cardio THEN
    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_dia_treino->'cardio') LOOP
      v_order := v_order + 1;
      INSERT INTO workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target, tempo, observations, selection_rationale)
      VALUES (v_daily_workout_id, (v_slot->>'id')::uuid, v_order, COALESCE((v_slot->>'series')::int,1), COALESCE(v_slot->>'reps','1'), COALESCE(NULLIF(regexp_replace(v_slot->>'descanso','[^0-9]','','g'),'')::int,60), (v_slot->>'rpe')::int, v_slot->>'cadencia', jsonb_build_object('notes', v_slot->>'nota_tecnica', 'bloco','cardio'), v_slot->'selection_rationale');
      v_rows_inserted := v_rows_inserted + 1;
    END LOOP;
  ELSE
    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_dia_treino->'neural') LOOP
      v_order := v_order + 1;
      INSERT INTO workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target, tempo, observations, selection_rationale)
      VALUES (v_daily_workout_id, (v_slot->>'id')::uuid, v_order, COALESCE((v_slot->>'series')::int,1), COALESCE(v_slot->>'reps','1'), COALESCE(NULLIF(regexp_replace(v_slot->>'descanso','[^0-9]','','g'),'')::int,30), (v_slot->>'rpe')::int, v_slot->>'cadencia', jsonb_build_object('notes', v_slot->>'nota_tecnica', 'bloco','neural'), v_slot->'selection_rationale');
      v_rows_inserted := v_rows_inserted + 1;
    END LOOP;
    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_dia_treino->'integracao') LOOP
      v_order := v_order + 1;
      INSERT INTO workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target, tempo, observations, selection_rationale)
      VALUES (v_daily_workout_id, (v_slot->>'id')::uuid, v_order, COALESCE((v_slot->>'series')::int,1), COALESCE(v_slot->>'reps','1'), COALESCE(NULLIF(regexp_replace(v_slot->>'descanso','[^0-9]','','g'),'')::int,30), (v_slot->>'rpe')::int, v_slot->>'cadencia', jsonb_build_object('notes', v_slot->>'nota_tecnica', 'bloco','integracao'), v_slot->'selection_rationale');
      v_rows_inserted := v_rows_inserted + 1;
    END LOOP;
    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_dia_treino->'bloco9') LOOP
      v_order := v_order + 1;
      INSERT INTO workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target, tempo, observations, selection_rationale)
      VALUES (v_daily_workout_id, (v_slot->>'id')::uuid, v_order, COALESCE((v_slot->>'series')::int,3), COALESCE(v_slot->>'reps','10'), COALESCE(NULLIF(regexp_replace(v_slot->>'descanso','[^0-9]','','g'),'')::int,60), (v_slot->>'rpe')::int, v_slot->>'cadencia', jsonb_build_object('notes', v_slot->>'nota_tecnica', 'bloco','bloco9'), v_slot->'selection_rationale');
      v_rows_inserted := v_rows_inserted + 1;
    END LOOP;
    FOR v_slot IN SELECT * FROM jsonb_array_elements(v_dia_treino->'reset') LOOP
      v_order := v_order + 1;
      INSERT INTO workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target, tempo, observations, selection_rationale)
      VALUES (v_daily_workout_id, (v_slot->>'id')::uuid, v_order, COALESCE((v_slot->>'series')::int,1), COALESCE(v_slot->>'reps','1'), COALESCE(NULLIF(regexp_replace(v_slot->>'descanso','[^0-9]','','g'),'')::int,30), (v_slot->>'rpe')::int, v_slot->>'cadencia', jsonb_build_object('notes', v_slot->>'nota_tecnica', 'bloco','reset'), v_slot->'selection_rationale');
      v_rows_inserted := v_rows_inserted + 1;
    END LOOP;
  END IF;

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
      'fase', COALESCE(v_catalogo->>'current_phase', v_wave.wave_label, 'Fase não definida'),
      'foco_dia', v_foco_dia,
      'protocolo', v_protocol.protocol_name,
      'protocol_code', v_protocol.id,
      'variacao', v_protocol.variation_name,
      'pillar', v_protocol.pillar,
      'modalidade', CASE WHEN v_is_cardio THEN 'cardio' ELSE 'resistance' END,
      'grupo_muscular_dia', CASE WHEN v_is_cardio THEN NULL ELSE v_grupos END,
      'volume_enfase_aplicado', (NOT v_is_cardio AND v_grupos_enfase IS NOT NULL AND array_length(v_grupos_enfase,1) > 0),
      'regiao_evitada', p_evitar_regiao,
      'fonte_parametros_bloco9', v_fonte_parametros
    ),
    'parametros', json_build_object(
      'rpe_alvo', COALESCE(v_rpe_b9, v_protocol.rpe_range),
      'descanso_padrao', COALESCE(v_rest_b9, '60') || 's',
      'cadencia_padrao', COALESCE(v_cadence_b9, 'padrão'),
      'duracao_estimada', '45-60min',
      'reps_range', COALESCE(v_reps_b9, '8-12'),
      'progressao', 'technique_first'
    ),
    'treino', v_dia_treino
  );

  UPDATE public.daily_workouts SET prescription_issue=NULL,prescription_snapshot=v_result::jsonb-'treino'
  WHERE id=v_daily_workout_id;
  RETURN v_result;
END;
$function$;
;
