CREATE OR REPLACE FUNCTION public.fn_publicar_ajuste_treino_dia(p_athlete_id uuid, p_data date, p_daily_workout_id uuid, p_expected_updated_at timestamp with time zone, p_changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workout public.daily_workouts%rowtype;
  v_change jsonb;
  v_row public.workout_exercises%rowtype;
  v_replacement uuid;
  v_before jsonb;
  v_after jsonb;
  v_exercises jsonb;
  v_dose text;
  v_saved_at timestamptz;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not (
    exists (select 1 from public.athletes a where a.id = p_athlete_id
      and (a.user_id = auth.uid() or a.coach_id = auth.uid()))
    or exists (select 1 from public.athlete_auth_link l
      where l.athlete_id = p_athlete_id and l.user_id = auth.uid())
  ) then raise exception 'Acesso ao aluno não autorizado' using errcode = '42501'; end if;
  if p_data is null or p_data < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Ajuste apenas a sessão de hoje ou uma sessão futura';
  end if;
  if not exists(select 1 from public.athletes a where a.id=p_athlete_id and a.coach_id=auth.uid())
     and exists(select 1 from public.daily_checkins c where c.athlete_id=p_athlete_id
       and c.checkin_date=(now() at time zone 'America/Sao_Paulo')::date
       and (c.dor>=3 or nullif(btrim(c.dor_local),'') is not null)) then
    raise exception 'Revisão profissional necessária antes de publicar ajustes' using errcode='42501';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'array'
     or jsonb_array_length(p_changes) not between 1 and 100 then
    raise exception 'Lista de alterações inválida';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || p_data::text, 0));
  select * into v_workout from public.daily_workouts
    where id = p_daily_workout_id and athlete_id = p_athlete_id and workout_date = p_data
    for update;
  if not found then raise exception 'Treino não encontrado para este aluno e data'; end if;
  if v_workout.updated_at is distinct from p_expected_updated_at then
    raise exception 'A prescrição mudou desde a abertura da tela. Recarregue antes de publicar.';
  end if;
  if exists (select 1 from public.workout_executions e
    where e.athlete_id = p_athlete_id and e.workout_date = p_data
      and (e.daily_workout_id=p_daily_workout_id OR (e.daily_workout_id IS NULL AND e.phase_name IS DISTINCT FROM 'quick' AND v_workout.workout_type IS DISTINCT FROM 'quick'))
      and e.status in ('started','in_progress','paused','completed','skipped')) then
    raise exception 'Este treino já foi iniciado. Preserve a execução e ajuste uma sessão futura.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(we) order by we.exercise_order, we.id), '[]'::jsonb)
    into v_before from public.workout_exercises we where we.daily_workout_id = v_workout.id;

  for v_change in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(v_change) <> 'object' or nullif(v_change->>'workout_exercise_id','') is null then
      raise exception 'Identificador de exercício ausente';
    end if;
    select * into v_row from public.workout_exercises
      where id = (v_change->>'workout_exercise_id')::uuid and daily_workout_id = v_workout.id for update;
    if not found then raise exception 'Exercício não pertence ao treino'; end if;
    if v_change ? 'sets' and ((v_change->>'sets')::int not between 1 and 10) then
      raise exception 'Séries inválidas'; end if;
    if v_change ? 'rest_seconds' and ((v_change->>'rest_seconds')::int not between 0 and 600) then
      raise exception 'Descanso inválido'; end if;
    if v_change ? 'intensidade' and ((v_change->>'intensidade')::int not between 1 and 10) then
      raise exception 'Intensidade inválida'; end if;
    v_dose := trim(coalesce(v_change->>'reps_range', v_row.reps_range));
    if length(v_dose) not between 1 and 40 or
       (v_dose ~ '^[0-9]+$' and v_dose::numeric >= 100) then
      raise exception 'Dose ambígua. Informe a unidade, por exemplo 400 m ou 40 s.';
    end if;
    v_replacement := null;
    if nullif(trim(v_change->>'new_exercise_name'),'') is not null then
      select e.id into v_replacement from public.exercises e
        where lower(e.name) = lower(trim(v_change->>'new_exercise_name')) order by e.id limit 1;
      if v_replacement is null then raise exception 'Exercício substituto não encontrado na biblioteca'; end if;
    end if;
    update public.workout_exercises set
      exercise_id = coalesce(v_replacement, exercise_id),
      sets = coalesce((v_change->>'sets')::int, sets),
      reps_range = v_dose,
      rest_seconds = coalesce((v_change->>'rest_seconds')::int, rest_seconds),
      rpe_target = coalesce((v_change->>'intensidade')::int, rpe_target),
      override_locked = true
    where id = v_row.id;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(we) order by we.exercise_order, we.id), '[]'::jsonb)
    into v_after from public.workout_exercises we where we.daily_workout_id = v_workout.id;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', we.id, 'exercise_id', we.exercise_id, 'exercise_name', e.name,
      'sets', we.sets, 'reps_range', we.reps_range,
      'rest_seconds', we.rest_seconds, 'intensidade', we.rpe_target,
      'video_url', e.video_url, 'exercise_order', we.exercise_order
    ) order by we.exercise_order, we.id), '[]'::jsonb)
    into v_exercises from public.workout_exercises we
    left join public.exercises e on e.id = we.exercise_id
    where we.daily_workout_id = v_workout.id;

  update public.daily_workouts set
    changes_json = coalesce(changes_json,'{}'::jsonb) || jsonb_build_object('exercises', v_exercises),
    override_locked = true, updated_at = clock_timestamp()
    where id = v_workout.id returning updated_at into v_saved_at;
  insert into public.workout_adjustment_versions
    (daily_workout_id, athlete_id, changed_by, before_exercises, after_exercises)
    values (v_workout.id, p_athlete_id, auth.uid(), v_before, v_after);
  return jsonb_build_object('success', true, 'daily_workout_id', v_workout.id,
    'exercises', v_exercises, 'updated_at', v_saved_at);
