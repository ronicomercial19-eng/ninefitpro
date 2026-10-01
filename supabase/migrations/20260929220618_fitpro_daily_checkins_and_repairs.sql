-- Self-reported completion. Does not invent GPS, calories, sets or meal macros.
CREATE OR REPLACE FUNCTION public.fn_fitpro_daily_checkin(p_kind text, p_date date, p_slot text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_athlete uuid; v_id uuid; v_event text; v_goal record; v_goal_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='42501'; END IF;
  IF p_kind IS NULL OR p_slot IS NULL OR p_kind NOT IN ('treino','nutri','move') OR p_date IS NULL OR abs(p_date - current_date) > 1 OR length(p_slot) > 40 THEN RAISE EXCEPTION 'invalid_checkin'; END IF;
  v_athlete := public.fn_current_athlete_id();
  IF v_athlete IS NULL THEN RAISE EXCEPTION 'athlete_not_found'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || p_kind || p_date::text || p_slot, 0));
  SELECT id INTO v_id FROM public.master_registry WHERE user_id=v_user AND source='fitpro_daily_checkin' AND payload->>'kind'=p_kind AND payload->>'date'=p_date::text AND payload->>'slot'=p_slot LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN jsonb_build_object('success',true,'already_completed',true,'id',v_id); END IF;
  IF p_kind='move' THEN
    SELECT * INTO v_goal FROM public.metas_progresso WHERE athlete_id=v_athlete AND status='ativa' AND (metrica IN ('distancia','corrida') OR unidade='km') ORDER BY created_at DESC LIMIT 1;
    IF v_goal.id IS NULL THEN RAISE EXCEPTION 'Cadastre sua meta de corrida em Progresso antes de concluir o MOVE.'; END IF;
    UPDATE public.metas_progresso SET valor_atual=valor_meta,status='concluida',updated_at=now() WHERE id=v_goal.id;
    v_goal_id := v_goal.id;
  END IF;
  v_event := CASE p_kind WHEN 'treino' THEN 'workout_complete' WHEN 'nutri' THEN 'nutrition_checkin' ELSE 'move_completed' END;
  INSERT INTO public.master_registry(user_id,event_type,source,payload) VALUES(v_user,v_event,'fitpro_daily_checkin',jsonb_build_object('kind',p_kind,'date',p_date,'slot',p_slot,'athlete_id',v_athlete,'self_reported',true,'goal_id',v_goal_id)) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success',true,'id',v_id);
END $$;
REVOKE ALL ON FUNCTION public.fn_fitpro_daily_checkin(text,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_daily_checkin(text,date,text) TO authenticated;
-- Preserve existing assessment origins; self-reported weight is a distinct source.
ALTER TABLE public.avaliacoes_unificadas DROP CONSTRAINT avaliacoes_unificadas_origem_check;
ALTER TABLE public.avaliacoes_unificadas ADD CONSTRAINT avaliacoes_unificadas_origem_check CHECK (origem IN ('base44','manual','importado','avaliacao_guiada','fitpro','coach','peso_avulso'));
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

  -- Fallback: filtro de goal_tags não bateu com nada — não deixa o treino vazio
  IF NOT EXISTS (SELECT 1 FROM public.workout_exercises WHERE daily_workout_id = v_daily_workout_id) THEN
    INSERT INTO public.workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target)
    SELECT v_daily_workout_id, id, row_number() OVER (), v_sets, v_reps, v_rest, v_rpe
    FROM (
      SELECT id FROM public.exercises WHERE video_url IS NOT NULL ORDER BY random() LIMIT 6
    ) ex;
  END IF;

  RETURN json_build_object(
    'success', true,
    'daily_workout_id', v_daily_workout_id,
    'protocol_name', v_protocolo.protocol_name,
    'pillar', v_protocolo.pillar,
    'workout_type_aplicado', v_workout_type
  );
