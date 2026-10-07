-- Distances and durations must never be interpreted as repetitions.
CREATE OR REPLACE FUNCTION public.fn_protocol_strength_compatible(p_protocol_id text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT coalesce((SELECT p.protocol_id NOT IN (1,2,3)
    AND p.block_9_template->>'dose_type' = 'repetitions'
    AND p.block_9_template->>'dose_unit' = 'reps'
    AND p.block_9_template->>'reps' ~ '^[0-9]+([.][0-9]+)?([-–][0-9]+)?$'
    AND p.model_description !~* '[0-9][[:space:]]*[x×][[:space:]]*[0-9]+[[:space:]]*(km|min|seg|sec|s|m)([^[:alpha:]]|$)'
    FROM public.smart_treino_protocols p WHERE p.id = p_protocol_id),false);
$$;
REVOKE ALL ON FUNCTION public.fn_protocol_strength_compatible(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_protocol_strength_compatible(text) TO authenticated, service_role;

-- Preserve the catalogue and references; no delete/reseed.
WITH doses AS (
 SELECT id, protocol_id, model_description,
 regexp_match(model_description, '([0-9]+)[[:space:]]*[x×][[:space:]]*([0-9]+(?:[.][0-9]+)?(?:[-–][0-9]+)?)[[:space:]]*(km|min|seg|sec|s|m)?([^[:alpha:]]|$)', 'i') AS dose
 FROM public.smart_treino_protocols
), typed AS (
 SELECT *, CASE WHEN model_description ~ '[x×][[:space:]]*\(' THEN 'mixed'
   WHEN lower(dose[3]) IN ('m','km') THEN 'distance'
   WHEN lower(dose[3]) IN ('s','seg','sec','min') THEN 'duration'
   WHEN protocol_id IN (1,2,3) THEN 'unresolved'
   ELSE 'repetitions' END kind
 FROM doses
)
UPDATE public.smart_treino_protocols p
SET block_9_template = p.block_9_template || jsonb_build_object(
 'modality', CASE WHEN t.protocol_id IN (1,2,3) THEN 'cardio' ELSE 'resistance' END,
 'dose_type', t.kind,
 'dose_unit', CASE WHEN t.kind = 'repetitions' THEN 'reps' ELSE lower(t.dose[3]) END,
 'dose_value', CASE WHEN t.kind = 'repetitions' THEN p.block_9_template->>'reps' ELSE t.dose[2] END,
 'repetition_target', CASE WHEN t.kind = 'repetitions' THEN p.block_9_template->>'reps' ELSE null END,
 'source_description', t.model_description
) || CASE WHEN t.dose[3] IS NOT NULL THEN jsonb_build_object('reps',t.dose[2] || lower(t.dose[3])) ELSE '{}'::jsonb END
FROM typed t WHERE t.id = p.id;

CREATE OR REPLACE FUNCTION public.fn_aplicar_protocolo_9x9x9(p_athlete_id uuid, p_protocol_id text, p_data date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_protocolo RECORD;
  v_workout_type TEXT;
  v_sets INT4;
  v_reps TEXT;
  v_rest INT4;
  v_rpe INT4;
  v_daily_workout_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND (
      a.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = a.id AND l.user_id = auth.uid())
    )
  ) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || p_data::text, 0));
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id = p_athlete_id AND workout_date = p_data AND status IN ('in_progress', 'completed')) THEN
    RAISE EXCEPTION 'O treino deste dia já foi iniciado. Use Ajustar treino para preservar o histórico.';
  END IF;
  SELECT * INTO v_protocolo
  FROM public.smart_treino_protocols
  WHERE id = p_protocol_id;

  IF v_protocolo IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'protocolo_nao_encontrado');
  END IF;

  IF NOT public.fn_protocol_strength_compatible(p_protocol_id) THEN
    RETURN json_build_object('success', false, 'error', 'protocolo_modalidade_incompativel',
      'description', 'Este protocolo usa distância, duração ou estrutura específica. Não pode ser aplicado como repetições de musculação.');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.exercises e WHERE e.video_url IS NOT NULL
    AND (v_protocolo.goal_tags IS NULL OR EXISTS (
      SELECT 1 FROM unnest(v_protocolo.goal_tags) tag WHERE e.goal ILIKE '%' || tag || '%'
    ))
  ) THEN
    RETURN json_build_object('success',false,'error','sem_exercicios_compativeis');
  END IF;

  -- Mapeamento pilar -> workout_type (CHECK constraint real de daily_workouts)
  -- Decisão provisória, ajustável: estrutural=hypertrophy, performance=endurance, longevidade=recovery
  v_workout_type := CASE v_protocolo.pillar
    WHEN 'estrutural' THEN 'hypertrophy'
    WHEN 'performance' THEN 'endurance'
    WHEN 'longevidade' THEN 'recovery'
    ELSE 'hypertrophy'
  END;

  v_sets := NULLIF(v_protocolo.block_9_template->>'sets', '')::INT4;
  v_reps := v_protocolo.block_9_template->>'reps';
  v_rest := NULLIF(v_protocolo.block_9_template->>'rest', '')::INT4;
  v_rpe := NULLIF(v_protocolo.block_9_template->>'rpe', '')::INT4;

  -- Remove treino já existente nessa data pra não duplicar (idempotente)
  DELETE FROM public.workout_exercises WHERE daily_workout_id IN (
    SELECT id FROM public.daily_workouts WHERE athlete_id = p_athlete_id AND workout_date = p_data
  );
  DELETE FROM public.daily_workouts WHERE athlete_id = p_athlete_id AND workout_date = p_data;

  INSERT INTO public.daily_workouts (athlete_id, day_number, day_name, focus_muscles, workout_type, workout_date)
  VALUES (p_athlete_id, 1, v_protocolo.protocol_name || ' (' || v_protocolo.variation_name || ')', ARRAY['full_body'], v_workout_type, p_data)
  RETURNING id INTO v_daily_workout_id;

  INSERT INTO public.workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target)
  SELECT v_daily_workout_id, ex.id, row_number() OVER (), v_sets, v_reps, v_rest, v_rpe
  FROM (
    SELECT id FROM public.exercises
    WHERE video_url IS NOT NULL
      AND (
        v_protocolo.goal_tags IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(v_protocolo.goal_tags) AS tag
          WHERE goal ILIKE '%' || tag || '%'
        )
      )
    ORDER BY random() LIMIT 6
  ) ex;

  RETURN json_build_object(
    'success', true,
    'daily_workout_id', v_daily_workout_id,
    'protocol_name', v_protocolo.protocol_name,
    'pillar', v_protocolo.pillar,
    'workout_type_aplicado', v_workout_type
  );
