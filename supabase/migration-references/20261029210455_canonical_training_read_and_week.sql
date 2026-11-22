
ALTER TABLE public.daily_workouts ADD COLUMN IF NOT EXISTS prescription_snapshot jsonb;
COMMENT ON COLUMN public.daily_workouts.prescription_snapshot IS 'Context and parameters at generation; doses are always read from workout_exercises.';
CREATE OR REPLACE FUNCTION public.fn_get_saved_prescription(p_aluno_id uuid,p_data date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid:=coalesce(p_aluno_id,public.fn_current_athlete_id()); w public.daily_workouts%rowtype;
 blocks jsonb; snapshot jsonb; row_count int; athlete_name text;
BEGIN
 PERFORM private.fitpro_require_current_access();
 PERFORM fitpro_internal.assert_athlete_access(a);
 IF a IS NULL OR p_data IS NULL THEN RAISE EXCEPTION 'athlete_and_date_required';END IF;
 SELECT count(*) INTO row_count FROM public.daily_workouts d WHERE d.athlete_id=a AND d.workout_date=p_data AND d.workout_type IS DISTINCT FROM 'quick';
 IF row_count=0 THEN RETURN jsonb_build_object('sucesso',false,'motivo','saved_prescription_not_found');END IF;
 IF row_count>1 THEN RETURN jsonb_build_object('sucesso',false,'motivo','multiple_prescriptions_requires_review');END IF;
 SELECT * INTO w FROM public.daily_workouts d WHERE d.athlete_id=a AND d.workout_date=p_data AND d.workout_type IS DISTINCT FROM 'quick';
 IF w.prescription_issue IS NOT NULL THEN
  RETURN jsonb_build_object('sucesso',false,'motivo',w.prescription_issue,'daily_workout_id',w.id);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workout_exercises e WHERE e.daily_workout_id=w.id) THEN
  RETURN jsonb_build_object('sucesso',false,'motivo','empty_prescription_requires_review','daily_workout_id',w.id);
 END IF;
 SELECT jsonb_object_agg(b.key,coalesce((
  SELECT jsonb_agg(jsonb_build_object(
   'id',e.exercise_id,'workout_exercise_id',e.id,'nome',coalesce(c.name,e.exercise_name),
   'series',e.sets,'reps',e.reps_range,'rpe',e.rpe_target,
   'descanso',e.rest_seconds::text||'s','cadencia',e.tempo,
   'nota_tecnica',coalesce(e.observations->>'notes',e.notes),
   'video_url',c.video_url,'grupo_muscular',c.target_muscles[1])
   ORDER BY e.exercise_order,e.id)
  FROM public.workout_exercises e LEFT JOIN public.exercises c ON c.id=e.exercise_id
  WHERE e.daily_workout_id=w.id AND
   CASE WHEN e.observations->>'bloco' IN('neural','integracao','bloco9','reset')
    THEN e.observations->>'bloco' ELSE 'bloco9' END=b.key
 ),'[]'::jsonb)) INTO blocks FROM (VALUES('neural'),('integracao'),('bloco9'),('reset'))b(key);
 SELECT name INTO athlete_name FROM public.athletes WHERE id=a;
 snapshot:=coalesce(w.prescription_snapshot,'{}'::jsonb);
 RETURN snapshot||jsonb_build_object('sucesso',true,'preserved',true,'data',p_data,'daily_workout_id',w.id,
  'contexto',coalesce(snapshot->'contexto',jsonb_build_object('aluno_id',a,'aluno_nome',athlete_name,
   'semana_atual',NULL,'fase','contexto histórico não registrado','protocolo',w.day_name)),
  'treino',blocks);