END;
$function$
;
REVOKE ALL ON FUNCTION public.fn_aplicar_protocolo_9x9x9(uuid,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_aplicar_protocolo_9x9x9(uuid,text,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_registrar_peso_avulso(p_athlete_id uuid, p_peso numeric, p_data date DEFAULT CURRENT_DATE, p_gordura numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND a.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.athlete_auth_link al WHERE al.athlete_id = p_athlete_id AND al.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.athletes a
    JOIN auth.users u ON u.email = a.email
    WHERE a.id = p_athlete_id AND u.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_peso IS NULL OR p_peso <= 0 OR p_peso > 700 OR p_peso::text = 'NaN' THEN
    RAISE EXCEPTION 'Peso inválido';
  END IF;

  IF p_gordura IS NOT NULL AND (p_gordura < 0 OR p_gordura > 80 OR p_gordura::text = 'NaN') THEN RAISE EXCEPTION 'Percentual inválido'; END IF;
  IF p_data IS NULL OR p_data > CURRENT_DATE + 1 THEN RAISE EXCEPTION 'Data inválida'; END IF;
  INSERT INTO public.avaliacoes_unificadas (athlete_id, aluno_id, origem, data_avaliacao, peso, gordura_corporal)
  VALUES (p_athlete_id, NULL, 'peso_avulso', p_data, p_peso, p_gordura)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
;
REVOKE ALL ON FUNCTION public.fn_registrar_peso_avulso(uuid,numeric,date,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_registrar_peso_avulso(uuid,numeric,date,numeric) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_get_hub_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := (select auth.uid());
  v_athlete_id uuid := null;
  v_athlete_aluno_id uuid := null;
  v_athlete_name text := null;
  v_hub_treinos integer := null;
  v_hub_nutri integer := null;
  v_hub_minutos integer := null;
  v_sync_score integer := null;
  v_sync_score_updated_at timestamptz := null;
  v_hrv_value numeric := null;
  v_hrv_recorded_at timestamptz := null;
  v_heart_value numeric := null;
  v_heart_recorded_at timestamptz := null;
  v_activity_calories numeric := null;
  v_activity_recorded_at timestamptz := null;
  v_treino_count integer := 0;
  v_nutri_count integer := 0;
  v_sleep_count integer := 0;
  v_mobility_count integer := 0;
  v_hydration_count integer := 0;
  v_treino_observed_at timestamptz := null;
  v_nutri_observed_at timestamptz := null;
  v_sleep_observed_at timestamptz := null;
  v_mobility_observed_at timestamptz := null;
  v_hydration_observed_at timestamptz := null;
  v_water_value numeric := null;
  v_water_observed_at timestamptz := null;
  v_sync_status text := 'calibrating';
  v_sync_value numeric := null;
  v_sync_observed_at timestamptz := null;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT a.id, a.aluno_id, a.name, a.sync_score, a.sync_score_updated_at
    INTO v_athlete_id, v_athlete_aluno_id, v_athlete_name, v_sync_score, v_sync_score_updated_at
    FROM public.athletes a
   WHERE a.user_id = v_user_id
      OR EXISTS (
        SELECT 1
          FROM public.athlete_auth_link aal
         WHERE aal.user_id = v_user_id
           AND aal.athlete_id = a.id
      )
   ORDER BY CASE WHEN a.user_id = v_user_id THEN 0 ELSE 1 END, a.created_at DESC
   LIMIT 1;

  IF v_athlete_id IS NULL THEN
    RETURN jsonb_build_object(
      'version', 1,
      'status', 'no_athlete_profile',
      'generated_at', now(),
      'sync', jsonb_build_object('value', null, 'status', 'not_collected', 'source', null, 'observed_at', null),
      'dimensions', '{}'::jsonb,
      'weekly', '{}'::jsonb,
      'vitals', '{}'::jsonb
    );
  END IF;

  SELECT treinos_semana, nutri_semana, minutos_semana
    INTO v_hub_treinos, v_hub_nutri, v_hub_minutos
    FROM public.vw_hub_status
   WHERE athlete_id = v_athlete_id
   LIMIT 1;

  -- Fonte única: athletes.sync_score (calcular_sync_score_real). A antiga
  -- leitura de aluno_score_composite foi removida — essa tabela nunca
  -- teve uma linha sequer em produção e mantinha o Hub preso em
  -- "calibrando" mesmo com dado real disponível em outro lugar.
  IF v_sync_score IS NOT NULL AND v_sync_score_updated_at IS NOT NULL THEN
    v_sync_value := v_sync_score;
    v_sync_observed_at := v_sync_score_updated_at;
    v_sync_status := CASE
      WHEN v_sync_observed_at < now() - interval '48 hours' THEN 'stale'
      ELSE 'available'
    END;
  END IF;

  -- Durable records drive adherence even if asynchronous integrations fail.
  SELECT count(*), max(observed_at) INTO v_treino_count, v_treino_observed_at FROM (
    SELECT workout_date AS day, max(completed_at) AS observed_at
      FROM public.workout_executions WHERE athlete_id=v_athlete_id AND status='completed' AND workout_date>=CURRENT_DATE-6 GROUP BY workout_date
    UNION ALL
    SELECT coalesce(nullif(payload->>'date','')::date,created_at::date),created_at
      FROM public.master_registry WHERE user_id=v_user_id AND event_type IN ('workout_completed','workout_complete') AND created_at>=now()-interval '7 days'
      AND NOT EXISTS (SELECT 1 FROM public.workout_executions w WHERE w.athlete_id=v_athlete_id AND w.status='completed' AND w.workout_date=coalesce(nullif(payload->>'date','')::date,created_at::date))
  ) workouts;
  SELECT count(*),max(observed_at) INTO v_nutri_count,v_nutri_observed_at FROM (
    SELECT date::text || ':' || meal_name AS meal, max(created_at) AS observed_at FROM public.nutrition_logs WHERE athlete_id=v_athlete_id AND date>=CURRENT_DATE-6 GROUP BY date,meal_name
    UNION ALL
    SELECT payload->>'date' || ':' || payload->>'slot',created_at FROM public.master_registry WHERE user_id=v_user_id AND event_type='nutrition_checkin' AND created_at>=now()-interval '7 days'
      AND NOT EXISTS (SELECT 1 FROM public.nutrition_logs n WHERE n.athlete_id=v_athlete_id AND n.date::text=payload->>'date' AND n.meal_name=payload->>'slot')
  ) meals;
  SELECT count(DISTINCT sleep_date),max(created_at) INTO v_sleep_count,v_sleep_observed_at FROM public.bio_sleep_logs WHERE user_id=v_user_id AND sleep_date>=CURRENT_DATE-6;
  SELECT count(*),max(created_at) INTO v_mobility_count,v_mobility_observed_at FROM public.master_registry WHERE user_id=v_user_id AND event_type='mobility_log' AND created_at>=now()-interval '7 days';
  SELECT count(*),max(created_at) INTO v_hydration_count,v_hydration_observed_at FROM public.hydration_logs WHERE athlete_id=v_athlete_id AND log_date>=CURRENT_DATE-6;
  SELECT sum(amount_ml),max(created_at) INTO v_water_value,v_water_observed_at FROM public.hydration_logs WHERE athlete_id=v_athlete_id AND log_date=CURRENT_DATE;
  v_hub_treinos := v_treino_count;
  v_hub_nutri := v_nutri_count;

  SELECT hrv_ms, recorded_at INTO v_hrv_value, v_hrv_recorded_at
    FROM public.bio_hrv_logs
   WHERE user_id = v_user_id
   ORDER BY recorded_at DESC LIMIT 1;

  SELECT bpm, recorded_at INTO v_heart_value, v_heart_recorded_at
    FROM public.bio_heart_rate_logs
   WHERE user_id = v_user_id
   ORDER BY recorded_at DESC LIMIT 1;

  SELECT calories, recorded_at INTO v_activity_calories, v_activity_recorded_at
    FROM public.bio_activity_logs
   WHERE user_id = v_user_id
     AND recorded_at >= date_trunc('day', now())
   ORDER BY recorded_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'version', 1,
    'status', v_sync_status,
    'athlete', jsonb_build_object('id', v_athlete_id, 'name', v_athlete_name),
    'generated_at', now(),
    'sync', jsonb_build_object(
      'value', v_sync_value,
      'status', v_sync_status,
      'source', CASE WHEN v_sync_value IS NULL THEN null ELSE to_jsonb(ARRAY['calcular_sync_score_real']) END,
      'observed_at', v_sync_observed_at
    ),
    'dimensions', jsonb_build_object(
      'treino', jsonb_build_object('value', least(100, v_treino_count * 25), 'status', CASE WHEN v_treino_observed_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'workout_executions/master_registry', 'observed_at', v_treino_observed_at),
      'nutri', jsonb_build_object('value', least(100, round(v_nutri_count * 100.0 / 21)), 'status', CASE WHEN v_nutri_observed_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'nutrition_logs/master_registry', 'observed_at', v_nutri_observed_at),
      'sono', jsonb_build_object('value', least(100, round(v_sleep_count * 100.0 / 7)), 'status', CASE WHEN v_sleep_observed_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'bio_sleep_logs', 'observed_at', v_sleep_observed_at),
      'mob', jsonb_build_object('value', least(100, v_mobility_count * 25), 'status', CASE WHEN v_mobility_observed_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'master_registry', 'observed_at', v_mobility_observed_at),
      'hidr', jsonb_build_object('value', least(100, round(v_hydration_count * 100.0 / 14)), 'status', CASE WHEN v_hydration_observed_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'hydration_logs', 'observed_at', v_hydration_observed_at)
    ),
    'weekly', jsonb_build_object(
      'treinos', COALESCE(v_hub_treinos, v_treino_count, 0),
      'nutri', COALESCE(v_hub_nutri, v_nutri_count, 0),
      'minutos', COALESCE(v_hub_minutos, 0)
    ),
    'vitals', jsonb_build_object(
      'water', jsonb_build_object('value', v_water_value, 'status', CASE WHEN v_water_observed_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'hydration_logs', 'observed_at', v_water_observed_at),
      'hrv', jsonb_build_object('value', v_hrv_value, 'status', CASE WHEN v_hrv_recorded_at IS NULL THEN 'not_collected' WHEN v_hrv_recorded_at < now() - interval '36 hours' THEN 'stale' ELSE 'available' END, 'source', 'bio_hrv_logs', 'observed_at', v_hrv_recorded_at),
      'calories', jsonb_build_object('value', v_activity_calories, 'status', CASE WHEN v_activity_recorded_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'bio_activity_logs', 'observed_at', v_activity_recorded_at),
      'heart_rate', jsonb_build_object('value', v_heart_value, 'status', CASE WHEN v_heart_recorded_at IS NULL THEN 'not_collected' WHEN v_heart_recorded_at < now() - interval '36 hours' THEN 'stale' ELSE 'available' END, 'source', 'bio_heart_rate_logs', 'observed_at', v_heart_recorded_at)
    )
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fn_treino_rapido(p_athlete_id uuid, p_objetivo text DEFAULT NULL::text, p_tempo_min integer DEFAULT 20, p_equipamento text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_limit INT4 := GREATEST(3, LEAST(10, p_tempo_min / 5));
  v_daily_workout_id uuid;
  v_exercises JSON;
  v_goals text[];
  v_equipments text[];
BEGIN
  IF auth.uid() IS NULL OR (NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND (a.user_id = auth.uid() OR a.coach_id = auth.uid())) AND NOT EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = p_athlete_id AND l.user_id = auth.uid())) THEN
    RAISE EXCEPTION 'athlete_access_denied';
  END IF;
  -- Mapeamento real: código do front -> valores que existem em exercises
  v_goals := CASE lower(coalesce(p_objetivo,''))
    WHEN 'fatburn' THEN ARRAY['endurance','power']
    WHEN 'strength' THEN ARRAY['strength','power']
    WHEN 'cardio' THEN ARRAY['endurance']
    WHEN 'mobility' THEN ARRAY['strength','endurance'] -- mobilidade filtra por equipment, não por goal
    ELSE NULL
  END;

  v_equipments := CASE lower(coalesce(p_equipamento,''))
    WHEN 'home' THEN ARRAY['Peso Corporal','nenhum','Mobilidade','Ativação']
    WHEN 'home_basic' THEN ARRAY['Peso Corporal','nenhum','TRX','Funcional','Ativação']
    WHEN 'gym' THEN ARRAY['Musculação','Crossfit','barra','Funcional']
    WHEN 'outdoor' THEN ARRAY['Funcional','Peso Corporal','nenhum','Corda Naval','Pliométricos']
    ELSE NULL
  END;

  -- Objetivo "mobility" força usar a categoria Mobilidade independente do equipamento
  IF lower(coalesce(p_objetivo,'')) = 'mobility' THEN
    v_equipments := ARRAY['Mobilidade','Ativação'];
  END IF;

  SELECT json_agg(row_to_json(e)) INTO v_exercises
  FROM (
    SELECT id, name, video_url, gif_url, target_muscles, difficulty_level
    FROM public.exercises
    WHERE video_url IS NOT NULL
      AND (v_equipments IS NULL OR equipment = ANY(v_equipments))
      AND (v_goals IS NULL OR goal = ANY(v_goals) OR goal IS NULL)
    ORDER BY random()
    LIMIT v_limit
  ) e;

  -- Fallback 1: relaxa o goal, mantém equipamento (equipamento é a restrição física real)
  IF v_exercises IS NULL AND v_equipments IS NOT NULL THEN
    SELECT json_agg(row_to_json(e)) INTO v_exercises
    FROM (
      SELECT id, name, video_url, gif_url, target_muscles, difficulty_level
      FROM public.exercises
      WHERE video_url IS NOT NULL AND equipment = ANY(v_equipments)
      ORDER BY random() LIMIT v_limit
    ) e;
  END IF;

  IF v_exercises IS NULL THEN RAISE EXCEPTION 'Nenhum exercício compatível com este equipamento'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || CURRENT_DATE::text || 'quick',0));
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date=CURRENT_DATE AND phase_name='quick' AND status IN ('in_progress','completed')) THEN
    RAISE EXCEPTION 'Um treino rápido já foi iniciado hoje. Retome-o em Treino.';
  END IF;
  DELETE FROM public.workout_exercises WHERE daily_workout_id IN (
    SELECT id FROM public.daily_workouts WHERE athlete_id = p_athlete_id AND workout_date = CURRENT_DATE AND workout_type = 'quick'
  );
  DELETE FROM public.daily_workouts WHERE athlete_id = p_athlete_id AND workout_date = CURRENT_DATE AND workout_type = 'quick';

    INSERT INTO public.daily_workouts (athlete_id, day_number, day_name, focus_muscles, workout_type, workout_date)
    VALUES (p_athlete_id, 1, 'Treino Rápido - ' || COALESCE(p_objetivo, 'Geral'), ARRAY['full_body'], 'quick', CURRENT_DATE)
    RETURNING id INTO v_daily_workout_id;

    INSERT INTO public.workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds)
    SELECT v_daily_workout_id, (e->>'id')::uuid, row_number() OVER (), 3, '10-12', 60
    FROM json_array_elements(COALESCE(v_exercises, '[]'::json)) e;

  RETURN json_build_object(
    'daily_workout_id', v_daily_workout_id,
    'exercises', COALESCE(v_exercises, '[]'::json),
    'objetivo', p_objetivo,
    'tempo_min', p_tempo_min,
    'sets_default', 3,
    'reps_default', '10-12',
    'rest_default_seconds', 60
  );