END;
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

  IF NOT public.fn_protocol_strength_compatible(v_protocol.id) THEN
    RETURN json_build_object('sucesso', false, 'motivo', 'protocolo_modalidade_incompativel',
      'sugestao_cta', 'Este protocolo exige uma sessão de distância/duração. Não use a geração de exercícios de musculação.');
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

-- Preserve erroneous prescriptions for audit, but prevent execution.
ALTER TABLE public.daily_workouts ADD COLUMN IF NOT EXISTS prescription_issue text;
COMMENT ON COLUMN public.daily_workouts.prescription_issue IS 'Technical prescription validation error; non-null blocks execution without deleting history.';
UPDATE public.daily_workouts dw SET prescription_issue = 'invalid_protocol_units'
WHERE dw.prescription_issue IS NULL AND EXISTS (
 SELECT 1 FROM public.smart_treino_protocols p
 JOIN public.workout_exercises we ON we.daily_workout_id = dw.id
 JOIN public.exercises e ON e.id = we.exercise_id
 WHERE dw.day_name = p.protocol_name || ' (' || p.variation_name || ')'
 AND p.block_9_template->>'dose_type' = 'distance'
 AND we.reps_range = p.block_9_template->>'dose_value'
 AND lower(e.goal) = 'strength'
);
UPDATE public.workout_executions wx SET status='skipped',
 notes=concat_ws(E'\n', nullif(wx.notes,''), '[invalid_protocol_units] Sessão interrompida: distância aplicada como repetições. Histórico preservado; consulte o protocolo do coach.')
FROM public.daily_workouts dw
WHERE wx.daily_workout_id = dw.id AND dw.prescription_issue='invalid_protocol_units' AND wx.status='in_progress';