END $$;
REVOKE ALL ON FUNCTION public.fn_get_saved_prescription(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_get_saved_prescription(uuid,date) TO authenticated,service_role;

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
  v_foco_dia jsonb;
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
BEGIN
 PERFORM private.fitpro_require_current_access();
  PERFORM fitpro_internal.assert_athlete_access(p_aluno_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_aluno_id::text || p_data::text,0));
  -- Reopening a saved prescription is a read, including its current Sync doses.
  IF EXISTS(SELECT 1 FROM public.daily_workouts d WHERE d.athlete_id=p_aluno_id
      AND d.workout_date=p_data AND d.workout_type IS DISTINCT FROM 'quick')
     AND NOT EXISTS(SELECT 1 FROM public.daily_workouts d WHERE d.athlete_id=p_aluno_id
      AND d.workout_date=p_data AND d.workout_type IS DISTINCT FROM 'quick'
      AND d.changes_json->>'_force_represcricao'='true') THEN
    RETURN public.fn_get_saved_prescription(p_aluno_id,p_data)::json;
  END IF;
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_aluno_id AND workout_date=p_data AND status IN ('started','in_progress','paused','completed','skipped')) THEN
    RAISE EXCEPTION 'workout_prescription_locked' USING ERRCODE='55000';
  END IF;

  SELECT override_locked, changes_json INTO v_locked, v_changes
  FROM public.daily_workouts
  WHERE athlete_id = p_aluno_id AND workout_date = p_data
    AND workout_type IS DISTINCT FROM 'quick' ORDER BY created_at DESC,id LIMIT 1;

  v_force := COALESCE((v_changes->>'_force_represcricao')::boolean, false);

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

  v_foco_dia := public.fn_decidir_foco_dia(p_aluno_id, p_data);

  -- NOVO (29/10): linhas de smart_treino_protocols marcadas com
  -- block_9_template.requires_approval=true (jejum/low-carb/train-low, BFR, Wim Hof,
  -- PNF cervical, Jefferson curl, depth jumps, double day etc.) descrevem protocolos de
  -- risco elevado que exigem avaliação prévia de um profissional. Até existir um fluxo de
  -- aprovação explícita por aluno, essas linhas ficam fora do sorteio aleatório de protocolo
  -- — nunca chegam à prescrição automática. Isso fecha a lacuna em que o requires_approval
  -- era só metadado no catálogo e não impedia a seleção real.
  IF (v_foco_dia->>'tem_wave_ativa')::boolean IS TRUE THEN
    SELECT * INTO v_protocol FROM smart_treino_protocols
    WHERE protocol_id = (v_foco_dia->>'protocol_sugerido')::int
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

  IF NOT public.fn_protocol_strength_compatible(v_protocol.id) THEN
    RETURN json_build_object('sucesso', false, 'motivo', 'protocolo_modalidade_incompativel',
      'sugestao_cta', 'Este protocolo exige uma sessão de distância/duração. Não use a geração de exercícios de musculação.');
  END IF;

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


  v_dia_treino := jsonb_build_object(
    'neural', (SELECT coalesce(jsonb_agg(t.x ORDER BY t.ord),'[]'::jsonb)
               FROM jsonb_array_elements(v_dia_treino->'neural') WITH ORDINALITY AS t(x,ord)
               JOIN public.exercises e ON e.id=(t.x->>'id')::uuid
               WHERE public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)), v_grupos)),
    'integracao', (SELECT coalesce(jsonb_agg(t.x ORDER BY t.ord),'[]'::jsonb)
               FROM jsonb_array_elements(v_dia_treino->'integracao') WITH ORDINALITY AS t(x,ord)
               JOIN public.exercises e ON e.id=(t.x->>'id')::uuid
               WHERE public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)), v_grupos)),
    'bloco9', coalesce(v_dia_treino->'bloco9','[]'::jsonb),
    'reset', (SELECT coalesce(jsonb_agg(t.x ORDER BY t.ord),'[]'::jsonb)
               FROM jsonb_array_elements(v_dia_treino->'reset') WITH ORDINALITY AS t(x,ord)
               JOIN public.exercises e ON e.id=(t.x->>'id')::uuid
               WHERE public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)), v_grupos))
  );
  IF jsonb_array_length(coalesce(v_dia_treino->'bloco9','[]'::jsonb))=0 THEN
    UPDATE public.daily_workouts SET prescription_issue='unmatched_prescription_requires_review'
    WHERE athlete_id=p_aluno_id AND workout_date=p_data AND workout_type IS DISTINCT FROM 'quick';
    RETURN json_build_object('sucesso',false,'motivo','unmatched_prescription_requires_review',
      'sugestao_cta','Solicite revisão ao profissional: há instrução sem exercício correspondente.');
  END IF;

  SELECT id INTO v_daily_workout_id
  FROM daily_workouts
  WHERE athlete_id = p_aluno_id AND workout_date = p_data
    AND workout_type IS DISTINCT FROM 'quick' ORDER BY created_at DESC,id LIMIT 1;

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
      override_locked = false,
      changes_json = '{}'::jsonb,
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
      'foco_dia', v_foco_dia,
      'protocolo', v_protocol.protocol_name,
      'protocol_code', v_protocol.id,
      'variacao', v_protocol.variation_name,
      'pillar', v_protocol.pillar,
      'grupo_muscular_dia', v_grupos,
      'volume_enfase_aplicado', (v_grupos_enfase IS NOT NULL AND array_length(v_grupos_enfase,1) > 0)
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

  UPDATE public.daily_workouts SET prescription_issue=NULL,prescription_snapshot=v_result::jsonb-'treino'
  WHERE id=v_daily_workout_id;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_generate_periodized_week(p_athlete_id uuid, p_week_start date, p_days_week integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_week_start date := p_week_start;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_today_week date := date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_frequency integer;
  v_day integer;
  v_weekday integer;
  v_date date;
  v_existing boolean;
  v_result json;
  v_generated integer := 0;
  v_preserved integer := 0;
  v_days integer[];
  v_failed integer:=0;
  v_results jsonb:='[]'::jsonb;
BEGIN
 PERFORM private.fitpro_require_current_access();
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  IF v_week_start IS NULL OR extract(isodow FROM v_week_start) <> 1 THEN
    RAISE EXCEPTION 'week_start_must_be_monday' USING ERRCODE = '22023';
  END IF;
  IF v_week_start < v_today_week OR v_week_start > v_today_week + 84 THEN
    RAISE EXCEPTION 'week_outside_generation_window' USING ERRCODE = '22023';
  END IF;
  IF p_days_week IS NOT NULL AND p_days_week NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'invalid_week_frequency' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || ':periodized-week:' || v_week_start::text, 0));

  IF NOT EXISTS (
    SELECT 1 FROM public.athlete_periodizations ap
    WHERE ap.athlete_id = p_athlete_id AND ap.status IN ('active', 'in_progress')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_active_periodization', 'generated', 0, 'preserved', 0);
  END IF;

  SELECT coalesce(
    p_days_week,
    (SELECT mr.weekly_frequency FROM public.smart_treino_macro_rules mr
      WHERE mr.aluno_id = p_athlete_id AND mr.status = 'active'
      ORDER BY mr.created_at DESC LIMIT 1),
    a.sessions_per_week,
    3
  )
  INTO v_frequency
  FROM public.athletes a
  WHERE a.id = p_athlete_id;
  v_frequency := greatest(1, least(coalesce(v_frequency, 3), 7));

  v_days := CASE v_frequency
    WHEN 1 THEN ARRAY[1]
    WHEN 2 THEN ARRAY[1, 5]
    WHEN 3 THEN ARRAY[1, 3, 5]
    WHEN 4 THEN ARRAY[1, 3, 5, 7]
    WHEN 5 THEN ARRAY[1, 2, 4, 5, 6]
    WHEN 6 THEN ARRAY[1, 2, 3, 4, 5, 6]
    ELSE ARRAY[1, 2, 3, 4, 5, 6, 7]
  END;

  FOR v_day IN 1..7 LOOP
    v_date := v_week_start + v_day - 1;
    v_weekday := v_day;
    IF v_date < v_today OR NOT (v_weekday = ANY(v_days)) THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.daily_workouts dw
      WHERE dw.athlete_id = p_athlete_id AND dw.workout_date = v_date AND dw.workout_type IS DISTINCT FROM 'quick'
      UNION ALL
      SELECT 1 FROM public.workout_executions we
      WHERE we.athlete_id = p_athlete_id AND we.workout_date = v_date
        AND we.status IN ('started', 'in_progress', 'paused', 'completed', 'skipped')
    ) INTO v_existing;

    IF v_existing THEN
      IF EXISTS(SELECT 1 FROM public.daily_workouts d WHERE d.athlete_id=p_athlete_id AND d.workout_date=v_date
         AND d.workout_type IS DISTINCT FROM 'quick' AND (d.prescription_issue IS NOT NULL OR NOT EXISTS(
          SELECT 1 FROM public.workout_exercises e WHERE e.daily_workout_id=d.id))) THEN
        v_failed:=v_failed+1;
        v_results:=v_results||jsonb_build_array(jsonb_build_object('date',v_date,'status','review_required','reason','saved_prescription_requires_review'));
        CONTINUE;
      END IF;
      v_preserved := v_preserved + 1;
      CONTINUE;
    END IF;

    BEGIN
      v_result := public.prescrever_treino(p_athlete_id,v_date);
      IF coalesce(v_result->>'sucesso','false')='true' AND nullif(v_result->>'daily_workout_id','') IS NOT NULL THEN
        v_generated:=v_generated+1;
        v_results:=v_results||jsonb_build_array(jsonb_build_object('date',v_date,'status','generated','daily_workout_id',v_result->>'daily_workout_id'));
      ELSE
        v_failed:=v_failed+1;
        v_results:=v_results||jsonb_build_array(jsonb_build_object('date',v_date,'status','review_required','reason',coalesce(v_result->>'motivo','unknown')));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed:=v_failed+1;
      v_results:=v_results||jsonb_build_array(jsonb_build_object('date',v_date,'status','failed','reason',SQLSTATE));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', v_failed=0,
    'partial', v_failed>0 AND v_generated+v_preserved>0,
    'failed',v_failed,'days',v_results,
    'week_start', v_week_start,
    'week_end', v_week_start + 6,
    'weekly_frequency', v_frequency,
    'generated', v_generated,
    'preserved', v_preserved
  );