END;
$function$
;
REVOKE ALL ON FUNCTION public.fn_treino_rapido(uuid,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_treino_rapido(uuid,text,integer,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_salvar_avaliacao_guiada(p_athlete_id uuid, p_peso numeric DEFAULT NULL::numeric, p_gordura_corporal numeric DEFAULT NULL::numeric, p_massa_muscular numeric DEFAULT NULL::numeric, p_rm_supino numeric DEFAULT NULL::numeric, p_rm_agachamento numeric DEFAULT NULL::numeric, p_rm_puxada numeric DEFAULT NULL::numeric, p_data_avaliacao date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id=p_athlete_id AND (a.user_id=auth.uid() OR EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=a.id AND l.user_id=auth.uid()))) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF p_peso IS NOT NULL AND (p_peso<=0 OR p_peso>700 OR p_peso::text='NaN') THEN RAISE EXCEPTION 'Peso inválido'; END IF;
  IF p_gordura_corporal IS NOT NULL AND (p_gordura_corporal<0 OR p_gordura_corporal>80 OR p_gordura_corporal::text='NaN') THEN RAISE EXCEPTION 'Percentual inválido'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY[p_massa_muscular,p_rm_supino,p_rm_agachamento,p_rm_puxada]) v WHERE v<0 OR v::text='NaN') THEN RAISE EXCEPTION 'Medida inválida'; END IF;
  INSERT INTO public.avaliacoes_unificadas (
    athlete_id, origem, data_avaliacao,
    peso, gordura_corporal, massa_muscular,
    rm1_empurrar_superior, rm1_empurrar_perna, rm1_puxar_costas
  ) VALUES (
    p_athlete_id, 'avaliacao_guiada', p_data_avaliacao,
    p_peso, p_gordura_corporal, p_massa_muscular,
    p_rm_supino, p_rm_agachamento, p_rm_puxada
  )
  RETURNING id INTO v_id;

  UPDATE public.athletes SET peso_kg=coalesce(p_peso,peso_kg) WHERE id=p_athlete_id;
  RETURN json_build_object('success', true, 'id', v_id);