CREATE OR REPLACE FUNCTION public.fn_get_week_workouts(p_athlete_id uuid, p_week_start date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_periodization record;
  v_week json;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_week_start date := coalesce(
    p_week_start,
    date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::date
  );
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.athletes a
    LEFT JOIN public.athlete_auth_link al ON al.athlete_id = a.id
    WHERE a.id = p_athlete_id AND (a.user_id = auth.uid() OR al.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not_authorized_for_athlete' USING ERRCODE = '42501';
  END IF;
  IF extract(isodow FROM v_week_start) <> 1 THEN
    RAISE EXCEPTION 'week_start_must_be_monday' USING ERRCODE = '22023';
  END IF;

  SELECT ap.status, ap.periodization_model_id, ap.match_percentage
  INTO v_periodization
  FROM public.athlete_periodizations ap
  WHERE ap.athlete_id = p_athlete_id AND ap.status IN ('active', 'in_progress')
  ORDER BY ap.assigned_at DESC NULLS LAST, ap.created_at DESC
  LIMIT 1;

  -- Geração preguiçosa da semana: com periodização ativa e nenhum treino (não-rápido)
  -- de hoje até o fim da semana, o gerador idempotente monta a semana.
  -- Nunca quebra a leitura: qualquer falha é descartada (subtransação).
  IF v_periodization.status IS NOT NULL
     AND v_week_start >= date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::date
     AND NOT EXISTS (
       SELECT 1 FROM public.daily_workouts dw
       WHERE dw.athlete_id = p_athlete_id
         AND dw.workout_date BETWEEN greatest(v_week_start, v_today) AND v_week_start + 6
         AND dw.workout_type IS DISTINCT FROM 'quick'
     ) THEN
    BEGIN
      PERFORM public.fn_generate_periodized_week(p_athlete_id, v_week_start, NULL);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  SELECT json_agg(row_to_json(d) ORDER BY d.workout_date) INTO v_week
  FROM (
    SELECT
      dw.id,
      extract(isodow FROM dates.workout_date)::integer AS day_number,
      coalesce(dw.day_name, (ARRAY['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'])[extract(isodow FROM dates.workout_date)::integer]) AS day_name,
      dates.workout_date,
      dw.workout_type,
      dw.prescription_issue,
      CASE
        WHEN dw.id IS NULL THEN 'rest'
        WHEN dw.workout_type = 'rest' THEN 'rest'
        ELSE coalesce(wx.status, 'planned')
      END AS status,
      wx.execution_id,
      CASE WHEN dw.id IS NULL OR dw.prescription_issue IS NOT NULL THEN '[]'::json
        ELSE coalesce((
          SELECT json_agg(json_build_object(
            'id', ex.id,
            'name', ex.name,
            'video_url', ex.video_url,
            'gif_url', ex.gif_url,
            'sets', we.sets,
            'reps_range', we.reps_range,
            'rest_seconds', we.rest_seconds
          ) ORDER BY we.exercise_order)
          FROM public.workout_exercises we
          JOIN public.exercises ex ON ex.id = we.exercise_id
          WHERE we.daily_workout_id = dw.id
        ), '[]'::json)
      END AS exercises
    FROM generate_series(0, 6) AS offsets(day_offset)
    CROSS JOIN LATERAL (
      SELECT (v_week_start + offsets.day_offset)::date AS workout_date
    ) dates
    LEFT JOIN LATERAL (
      SELECT candidate.*
      FROM public.daily_workouts candidate
      WHERE candidate.athlete_id = p_athlete_id
        AND candidate.workout_date = dates.workout_date
        AND candidate.workout_type IS DISTINCT FROM 'quick'
      ORDER BY candidate.day_number, candidate.created_at, candidate.id
      LIMIT 1
    ) dw ON true
    LEFT JOIN LATERAL (
      SELECT e.id AS execution_id, e.status
      FROM public.workout_executions e
      WHERE e.athlete_id = p_athlete_id
        AND ((dw.id IS NOT NULL AND e.daily_workout_id = dw.id)
          OR (dw.id IS NULL AND e.workout_date = dates.workout_date AND e.daily_workout_id IS NULL))
      ORDER BY e.created_at DESC
      LIMIT 1
    ) wx ON true
  ) d;

  RETURN json_build_object(
    'phase_status', coalesce(v_periodization.status, 'sem_periodizacao'),
    'periodization_model_id', v_periodization.periodization_model_id,
    'match_percentage', v_periodization.match_percentage,
    'week_start', v_week_start,
    'week_end', v_week_start + 6,
    'week', coalesce(v_week, '[]'::json)
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
  PERFORM pg_advisory_xact_lock(hashtextextended(v_day.athlete_id::text||v_day.workout_date::text||CASE WHEN v_day.workout_type='quick' THEN 'quick' ELSE 'daily' END,0));
  IF NOT EXISTS (SELECT 1 FROM public.workout_exercises WHERE daily_workout_id=v_day.id) THEN RAISE EXCEPTION 'A prescrição não contém exercícios'; END IF;
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND daily_workout_id=v_day.id AND status='completed') THEN RAISE EXCEPTION 'Este treino já foi concluído'; END IF;
  IF v_day.workout_type='quick' AND EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND workout_date=v_day.workout_date AND phase_name='quick' AND status='completed') THEN RAISE EXCEPTION 'O treino rápido de hoje já foi concluído'; END IF;
  SELECT id INTO v_execution_id FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND daily_workout_id=v_day.id AND status IN ('started','in_progress','paused') ORDER BY created_at DESC LIMIT 1;
  IF v_execution_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND workout_date=v_day.workout_date AND status IN ('started','in_progress','paused')) THEN RAISE EXCEPTION 'Retome ou finalize sua sessão em andamento primeiro'; END IF;
    INSERT INTO public.workout_executions(athlete_id,daily_workout_id,workout_date,started_at,status,phase_name) VALUES(v_day.athlete_id,v_day.id,v_day.workout_date,now(),'in_progress',CASE WHEN v_day.workout_type='quick' THEN 'quick' ELSE v_day.day_name END) RETURNING id INTO v_execution_id;
  ELSE UPDATE public.workout_executions SET status='in_progress' WHERE id=v_execution_id AND status='paused';
  END IF;
  RETURN v_execution_id;
END;
$function$;


