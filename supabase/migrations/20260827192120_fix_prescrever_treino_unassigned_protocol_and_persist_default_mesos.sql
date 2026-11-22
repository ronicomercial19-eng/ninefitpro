-- Fix 1: prescrever_treino crashava com "record v_protocol is not assigned yet"
-- quando o aluno não tinha smart_treino_macro_rules ativo (protocol_code NULL),
-- pois o SELECT INTO v_protocol só rodava dentro do IF, deixando o record
-- completamente não-atribuído antes do teste v_protocol.id IS NULL.
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
BEGIN
  -- Garante que v_protocol esteja "atribuído" (ainda que vazio) antes de qualquer teste .id
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
    'neural', fn_montar_bloco_exercicios(v_protocol.block_neural, 1),
    'integracao', fn_montar_bloco_exercicios(v_protocol.block_integration, 1),
    'bloco9', fn_montar_bloco9_exercicios(
                v_bloco9_termo,
                COALESCE((v_protocol.block_9_template->>'sets')::int, 3),
                v_grupos,
                v_protocol.block_9_template->>'rpe',
                v_protocol.block_9_template->>'rest',
                v_protocol.block_9_template->>'cadence',
                v_protocol.block_9_template->>'reps'
              ),
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

-- Fix 2: sync_fitpro_planejamento sintetizava mesociclos default quando vazios,
-- mas só gravava no snapshot (fitpro_smartperiodizer_periodizations.payload),
-- nunca em periodization_annual_plans.mesocycles. Resultado: a view
-- vw_athlete_periodizacao_ativa continuava vendo mesocycles=[] e nunca
-- preenchia rpe_cap/reps_range, quebrando fn_sync_macro_rules_from_periodization
-- (que exige rpe_cap não-nulo) e, em cascata, prescrever_treino.
CREATE OR REPLACE FUNCTION public.sync_fitpro_planejamento(p_athlete_id uuid, p_origin text DEFAULT 'trigger'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment RECORD;
  v_plan RECORD;
  v_snap_id uuid;
  v_level text;
  v_phase text;
  v_cycle text;
  v_ondas jsonb;
  v_payload jsonb;
  v_mesos jsonb;
  v_master_rules jsonb;
  v_macros jsonb;
  v_goal text;
  v_mesos_were_empty boolean;
BEGIN
  IF p_athlete_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_assignment
    FROM public.athlete_periodizations
   WHERE athlete_id = p_athlete_id
     AND status IN ('in_progress','active')
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND OR v_assignment.annual_plan_id IS NULL THEN
    INSERT INTO public.logs_sincronizacao (tipo, status, dados_enviados, erro)
    VALUES ('sync_fitpro_planejamento', 'skipped',
            jsonb_build_object('athlete_id', p_athlete_id, 'origin', p_origin),
            'no active assignment / annual_plan_id');
    RETURN NULL;
  END IF;

  SELECT * INTO v_plan
    FROM public.periodization_annual_plans
   WHERE id = v_assignment.annual_plan_id;

  IF NOT FOUND THEN
    INSERT INTO public.logs_sincronizacao (tipo, status, dados_enviados, erro)
    VALUES ('sync_fitpro_planejamento', 'skipped',
            jsonb_build_object('athlete_id', p_athlete_id, 'origin', p_origin),
            'annual_plan not found');
    RETURN NULL;
  END IF;

  v_goal := COALESCE(lower(v_plan.annual_goal), 'hipertrofia');
  v_mesos := COALESCE(v_plan.mesocycles, '[]'::jsonb);
  v_macros := COALESCE(v_plan.macrocycles, '[]'::jsonb);
  v_master_rules := COALESCE(v_plan.master_rules, '{}'::jsonb);
  v_mesos_were_empty := (jsonb_array_length(v_mesos) = 0);

  IF v_mesos_were_empty THEN
    v_mesos := CASE
      WHEN v_goal IN ('forca','força','strength') THEN jsonb_build_array(
        jsonb_build_object('name','Base','phase','base','weeks',4,'rpe_cap',7,'reps_range','6-8','sets_range','3-4'),
        jsonb_build_object('name','Força Máxima','phase','strength','weeks',4,'rpe_cap',9,'reps_range','3-5','sets_range','4-5'),
        jsonb_build_object('name','Peaking','phase','peaking','weeks',3,'rpe_cap',10,'reps_range','1-3','sets_range','3-5'),
        jsonb_build_object('name','Deload','phase','recovery','weeks',1,'rpe_cap',6,'reps_range','5-8','sets_range','2-3')
      )
      WHEN v_goal IN ('resistencia','resistência','endurance') THEN jsonb_build_array(
        jsonb_build_object('name','Base Aeróbica','phase','base','weeks',4,'rpe_cap',6,'reps_range','15-20','sets_range','3'),
        jsonb_build_object('name','Tempo','phase','tempo','weeks',4,'rpe_cap',7,'reps_range','12-15','sets_range','3-4'),
        jsonb_build_object('name','Limiar','phase','threshold','weeks',4,'rpe_cap',8,'reps_range','10-12','sets_range','4'),
        jsonb_build_object('name','Recuperação','phase','recovery','weeks',1,'rpe_cap',5,'reps_range','15','sets_range','2')
      )
      ELSE jsonb_build_array(
        jsonb_build_object('name','Acumulação','phase','hypertrophy','weeks',4,'rpe_cap',7,'reps_range','10-12','sets_range','3-4'),
        jsonb_build_object('name','Intensificação','phase','hypertrophy','weeks',4,'rpe_cap',9,'reps_range','8-10','sets_range','4'),
        jsonb_build_object('name','Realização','phase','strength','weeks',3,'rpe_cap',10,'reps_range','6-8','sets_range','4-5'),
        jsonb_build_object('name','Deload','phase','recovery','weeks',1,'rpe_cap',6,'reps_range','10','sets_range','2-3')
      )
    END;

    -- Persiste o default sintetizado de volta no plano anual, para que a view
    -- (vw_athlete_periodizacao_ativa) e fn_sync_macro_rules_from_periodization
    -- enxerguem os mesmos dados usados no snapshot, em vez de continuarem
    -- vendo mesocycles=[] indefinidamente.
    UPDATE public.periodization_annual_plans
       SET mesocycles = v_mesos, updated_at = now()
     WHERE id = v_plan.id AND jsonb_array_length(COALESCE(mesocycles,'[]'::jsonb)) = 0;
  END IF;

  IF v_master_rules = '{}'::jsonb THEN
    v_master_rules := jsonb_build_object(
      'volume','moderate',
      'intensity','moderate',
      'recovery','auto',
      'deload_every',4
    );
  END IF;

  v_level := COALESCE(
    CASE jsonb_typeof(v_plan.dominant_profile)
      WHEN 'string' THEN v_plan.dominant_profile #>> '{}'
      WHEN 'object' THEN v_plan.dominant_profile ->> 'name'
      ELSE NULL
    END,
    'intermediario'
  );

  v_phase := COALESCE((v_mesos -> 0 ->> 'name'), (v_mesos -> 0 ->> 'phase'), 'adaptacao');
  v_cycle := COALESCE((v_macros -> 0 ->> 'name'), 'macro-1');

  WITH mesos AS (
    SELECT m, ord, COALESCE((m->>'weeks')::int, 4) AS w
      FROM jsonb_array_elements(v_mesos) WITH ORDINALITY AS t(m, ord)
  ), cumulative AS (
    SELECT m, ord, w,
           COALESCE(SUM(w) OVER (ORDER BY ord ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) + 1 AS start_week,
           SUM(w) OVER (ORDER BY ord) AS end_week
      FROM mesos
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'nome', COALESCE(m ->> 'name', m ->> 'phase', 'Onda ' || (ord::text)),
      'phase', m ->> 'phase',
      'weeks', w,
      'start_week', start_week,
      'end_week', end_week,
      'status', CASE WHEN ord = 1 THEN 'in_progress' ELSE 'pending' END,
      'rpe_cap', COALESCE(m -> 'rpe_cap', m -> 'rpe'),
      'reps', COALESCE(m -> 'reps_range', m -> 'reps'),
      'sets', COALESCE(m -> 'sets_range', m -> 'sets')
    ) ORDER BY ord
  ), '[]'::jsonb)
  INTO v_ondas
  FROM cumulative;

  v_payload := jsonb_build_object(
    'annual_goal',        v_plan.annual_goal,
    'dominant_profile',   v_plan.dominant_profile,
    'scores',             COALESCE(v_plan.scores, '{}'::jsonb),
    'flags',              COALESCE(v_plan.flags, '[]'::jsonb),
    'selected_chief_id',  v_plan.selected_chief_id,
    'selected_model_id',  v_plan.selected_model_id,
    'master_rules',       v_master_rules,
    'macrocycles',        v_macros,
    'mesocycles',         v_mesos,
    'micro_rules',        COALESCE(v_plan.micro_rules, '{}'::jsonb),
    'output_json',        COALESCE(v_plan.output_json, '{}'::jsonb),
    'ondas',              v_ondas,
    'synced_at',          now(),
    'sync_origin',        p_origin
  );

  INSERT INTO public.fitpro_smartperiodizer_periodizations (
    fitpro_student_id, fitpro_professor_id, smartperiodizer_periodization_id,
    goal, training_level, current_phase, current_cycle, cycle_week,
    status, payload, updated_at
  ) VALUES (
    p_athlete_id, v_plan.coach_id, v_plan.id::text,
    COALESCE(v_plan.annual_goal, 'geral'), v_level, v_phase, v_cycle, 1,
    'active', v_payload, now()
  )
  ON CONFLICT (smartperiodizer_periodization_id) DO UPDATE
    SET fitpro_student_id = EXCLUDED.fitpro_student_id,
        fitpro_professor_id = EXCLUDED.fitpro_professor_id,
        goal = EXCLUDED.goal,
        training_level = EXCLUDED.training_level,
        current_phase = EXCLUDED.current_phase,
        current_cycle = EXCLUDED.current_cycle,
        status = 'active',
        payload = EXCLUDED.payload,
        updated_at = now()
  RETURNING id INTO v_snap_id;

  UPDATE public.fitpro_smartperiodizer_periodizations
     SET status = 'archived', updated_at = now()
   WHERE fitpro_student_id = p_athlete_id
     AND id <> v_snap_id
     AND status = 'active';

  -- Regenera as waves e sincroniza o protocolo de treino com a fase atual da periodização
  PERFORM fn_generate_waves_from_periodization(v_snap_id);
  PERFORM fn_sync_macro_rules_from_periodization(p_athlete_id);

  INSERT INTO public.logs_sincronizacao (tipo, status, dados_enviados, dados_resposta)
  VALUES ('sync_fitpro_planejamento', 'success',
          jsonb_build_object('athlete_id', p_athlete_id, 'origin', p_origin),
          jsonb_build_object('snapshot_id', v_snap_id, 'phase', v_phase));

  RETURN v_snap_id;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.periodization_generation_failures
      (athlete_id, plan_id, assignment_id, origin, error_reason, error_detail, payload)
    VALUES (
      p_athlete_id,
      COALESCE(v_assignment.annual_plan_id, NULL),
      COALESCE(v_assignment.id, NULL),
      COALESCE(p_origin, 'trigger'),
      SQLERRM,
      jsonb_build_object('sqlstate', SQLSTATE, 'fn', 'sync_fitpro_planejamento'),
      '{}'::jsonb
    );
    INSERT INTO public.logs_sincronizacao (tipo, status, dados_enviados, erro)
    VALUES ('sync_fitpro_planejamento', 'error',
            jsonb_build_object('athlete_id', p_athlete_id, 'origin', p_origin),
            SQLERRM);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NULL;
END;
$function$;;