END;
$function$;


CREATE INDEX IF NOT EXISTS smart_rules_active_athlete_idx ON public.smart_treino_macro_rules(aluno_id) WHERE status='active';
CREATE OR REPLACE FUNCTION public.fn_coach_training_setup_queue(p_limit int DEFAULT 20,p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); actor_role text:=private.fitpro_actor_role(); result jsonb;
BEGIN
 IF actor IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
   OR actor_role IS NULL OR actor_role NOT IN('admin','super_admin','professor','trainer') THEN
  RAISE EXCEPTION 'staff_required' USING ERRCODE='42501';
 END IF;
 WITH pending AS MATERIALIZED(
  SELECT a.id,a.name,a.created_at,
   EXISTS(SELECT 1 FROM public.athlete_periodizations p WHERE p.athlete_id=a.id AND p.status IN('active','in_progress')) AS has_periodization,
   EXISTS(SELECT 1 FROM public.student_training_assignments s WHERE s.student_id=a.id AND s.is_active
    AND (s.start_date IS NULL OR s.start_date<=(now() AT TIME ZONE 'America/Sao_Paulo')::date)
    AND (s.end_date IS NULL OR s.end_date>=(now() AT TIME ZONE 'America/Sao_Paulo')::date)) AS has_manual_assignment
  FROM public.athletes a WHERE a.is_test_account IS NOT TRUE
   AND (actor_role IN('admin','super_admin') OR a.coach_id=actor)
   AND NOT EXISTS(SELECT 1 FROM public.smart_treino_macro_rules r WHERE r.aluno_id=a.id AND r.status='active')
 ), page AS(
  SELECT * FROM pending ORDER BY has_manual_assignment,has_periodization,created_at,id
   LIMIT greatest(1,least(coalesce(p_limit,20),100)) OFFSET greatest(coalesce(p_offset,0),0)
 )
 SELECT jsonb_build_object('total',(SELECT count(*) FROM pending),'items',coalesce((
  SELECT jsonb_agg(to_jsonb(p)||jsonb_build_object('latest_workout',(
   SELECT max(d.workout_date) FROM public.daily_workouts d WHERE d.athlete_id=p.id AND d.prescription_issue IS NULL
  )) ORDER BY p.has_manual_assignment,p.has_periodization,p.created_at,p.id) FROM page p
 ),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.fn_coach_training_setup_queue(int,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_coach_training_setup_queue(int,int) TO authenticated;