END;
$function$
;
REVOKE ALL ON FUNCTION public.fn_salvar_avaliacao_guiada(uuid,numeric,numeric,numeric,numeric,numeric,numeric,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_salvar_avaliacao_guiada(uuid,numeric,numeric,numeric,numeric,numeric,numeric,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_ajustar_treino_dia(p_athlete_id uuid, p_data date, p_changes jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_daily_workout_id UUID;
  v_change JSONB;
  v_patched_exercises JSONB;
  v_new_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND a.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.athlete_auth_link al WHERE al.athlete_id = p_athlete_id AND al.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.athletes a
    JOIN auth.users u ON u.email = a.email
    WHERE a.id = p_athlete_id AND u.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT id INTO v_daily_workout_id
  FROM public.daily_workouts
  WHERE athlete_id = p_athlete_id AND workout_date = p_data
  ORDER BY created_at DESC LIMIT 1;

  IF v_daily_workout_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_workout_for_date');
  END IF;

  FOR v_change IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
    IF (v_change ? 'sets' AND ((v_change->>'sets')::integer NOT BETWEEN 1 AND 10)) OR (v_change ? 'rest_seconds' AND ((v_change->>'rest_seconds')::integer NOT BETWEEN 0 AND 600)) OR (v_change ? 'intensidade' AND ((v_change->>'intensidade')::integer NOT BETWEEN 1 AND 10)) THEN RAISE EXCEPTION 'Parâmetros de treino inválidos'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.workout_exercises WHERE daily_workout_id=v_daily_workout_id AND exercise_id=(v_change->>'exercise_id')::uuid) THEN RAISE EXCEPTION 'Exercício não pertence ao treino'; END IF;
    v_new_id := NULL;
    IF v_change ? 'new_exercise_id' AND (v_change->>'new_exercise_id') IS NOT NULL THEN
      v_new_id := (v_change->>'new_exercise_id')::uuid;
    ELSIF v_change ? 'new_exercise_name' AND (v_change->>'new_exercise_name') IS NOT NULL THEN
      SELECT id INTO v_new_id FROM public.exercises
      WHERE name ILIKE (v_change->>'new_exercise_name')
      LIMIT 1;
      IF v_new_id IS NULL THEN
        SELECT id INTO v_new_id FROM public.exercises
        WHERE name ILIKE '%' || (v_change->>'new_exercise_name') || '%'
        LIMIT 1;
      END IF;
    END IF;

    IF (nullif(v_change->>'new_exercise_name','') IS NOT NULL OR nullif(v_change->>'new_exercise_id','') IS NOT NULL) AND (v_new_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.exercises WHERE id=v_new_id)) THEN RAISE EXCEPTION 'Exercício substituto não encontrado na biblioteca'; END IF;
    IF v_new_id IS NOT NULL THEN
      UPDATE public.workout_exercises
      SET exercise_id = v_new_id,
          override_locked = true
      WHERE daily_workout_id = v_daily_workout_id
        AND exercise_id = (v_change->>'exercise_id')::uuid;
    END IF;

    UPDATE public.workout_exercises
    SET sets = COALESCE((v_change->>'sets')::int4, sets),
        reps_range = COALESCE(v_change->>'reps_range', reps_range),
        rest_seconds = COALESCE((v_change->>'rest_seconds')::int4, rest_seconds),
        rpe_target = COALESCE((v_change->>'intensidade')::int4, rpe_target),
        observations = CASE
          WHEN v_change ? 'fadiga' THEN COALESCE(observations, '{}'::jsonb) || jsonb_build_object('fadiga', v_change->'fadiga')
          ELSE observations
        END,
        override_locked = true
    WHERE daily_workout_id = v_daily_workout_id
      AND exercise_id = COALESCE(v_new_id, (v_change->>'exercise_id')::uuid);
  END LOOP;

  SELECT jsonb_agg(
    jsonb_build_object(
      'exercise_id', we.exercise_id,
      'name', vc.name,
      'sets', we.sets,
      'reps', we.reps_range,
      'rest_seconds', we.rest_seconds,
      'tempo', we.tempo,
      'notes', we.observations,
      'video_url', vc.video_url,
      'gif_url', vc.gif_url,
      'target_muscles', to_jsonb(vc.target_muscles),
      'order', we.exercise_order,
      'override_locked', we.override_locked
    )
    ORDER BY we.exercise_order
  )
  INTO v_patched_exercises
  FROM public.workout_exercises we
  LEFT JOIN public.v_exercises_canonical vc ON vc.id = we.exercise_id
  WHERE we.daily_workout_id = v_daily_workout_id;

  UPDATE public.daily_workouts
  SET changes_json = jsonb_build_object('exercises', COALESCE(v_patched_exercises, '[]'::jsonb)),
      override_locked = true,
      updated_at = now()
  WHERE id = v_daily_workout_id;

  RETURN json_build_object(
    'success', true,
    'daily_workout_id', v_daily_workout_id,
    'exercises', (
      SELECT json_agg(json_build_object(
        'id', we.id, 'exercise_id', we.exercise_id,
        'exercise_name', vc.name,
        'sets', we.sets, 'reps_range', we.reps_range, 'rest_seconds', we.rest_seconds,
        'video_url', vc.video_url
      ) ORDER BY we.exercise_order)
      FROM public.workout_exercises we
      LEFT JOIN public.v_exercises_canonical vc ON vc.id = we.exercise_id
      WHERE we.daily_workout_id = v_daily_workout_id
    )
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.activation_advance(p_athlete_id uuid, p_step text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(step text, ok boolean, activation_row jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id=p_athlete_id AND (a.user_id=auth.uid() OR a.coach_id=auth.uid())) OR EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=p_athlete_id AND l.user_id=auth.uid()) INTO v_allowed;
  IF NOT v_allowed THEN RAISE EXCEPTION 'athlete_access_denied'; END IF;
  INSERT INTO public.athlete_activation (athlete_id,activation_started_at) VALUES (p_athlete_id,now()) ON CONFLICT (athlete_id) DO NOTHING;
  IF p_step='assessment' THEN
    UPDATE public.athletes SET primary_goal=COALESCE(p_payload->>'goal',primary_goal),objetivo=COALESCE(p_payload->>'goal',objetivo),experience_level=COALESCE(p_payload->>'experience_level',experience_level),nivel=COALESCE(p_payload->>'experience_level',nivel),weekly_frequency=COALESCE((p_payload->>'weekly_frequency')::int4,weekly_frequency),sessions_per_week=COALESCE((p_payload->>'weekly_frequency')::int4,sessions_per_week),injuries_limitations=COALESCE(p_payload->>'restrictions',injuries_limitations) WHERE id=p_athlete_id;
    UPDATE public.athlete_activation SET assessment_done_at=now() WHERE athlete_id=p_athlete_id;
  ELSIF p_step='generation' THEN
    IF NOT EXISTS (SELECT 1 FROM public.daily_workouts d JOIN public.workout_exercises e ON e.daily_workout_id=d.id WHERE d.athlete_id=p_athlete_id AND d.workout_date=CURRENT_DATE) THEN RAISE EXCEPTION 'A prescrição precisa ser gerada antes de avançar'; END IF;
    /* INSERT INTO public.daily_workouts (athlete_id,day_number,day_name,focus_muscles,workout_type,workout_date) VALUES (p_athlete_id,COALESCE((p_payload->>'day_number')::int4,1),COALESCE(p_payload->>'day_name','Treino Inicial'),COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_payload->'focus_muscles')),ARRAY['full_body']),COALESCE(p_payload->>'workout_type','quick'),CURRENT_DATE); */
    UPDATE public.athlete_activation SET plan_generated_at=now() WHERE athlete_id=p_athlete_id;
  ELSIF p_step='execute' THEN
    UPDATE public.athlete_activation SET first_workout_at=COALESCE(first_workout_at,now()) WHERE athlete_id=p_athlete_id;
  ELSIF p_step='consistency' THEN
    UPDATE public.athlete_activation SET consistency_days=consistency_days+1 WHERE athlete_id=p_athlete_id;
  ELSE RETURN QUERY SELECT p_step,false,'{}'::jsonb; RETURN; END IF;
  RETURN QUERY SELECT p_step,true,to_jsonb(a.*) FROM public.athlete_activation a WHERE a.athlete_id=p_athlete_id;
END; $function$
;