end;
$function$;

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
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_aluno_id AND workout_date=p_data AND (daily_workout_id IN (SELECT id FROM public.daily_workouts WHERE athlete_id=p_aluno_id AND workout_date=p_data AND workout_type IS DISTINCT FROM 'quick') OR (daily_workout_id IS NULL AND phase_name IS DISTINCT FROM 'quick')) AND status IN ('started','in_progress','paused','completed','skipped')) THEN
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
      'Treino — ' || COALESCE(v_protocol.protocol_name, 'Hoje'),
      COALESCE(v_grupos, ARRAY[]::text[]),
      CASE WHEN v_protocol.pillar = 'performance' THEN 'endurance'
           WHEN v_protocol.pillar = 'longevidade' THEN 'recovery'
           ELSE 'hypertrophy' END
    )
    RETURNING id INTO v_daily_workout_id;
  ELSE
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
        AND (we.daily_workout_id IN(SELECT id FROM public.daily_workouts WHERE athlete_id=p_athlete_id AND workout_date=v_date AND workout_type IS DISTINCT FROM 'quick') OR (we.daily_workout_id IS NULL AND we.phase_name IS DISTINCT FROM 'quick'))
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

CREATE OR REPLACE FUNCTION public.fn_start_daily_workout_execution(p_daily_workout_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_day public.daily_workouts%ROWTYPE; v_execution_id uuid; v_check public.daily_checkins%ROWTYPE; v_restrictions text;
BEGIN
 PERFORM private.fitpro_require_current_access();
  SELECT * INTO v_day FROM public.daily_workouts WHERE id=p_daily_workout_id AND athlete_id=public.fn_current_athlete_id();
  IF v_day.id IS NULL THEN RAISE EXCEPTION 'daily_workout_access_denied' USING ERRCODE='42501'; END IF;
  IF v_day.prescription_issue IS NOT NULL THEN RAISE EXCEPTION 'invalid_protocol_units: consulte o protocolo atribuído pelo coach' USING ERRCODE='55000'; END IF;
  IF v_day.workout_type='quick' THEN
    IF v_day.workout_date<>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'quick_workout_date_expired'; END IF;
    SELECT * INTO v_check FROM public.daily_checkins WHERE athlete_id=v_day.athlete_id AND checkin_date=v_day.workout_date;
    SELECT injuries_limitations INTO v_restrictions FROM public.athletes WHERE id=v_day.athlete_id;
    IF v_check.id IS NULL OR v_check.sono IS NULL OR v_check.energia IS NULL OR v_check.humor IS NULL OR v_check.motivacao IS NULL OR v_check.dor IS NULL
      OR coalesce(v_check.dor,0)>=3 OR nullif(trim(v_check.dor_local),'') IS NOT NULL
      OR (nullif(trim(v_restrictions),'') IS NOT NULL AND lower(trim(v_restrictions)) NOT IN ('nenhuma','nenhum','não','nao','none','sem restrições','sem restricoes'))
    THEN RAISE EXCEPTION 'quick_workout_requires_review' USING ERRCODE='55000'; END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_day.athlete_id::text||v_day.workout_date::text,0));
  SELECT * INTO v_day FROM public.daily_workouts WHERE id=p_daily_workout_id AND athlete_id=public.fn_current_athlete_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'A sessão foi atualizada. Reabra o treino.';END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workout_exercises WHERE daily_workout_id=v_day.id) THEN RAISE EXCEPTION 'A prescrição não contém exercícios'; END IF;
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND daily_workout_id=v_day.id AND status IN ('completed','skipped')) THEN RAISE EXCEPTION 'Este treino já foi concluído ou dispensado'; END IF;
  IF v_day.workout_type='quick' AND EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND workout_date=v_day.workout_date AND phase_name='quick' AND status='completed') THEN RAISE EXCEPTION 'O treino rápido de hoje já foi concluído'; END IF;
  SELECT id INTO v_execution_id FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND daily_workout_id=v_day.id AND status IN ('started','in_progress','paused') ORDER BY created_at DESC LIMIT 1;
  IF v_execution_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND workout_date=v_day.workout_date AND status IN ('started','in_progress','paused')) THEN RAISE EXCEPTION 'Retome ou finalize sua sessão em andamento primeiro'; END IF;
    INSERT INTO public.workout_executions(athlete_id,daily_workout_id,workout_date,started_at,status,phase_name) VALUES(v_day.athlete_id,v_day.id,v_day.workout_date,now(),'in_progress',CASE WHEN v_day.workout_type='quick' THEN 'quick' ELSE v_day.day_name END) RETURNING id INTO v_execution_id;
  ELSE UPDATE public.workout_executions SET status='in_progress' WHERE id=v_execution_id AND status IN ('started','paused');
  END IF;
  RETURN v_execution_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_treino_rapido(p_athlete_id uuid, p_objetivo text DEFAULT NULL::text, p_tempo_min integer DEFAULT 20, p_equipamento text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_date date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_profile public.athletes%ROWTYPE;
  v_check public.daily_checkins%ROWTYPE;
  v_resources text[];
  v_goal text := CASE WHEN p_objetivo='fatburn' THEN 'cardio' ELSE p_objetivo END;
  v_new boolean := p_equipamento LIKE 'resources:%';
  v_phase text;
  v_sets integer;
  v_reps text;
  v_rest integer;
  v_limit integer;
  v_estimated integer;
  v_id uuid;
  v_exercises json;
  v_restricted boolean := false;
  v_tempo integer := CASE WHEN p_tempo_min BETWEEN 10 AND 75 THEN (SELECT t FROM unnest(ARRAY[15,20,30,45,60]) t ORDER BY abs(t-p_tempo_min), t LIMIT 1) END;
BEGIN
 PERFORM private.fitpro_require_current_access();
  IF auth.uid() IS NULL OR (NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id=p_athlete_id AND (a.user_id=auth.uid() OR a.coach_id=auth.uid())) AND NOT EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=p_athlete_id AND l.user_id=auth.uid())) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501'; END IF;
  IF v_goal IS NULL OR v_goal NOT IN ('strength','cardio','mobility','recovery') OR v_tempo IS NULL THEN RAISE EXCEPTION 'Objetivo ou duração inválidos'; END IF;
  SELECT * INTO STRICT v_profile FROM public.athletes WHERE id=p_athlete_id;
  IF v_new IS NOT TRUE AND v_goal NOT IN ('mobility','recovery') AND nullif(trim(v_profile.injuries_limitations),'') IS NOT NULL AND lower(trim(v_profile.injuries_limitations)) NOT IN ('nenhuma','nenhum','não','nao','none','sem restrições','sem restricoes') THEN
    v_goal := 'mobility';
    v_restricted := true;
  END IF;
  SELECT * INTO v_check FROM public.daily_checkins WHERE athlete_id=p_athlete_id AND checkin_date=v_date;
  IF v_new AND (v_check.id IS NULL OR v_check.sono IS NULL OR v_check.energia IS NULL OR v_check.humor IS NULL OR v_check.motivacao IS NULL OR v_check.dor IS NULL) THEN RAISE EXCEPTION 'Faça a calibração completa antes de montar o treino'; END IF;
  IF v_new AND (coalesce(v_check.dor,0)>=3 OR nullif(trim(v_check.dor_local),'') IS NOT NULL OR (nullif(trim(v_profile.injuries_limitations),'') IS NOT NULL AND lower(trim(v_profile.injuries_limitations)) NOT IN ('nenhuma','nenhum','não','nao','none','sem restrições','sem restricoes'))) THEN RAISE EXCEPTION 'Revise suas restrições em Ajuste de Treino antes de gerar uma nova sessão'; END IF;
  v_resources := CASE
    WHEN v_new THEN string_to_array(substr(p_equipamento,11),',')
    WHEN p_equipamento IS NULL THEN ARRAY['bodyweight','dumbbells','bands']
    WHEN p_equipamento IN ('home','outdoor') THEN ARRAY['bodyweight']
    WHEN p_equipamento='home_basic' THEN ARRAY['bodyweight','dumbbells','bands']
    WHEN p_equipamento='gym' THEN ARRAY['gym']
    ELSE NULL END;
  IF v_resources IS NULL OR cardinality(v_resources)=0 OR EXISTS (SELECT 1 FROM unnest(v_resources) r WHERE r NOT IN ('bodyweight','dumbbells','bands','gym')) THEN RAISE EXCEPTION 'Selecione os recursos disponíveis'; END IF;
  SELECT current_phase::text INTO v_phase FROM public.vw_athlete_periodizacao_ativa WHERE athlete_id=p_athlete_id LIMIT 1;
  v_sets := CASE WHEN lower(coalesce(v_phase,'')) ~ '(deload|recuper|descarga)' OR lower(coalesce(v_profile.experience_level,'beginner')) IN ('beginner','iniciante') OR coalesce(v_check.energia,5)<=2 OR v_goal='recovery' THEN 2 ELSE 3 END;
  v_reps := CASE WHEN v_goal IN ('mobility','recovery') THEN '20-30 s' WHEN v_goal='cardio' THEN '30 s' ELSE '8-12' END;
  v_rest := CASE WHEN v_goal IN ('mobility','recovery') THEN 30 WHEN coalesce(v_check.energia,5)<=2 THEN 90 ELSE 60 END;
  v_limit := greatest(1,least(10,floor((v_tempo-3)*60.0/(v_sets*40+(v_sets-1)*v_rest+30))::integer));

  SELECT json_agg(row_to_json(e) ORDER BY t.ord) INTO v_exercises
  FROM (
    SELECT g.*, row_number() OVER (ORDER BY g.rk, CASE g.grp WHEN 'pernas' THEN 1 WHEN 'empurrar' THEN 2 WHEN 'puxar' THEN 3 WHEN 'core' THEN 4 ELSE 5 END, g.h) AS ord
    FROM (
      SELECT f.*, row_number() OVER (PARTITION BY f.grp ORDER BY f.recent, f.h) AS rk
      FROM (
        SELECT x.id,x.name,x.video_url,x.gif_url,x.instructions,x.description,x.target_muscles,x.difficulty_level,x.equipment,
          (SELECT CASE
             WHEN bool_or(lower(m) ~ '(inferiores|glúteos|gluteos|isquio|quadr|perna)') THEN 'pernas'
             WHEN bool_or(lower(m) ~ '(peitoral|tríceps|triceps|deltoid|ombro)') THEN 'empurrar'
             WHEN bool_or(lower(m) ~ '(dorsal|latíssimo|latissimo|romboide|trapézio|trapezio|bíceps|biceps)') THEN 'puxar'
             WHEN bool_or(lower(m) ~ '(core|abdômen|abdomen|erector)') THEN 'core'
             ELSE 'outros' END
           FROM unnest(x.target_muscles) m) AS grp,
          EXISTS (SELECT 1 FROM public.workout_exercise_sets s JOIN public.workout_executions w ON w.id=s.execution_id WHERE w.athlete_id=p_athlete_id AND w.status='completed' AND w.completed_at>now()-interval '48 hours' AND s.exercise_name=x.name) AS recent,
          hashtextextended(x.id::text||p_athlete_id::text||v_date::text,0) AS h
        FROM public.exercises x
        WHERE (nullif(x.video_url,'') IS NOT NULL OR nullif(x.gif_url,'') IS NOT NULL OR nullif(x.instructions,'') IS NOT NULL)
          AND (('gym'=ANY(v_resources))
            OR ('bodyweight'=ANY(v_resources) AND x.equipment IN ('Peso Corporal','nenhum','Mobilidade') AND lower(x.name) !~ '(halter|dumbbell|el.stic|band|trx|barra|banco|máquina|maquina|cabo|polia|corda|bola|rolo|foam|kettlebell)')
            OR ('dumbbells'=ANY(v_resources) AND lower(x.name) ~ '(halter|dumbbell)' AND lower(x.name) ~ '(eleva|desenvolvimento|rosca direta|rosca alternada|agachamento|avanço|afundo|stiff|remada curvada)' AND lower(x.name) !~ '(banco|inclinado|sentado|scott|supino|crucifixo|máquina|maquina|polia|cabo)')
            OR ('bands'=ANY(v_resources) AND lower(x.name) ~ '(el.stic|resistance band)' AND lower(x.name) !~ '(barra|banco|máquina|maquina|polia)'))
          AND (CASE WHEN v_goal IN ('mobility','recovery') THEN x.equipment='Mobilidade' WHEN v_goal='strength' THEN x.goal IN ('strength','hypertrophy') ELSE x.goal='endurance' END)
          AND (lower(coalesce(v_profile.experience_level,'beginner')) NOT IN ('beginner','iniciante') OR coalesce(lower(x.difficulty_level),'') NOT IN ('advanced','avançado','avancado') AND x.equipment NOT IN ('Crossfit','Pliométricos'))
      ) f
    ) g
    ORDER BY ord
    LIMIT v_limit
  ) t
  CROSS JOIN LATERAL (SELECT t.id,t.name,t.video_url,t.gif_url,t.instructions,t.description,t.target_muscles,t.difficulty_level,t.equipment,v_sets AS sets,v_reps AS reps_range,v_rest AS rest_seconds) e;

  IF v_exercises IS NULL THEN RAISE EXCEPTION 'O acervo ainda não tem exercícios compatíveis com este objetivo e estes recursos. Revise a seleção ou abra seu treino planejado.'; END IF;
  v_estimated := 3+ceil(json_array_length(v_exercises)*(v_sets*40+(v_sets-1)*v_rest+30)/60.0)::integer;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text||v_date::text ,0));
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date=v_date AND phase_name='quick' AND status IN ('started','in_progress','paused','completed','skipped')) THEN RAISE EXCEPTION 'Um treino rápido já foi iniciado hoje. Retome-o em Treino.'; END IF;
  DELETE FROM public.workout_exercises WHERE daily_workout_id IN (SELECT id FROM public.daily_workouts WHERE athlete_id=p_athlete_id AND workout_date=v_date AND workout_type='quick');
  DELETE FROM public.daily_workouts WHERE athlete_id=p_athlete_id AND workout_date=v_date AND workout_type='quick';
  INSERT INTO public.daily_workouts(athlete_id,day_number,day_name,focus_muscles,workout_type,workout_date,estimated_duration_minutes,changes_json)
  VALUES(p_athlete_id,1,'Treino Rápido · '||v_goal,ARRAY['full_body'],'quick',v_date,v_estimated,jsonb_build_object('readiness_time_budget_seconds',v_tempo*60)) RETURNING id INTO v_id;
  INSERT INTO public.workout_exercises(daily_workout_id,exercise_id,exercise_order,sets,reps_range,rest_seconds)
  SELECT v_id,(e->>'id')::uuid,ordinality,v_sets,v_reps,v_rest FROM json_array_elements(v_exercises) WITH ORDINALITY t(e,ordinality);
  RETURN json_build_object('daily_workout_id',v_id,'exercises',v_exercises,'estimated_duration_min',v_estimated,'preparation_minutes',3,'requested_duration_min',v_tempo,'restricao_aplicada',v_restricted,'objetivo_aplicado',v_goal,'sets_default',v_sets,'reps_default',v_reps,'rest_default_seconds',v_rest,'context',json_build_object('experience_level',v_profile.experience_level,'profile_goal',v_profile.primary_goal,'energy',v_check.energia,'sleep',v_check.sono,'recent_history_used',true,'periodization_phase',v_phase));
END;
$function$;

CREATE OR REPLACE FUNCTION private.apply_readiness(p_athlete_id uuid, p_workout_id uuid, p_observe_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE d jsonb; w public.daily_workouts; before_rows jsonb:='[]'; base_rows jsonb:='[]'; after_rows jsonb:='[]';
 key text; rec public.daily_readiness_decisions; phase text; original int:=0; desired int:=0; remaining int:=0;
 applied int:=0; item jsonb; qty int; take int; delta numeric; locked boolean:=false;is_timed boolean:=false;base_duration numeric;after_duration numeric;time_budget numeric;rest_budget numeric;effective_factor numeric;parsed_missing boolean:=false;
BEGIN
 d:=private.compute_readiness(p_athlete_id,p_workout_id);
 IF d->>'status'<>'ready' THEN RETURN d; END IF;
 IF p_workout_id IS NOT NULL THEN
  SELECT * INTO w FROM public.daily_workouts WHERE id=p_workout_id AND athlete_id=p_athlete_id;
  IF w.id IS NULL OR w.workout_date<>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RETURN jsonb_build_object('status','workout_unavailable'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(w.athlete_id::text||w.workout_date::text,0));
  SELECT * INTO w FROM public.daily_workouts WHERE id=p_workout_id AND athlete_id=p_athlete_id FOR UPDATE;
  d:=private.compute_readiness(p_athlete_id,p_workout_id);
  IF d->>'status'<>'ready' THEN RETURN d;END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]'),coalesce(bool_or(override_locked),false) INTO before_rows,locked FROM public.workout_exercises e WHERE daily_workout_id=w.id;
 END IF;
 base_rows:=coalesce(w.changes_json#>'{readiness,base_exercises}',before_rows);
 SELECT coalesce(sum(greatest(1,coalesce((x->>'sets')::int,1))),0)::int INTO original FROM jsonb_array_elements(base_rows)x;
 delta:=(d->>'volume_pct_total')::numeric;
 is_timed:=lower(coalesce(w.workout_type,'')||' '||coalesce(w.day_name,''))~'(cardio|corrida|running)';
 IF is_timed THEN
  SELECT coalesce(sum(private.readiness_duration_seconds(x->>'reps_range')*greatest(1,coalesce((x->>'sets')::int,1))),0),coalesce(bool_or(private.readiness_duration_seconds(x->>'reps_range') IS NULL),true),
   coalesce(sum(greatest(0,coalesce((x->>'sets')::int,1)-1)*(coalesce((x->>'rest_seconds')::int,60)+(d->>'rest_delta_s')::int)),0)+(3+(d->>'warmup_add_min')::int)*60
   INTO base_duration,parsed_missing,rest_budget FROM jsonb_array_elements(base_rows)x;
  IF w.changes_json->>'readiness_time_budget_seconds'~'^[0-9]+$' THEN time_budget:=(w.changes_json->>'readiness_time_budget_seconds')::numeric;ELSE
   SELECT CASE WHEN settings.preferences->>'session_minutes'~'^[0-9]+$' THEN (settings.preferences->>'session_minutes')::numeric*60 END INTO time_budget
    FROM public.readiness_preferences pref JOIN public.user_context_settings settings ON settings.user_id=pref.user_id WHERE pref.athlete_id=p_athlete_id AND pref.enabled LIMIT 1;
  END IF;
  time_budget:=coalesce(time_budget,base_duration+rest_budget);
  effective_factor:=greatest(.7,least(1.1,1+delta/100,coalesce((time_budget-rest_budget)/nullif(base_duration,0),1)));
 END IF;
 desired:=CASE WHEN delta<0 THEN least(floor(original*.3)::int,floor(original*abs(delta)/100)::int) WHEN delta>=10 THEN least(1,floor(original*.1)::int) ELSE 0 END;
 phase:=CASE WHEN p_workout_id IS NULL OR original=0 THEN 'skipped_no_workout'
  WHEN w.override_locked OR locked OR w.changes_json->>'readiness_suppressed_date'=(d->>'date') OR w.prescription_issue IS NOT NULL OR EXISTS(SELECT 1 FROM public.workout_executions WHERE daily_workout_id=w.id AND status IN('started','in_progress','paused','completed')) THEN 'skipped_locked'
  WHEN (d->>'gate_level')::int>0 OR (is_timed AND (parsed_missing OR base_duration<=0 OR time_budget-rest_budget<base_duration*.7)) THEN 'skipped_review'
  WHEN w.changes_json#>'{readiness,after_exercises}' IS NOT NULL AND before_rows IS DISTINCT FROM w.changes_json#>'{readiness,after_exercises}' THEN 'skipped_changed'
  WHEN p_observe_only OR now()<(d->>'apply_after')::timestamptz THEN 'shadow'
  ELSE 'applied' END;
 IF is_timed AND phase='skipped_review' THEN d:=jsonb_set(d,'{flags}',(d->'flags')||'["timed_session_review"]');END IF;
 IF is_timed THEN d:=jsonb_set(d,'{inputs,time_budget_seconds}',to_jsonb(time_budget));END IF;
 key:=md5(p_athlete_id::text||coalesce(p_workout_id::text,'none')||(d-'apply_after')::text||base_rows::text||CASE WHEN phase='skipped_changed' THEN before_rows::text ELSE '' END);
 SELECT * INTO rec FROM public.daily_readiness_decisions WHERE decision_key=key;
 IF rec.id IS NOT NULL AND (rec.status=phase OR (rec.status='applied' AND phase IN('skipped_locked','shadow'))) THEN RETURN to_jsonb(rec); END IF;
 IF phase='applied' THEN
  remaining:=desired;
  -- Restore only the recorded base doses. Never delete or replace exercise identities.
  FOR item IN SELECT value FROM jsonb_array_elements(base_rows) LOOP
   UPDATE public.workout_exercises SET sets=(item->>'sets')::int,reps_range=item->>'reps_range',rest_seconds=(item->>'rest_seconds')::int,rpe_target=(item->>'rpe_target')::int WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
  END LOOP;
  IF is_timed THEN
   FOR item IN SELECT value FROM jsonb_array_elements(base_rows) LOOP
    UPDATE public.workout_exercises SET reps_range=private.readiness_scaled_duration(item->>'reps_range',effective_factor) WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
   END LOOP;
  ELSE
  IF delta<0 THEN
   FOR item IN SELECT value FROM jsonb_array_elements(base_rows) ORDER BY (value->>'exercise_order')::int DESC,value->>'id' LOOP
    qty:=greatest(1,coalesce((item->>'sets')::int,1));take:=least(remaining,qty-1);
    UPDATE public.workout_exercises SET sets=qty-take WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
    remaining:=remaining-take;EXIT WHEN remaining=0;
   END LOOP;
  ELSIF delta>=10 AND desired=1 THEN
   SELECT value INTO item FROM jsonb_array_elements(base_rows) WHERE coalesce(value#>>'{observations,block}','')<>'reset' ORDER BY (value->>'exercise_order')::int,value->>'id' LIMIT 1;
   UPDATE public.workout_exercises SET sets=sets+1 WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;remaining:=0;
  END IF;
  END IF;
  UPDATE public.workout_exercises SET rest_seconds=coalesce(rest_seconds,60)+(d->>'rest_delta_s')::int,
   rpe_target=CASE WHEN rpe_target IS NOT NULL THEN greatest(1,floor(rpe_target+(d->>'rpe_cap_delta')::numeric)::int) ELSE rpe_target END WHERE daily_workout_id=w.id;
  SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]'),coalesce(sum(sets),0)::int INTO after_rows,applied FROM public.workout_exercises e WHERE daily_workout_id=w.id;
  IF is_timed THEN SELECT coalesce(sum(private.readiness_duration_seconds(x->>'reps_range')*greatest(1,coalesce((x->>'sets')::int,1))),0) INTO after_duration FROM jsonb_array_elements(after_rows)x;END IF;
  INSERT INTO public.workout_adjustment_versions(daily_workout_id,athlete_id,changed_by,before_exercises,after_exercises) VALUES(w.id,p_athlete_id,auth.uid(),before_rows,after_rows);
  UPDATE public.daily_workouts SET changes_json=coalesce(changes_json,'{}')||jsonb_build_object('readiness',jsonb_build_object('base_exercises',base_rows,'after_exercises',after_rows,'decision_key',key,'warmup_add_min',(d->>'warmup_add_min')::int,'base_estimated_duration_minutes',coalesce(w.changes_json#>'{readiness,base_estimated_duration_minutes}',to_jsonb(w.estimated_duration_minutes)))),estimated_duration_minutes=CASE WHEN is_timed THEN ceil((after_duration+rest_budget)/60)::int ELSE estimated_duration_minutes END,updated_at=now() WHERE id=w.id;
 ELSE applied:=original;after_duration:=base_duration; END IF;
 UPDATE public.daily_readiness_decisions SET status='superseded',updated_at=now() WHERE athlete_id=p_athlete_id AND decision_date=(d->>'date')::date AND applied_workout_id IS NOT DISTINCT FROM p_workout_id AND decision_key<>key AND (status NOT IN('superseded','applied') OR (phase='skipped_changed' AND status='applied'));
 INSERT INTO public.daily_readiness_decisions(decision_key,athlete_id,decision_date,checkin_id,rule_set_version,mode,volume_pct_total,volume_pct_applied,rpe_cap_delta,rest_delta_s,warmup_add_min,gate_level,flags,reasons,inputs,applied_workout_id,status,base_sets,applied_sets,duration_seconds_base,duration_seconds_applied)
 VALUES(key,p_athlete_id,(d->>'date')::date,(d->>'checkin_id')::uuid,d->>'rule_set_version',d->>'mode',delta,CASE WHEN phase='applied' AND is_timed AND base_duration>0 THEN round((after_duration-base_duration)*100.0/base_duration,1) WHEN original>0 AND phase='applied' THEN round((applied-original)*100.0/original,1) ELSE 0 END,(d->>'rpe_cap_delta')::numeric,(d->>'rest_delta_s')::int,(d->>'warmup_add_min')::int,(d->>'gate_level')::int,d->'flags',d->'reasons',d->'inputs',p_workout_id,phase,original,applied,base_duration,after_duration)
 ON CONFLICT(decision_key) DO UPDATE SET status=excluded.status,volume_pct_applied=excluded.volume_pct_applied,base_sets=excluded.base_sets,applied_sets=excluded.applied_sets,duration_seconds_base=excluded.duration_seconds_base,duration_seconds_applied=excluded.duration_seconds_applied,updated_at=now() RETURNING * INTO rec;
 RETURN to_jsonb(rec);
END $function$;

CREATE OR REPLACE FUNCTION public.fn_smart_training_signals(p_athlete_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.athletes%rowtype; owner_id uuid; p public.user_parameters%rowtype; c record; declared text[];
BEGIN
 PERFORM private.fitpro_require_current_access();
 PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
 SELECT * INTO a FROM public.athletes WHERE id=p_athlete_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'athlete_not_found';END IF;
 owner_id:=a.user_id;
 IF owner_id IS NULL THEN
  SELECT CASE WHEN count(*)=1 THEN (array_agg(user_id))[1] END INTO owner_id FROM public.athlete_auth_link WHERE athlete_id=a.id;
 END IF;
 SELECT * INTO p FROM public.user_parameters WHERE user_id=owner_id;
 SELECT declared_keys INTO declared FROM public.user_context_settings WHERE user_id=owner_id;
 SELECT current_week_index,current_phase INTO c FROM public.vw_athlete_periodizacao_ativa WHERE athlete_id=a.id LIMIT 1;
 RETURN jsonb_build_object(
 'sync',CASE WHEN a.sync_score IS NOT NULL AND (a.sync_score_updated_at AT TIME ZONE 'America/Sao_Paulo')::date=(now() AT TIME ZONE 'America/Sao_Paulo')::date
 THEN jsonb_build_object('ready',true,'score',a.sync_score,'updatedAt',a.sync_score_updated_at) ELSE jsonb_build_object('ready',false) END,
 'pdi',CASE WHEN p.user_id IS NOT NULL AND declared && ARRAY['recovery_rate','stress_sensitivity','volume_tolerance']
 THEN jsonb_build_object('ready',true,'recovery_rate',CASE WHEN 'recovery_rate'=ANY(declared) THEN p.recovery_rate::text END,'stress_sensitivity',CASE WHEN 'stress_sensitivity'=ANY(declared) THEN p.stress_sensitivity END,'volume_tolerance',CASE WHEN 'volume_tolerance'=ANY(declared) THEN p.volume_tolerance END) ELSE jsonb_build_object('ready',false) END,
 'cycle',CASE WHEN c.current_week_index IS NOT NULL THEN jsonb_build_object('ready',true,'weekLabel','Semana '||c.current_week_index,'phase',c.current_phase) ELSE jsonb_build_object('ready',false) END);
END $$;
REVOKE ALL ON FUNCTION public.fn_smart_training_signals(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_smart_training_signals(uuid) TO authenticated;
