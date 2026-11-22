-- Macro 01: preserve callable signatures; centralize ownership and server share rewards.
CREATE SCHEMA IF NOT EXISTS fitpro_internal;
REVOKE ALL ON SCHEMA fitpro_internal FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION fitpro_internal.assert_athlete_access(p_athlete_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $$
BEGIN
  -- Trusted server/SQL jobs retain access; browser roles never take this branch.
  IF auth.uid() IS NULL AND current_setting('role',true) IN ('none','postgres','service_role') THEN RETURN; END IF;
  IF auth.uid() IS NULL OR NOT (
    EXISTS (SELECT 1 FROM public.athletes a WHERE a.id=p_athlete_id AND (a.user_id=auth.uid() OR a.coach_id=auth.uid()))
    OR EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=p_athlete_id AND l.user_id=auth.uid())
    OR public.is_admin(auth.uid())
  ) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION fitpro_internal.assert_athlete_access(uuid) FROM PUBLIC,anon,authenticated;

-- Apply only the guard, retaining all arguments, return shapes and business logic.
CREATE OR REPLACE FUNCTION public.ajustar_exercicio_por_dor(p_athlete_id uuid, p_exercise_id uuid, p_body_region text, p_workout_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_daily_workout_id uuid;
  v_target_muscles text[];
  v_replacement_id uuid;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  SELECT id INTO v_daily_workout_id
  FROM daily_workouts
  WHERE athlete_id = p_athlete_id AND workout_date = p_workout_date
  ORDER BY created_at DESC LIMIT 1;

  IF v_daily_workout_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_workout_today');
  END IF;

  SELECT target_muscles INTO v_target_muscles
  FROM exercises WHERE id = p_exercise_id;

  SELECT id INTO v_replacement_id
  FROM exercises
  WHERE target_muscles && v_target_muscles
  AND id != p_exercise_id
  AND NOT (coalesce(instructions,'') ILIKE '%' || p_body_region || '%')
  AND NOT (coalesce(description,'') ILIKE '%' || p_body_region || '%')
  ORDER BY random() LIMIT 1;

  IF v_replacement_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_safe_variation', 'fallback', 'regenerate_day');
  END IF;

  UPDATE workout_exercises
  SET exercise_id = v_replacement_id, override_locked = true
  WHERE daily_workout_id = v_daily_workout_id
  AND exercise_id = p_exercise_id;

  INSERT INTO pain_reports (athlete_id, exercise_id, body_region, intensity, action_taken)
  VALUES (p_athlete_id, p_exercise_id, p_body_region, 5, 'pontual_swap');

  RETURN jsonb_build_object(
    'success', true, 'action', 'pontual_swap',
    'daily_workout_id', v_daily_workout_id,
    'old_exercise_id', p_exercise_id, 'new_exercise_id', v_replacement_id
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.ajustar_exercicio_por_dor(uuid,uuid,text,date) FROM PUBLIC,anon;

CREATE OR REPLACE FUNCTION public.aplicar_ajuste_treino_dia(p_athlete_id uuid, p_data date, p_changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
  v_result jsonb;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  IF p_athlete_id IS NULL OR p_data IS NULL THEN
    RAISE EXCEPTION 'athlete_id e data são obrigatórios';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.daily_workouts
  WHERE athlete_id = p_athlete_id AND workout_date = p_data
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.daily_workouts
    SET changes_json = COALESCE(changes_json, '{}'::jsonb) || COALESCE(p_changes, '{}'::jsonb),
        override_locked = true,
        updated_at = now()
    WHERE id = v_existing_id
    RETURNING jsonb_build_object('id', id, 'athlete_id', athlete_id, 'workout_date', workout_date,
                                  'override_locked', override_locked, 'changes_json', changes_json)
    INTO v_result;
  ELSE
    INSERT INTO public.daily_workouts (athlete_id, workout_date, changes_json, override_locked)
    VALUES (p_athlete_id, p_data, COALESCE(p_changes, '{}'::jsonb), true)
    RETURNING jsonb_build_object('id', id, 'athlete_id', athlete_id, 'workout_date', workout_date,
                                  'override_locked', override_locked, 'changes_json', changes_json)
    INTO v_result;
  END IF;

  BEGIN
    INSERT INTO public.system_events (event_type, entity_type, entity_id, actor_id, metadata)
    VALUES ('updated'::event_type, 'daily_workout_override', p_athlete_id, auth.uid(),
            jsonb_build_object('date', p_data, 'changes', p_changes));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_result;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.aplicar_ajuste_treino_dia(uuid,date,jsonb) FROM PUBLIC,anon;

CREATE OR REPLACE FUNCTION public.fn_gerar_treino_semana(p_athlete_id uuid, p_categoria text DEFAULT 'Hipertrofia'::text, p_dias_semana integer DEFAULT 4)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sets INT4;
  v_reps TEXT;
  v_rest INT4;
  v_workout_type TEXT;
  v_dia INT4;
  v_daily_workout_id UUID;
  v_data DATE;
  v_resultado JSON;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  -- Convenção de prescrição por categoria (mesma lógica do Treino Rápido, mas por objetivo)
  -- v_workout_type respeita o CHECK constraint real de daily_workouts:
  -- só aceita strength | hypertrophy | endurance | power | recovery
  CASE p_categoria
    WHEN 'Força' THEN v_sets := 4; v_reps := '4-6'; v_rest := 120; v_workout_type := 'strength';
    WHEN 'Condicionamento' THEN v_sets := 3; v_reps := '12-15'; v_rest := 45; v_workout_type := 'endurance';
    WHEN 'Perda de Peso' THEN v_sets := 3; v_reps := '15-20'; v_rest := 30; v_workout_type := 'endurance';
    WHEN 'Mobilidade' THEN v_sets := 2; v_reps := '10'; v_rest := 20; v_workout_type := 'recovery';
    ELSE v_sets := 4; v_reps := '8-12'; v_rest := 60; v_workout_type := 'hypertrophy'; -- Hipertrofia
  END CASE;

  -- Remove plano futuro ainda não iniciado desta semana (não mexe no que já foi executado)
  DELETE FROM public.workout_exercises
  WHERE daily_workout_id IN (
    SELECT dw.id FROM public.daily_workouts dw
    WHERE dw.athlete_id = p_athlete_id
      AND dw.workout_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 6)
      AND NOT EXISTS (
        SELECT 1 FROM public.workout_executions we
        WHERE we.athlete_id = p_athlete_id AND we.workout_date = dw.workout_date AND we.status = 'completed'
      )
  );
  DELETE FROM public.daily_workouts
  WHERE athlete_id = p_athlete_id
    AND workout_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + 6)
    AND NOT EXISTS (
      SELECT 1 FROM public.workout_executions we
      WHERE we.athlete_id = p_athlete_id AND we.workout_date = daily_workouts.workout_date AND we.status = 'completed'
    );

  -- Gera N dias distribuídos na semana
  FOR v_dia IN 1..p_dias_semana LOOP
    v_data := CURRENT_DATE + (v_dia - 1);

    INSERT INTO public.daily_workouts (athlete_id, day_number, day_name, focus_muscles, workout_type, workout_date)
    VALUES (p_athlete_id, v_dia, p_categoria || ' - Dia ' || v_dia, ARRAY['full_body'], v_workout_type, v_data)
    RETURNING id INTO v_daily_workout_id;

    INSERT INTO public.workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds)
    SELECT v_daily_workout_id, ex.id, row_number() OVER (), v_sets, v_reps, v_rest
    FROM (
      SELECT id FROM public.exercises
      WHERE video_url IS NOT NULL AND (goal ILIKE '%'||p_categoria||'%' OR goal IS NULL)
      ORDER BY random() LIMIT 6
    ) ex;
  END LOOP;

  SELECT json_build_object('success', true, 'categoria', p_categoria, 'dias_gerados', p_dias_semana) INTO v_resultado;
  RETURN v_resultado;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.fn_gerar_treino_semana(uuid,text,integer) FROM PUBLIC,anon;

CREATE OR REPLACE FUNCTION public.fn_get_protocolo_arquivos(p_athlete_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_arquivos JSON;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  SELECT json_agg(json_build_object(
    'training_name', sta.training_name,
    'training_type', sta.training_type,
    'training_description', sta.training_description,
    'html_file_url', sta.html_file_url,
    'periodization_html', sta.periodization_html,
    'periodization_file_url', sta.periodization_file_url,
    'start_date', sta.start_date,
    'end_date', sta.end_date
  ) ORDER BY sta.start_date DESC) INTO v_arquivos
  FROM public.student_training_assignments sta
  WHERE sta.student_id = p_athlete_id AND sta.is_active = true;

  RETURN json_build_object('arquivos', COALESCE(v_arquivos, '[]'::json));
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.fn_get_protocolo_arquivos(uuid) FROM PUBLIC,anon;

CREATE OR REPLACE FUNCTION public.fn_get_treino_dia(p_athlete_id uuid, p_data date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_daily_workout_id UUID;
  v_day_name TEXT;
  v_exercises JSON;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  SELECT id, day_name INTO v_daily_workout_id, v_day_name
  FROM public.daily_workouts
  WHERE athlete_id = p_athlete_id AND workout_date = p_data
  LIMIT 1;

  IF v_daily_workout_id IS NULL THEN
    RETURN json_build_object('has_workout', false, 'date', p_data);
  END IF;

  SELECT json_agg(json_build_object(
    'exercise_id', ex.id,
    'name', ex.name,
    'video_url', ex.video_url,
    'gif_url', ex.gif_url,
    'sets', we.sets,
    'reps_range', we.reps_range,
    'rest_seconds', we.rest_seconds,
    'override_locked', we.override_locked
  ) ORDER BY we.exercise_order) INTO v_exercises
  FROM public.workout_exercises we
  JOIN public.exercises ex ON ex.id = we.exercise_id
  WHERE we.daily_workout_id = v_daily_workout_id;

  RETURN json_build_object(
    'has_workout', true,
    'date', p_data,
    'daily_workout_id', v_daily_workout_id,
    'day_name', v_day_name,
    'exercises', COALESCE(v_exercises, '[]'::json)
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.fn_get_treino_dia(uuid,date) FROM PUBLIC,anon;

CREATE OR REPLACE FUNCTION public.fn_publicar_treino_smartreino(p_athlete_id uuid, p_workout_date date, p_day_number integer, p_day_name text, p_focus_muscles text[], p_workout_type text, p_estimated_duration_minutes integer, p_exercises jsonb, p_source text DEFAULT 'smartreino'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_daily_workout_id uuid;
  v_ex jsonb;
  v_count int := 0;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || p_workout_date::text,0));
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date=p_workout_date AND status IN ('in_progress','completed')) THEN
    RAISE EXCEPTION 'workout_prescription_locked' USING ERRCODE='55000';
  END IF;
  IF p_athlete_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'athlete_id_required');
  END IF;

  IF p_exercises IS NULL OR jsonb_array_length(p_exercises) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'no_exercises_provided');
  END IF;

  -- Upsert em daily_workouts (idempotente por athlete_id + workout_date)
  SELECT id INTO v_daily_workout_id
  FROM public.daily_workouts
  WHERE athlete_id = p_athlete_id AND workout_date = p_workout_date
  LIMIT 1;

  IF v_daily_workout_id IS NULL THEN
    INSERT INTO public.daily_workouts (
      athlete_id, workout_date, day_number, day_name,
      focus_muscles, workout_type, estimated_duration_minutes
    ) VALUES (
      p_athlete_id, p_workout_date, p_day_number, p_day_name,
      COALESCE(p_focus_muscles, ARRAY[]::text[]), p_workout_type, p_estimated_duration_minutes
    )
    RETURNING id INTO v_daily_workout_id;
  ELSE
    UPDATE public.daily_workouts
    SET day_number = p_day_number,
        day_name = p_day_name,
        focus_muscles = COALESCE(p_focus_muscles, focus_muscles),
        workout_type = p_workout_type,
        estimated_duration_minutes = p_estimated_duration_minutes,
        updated_at = now()
    WHERE id = v_daily_workout_id;

    -- Limpa exercícios antigos deste daily_workout antes de regravar (republicação idempotente)
    DELETE FROM public.workout_exercises WHERE daily_workout_id = v_daily_workout_id;
  END IF;

  FOR v_ex IN SELECT * FROM jsonb_array_elements(p_exercises) LOOP
    INSERT INTO public.workout_exercises (
      daily_workout_id, exercise_id, exercise_order, sets, reps_range,
      rest_seconds, load_percentage, tempo, rpe_target, observations
    ) VALUES (
      v_daily_workout_id,
      (v_ex->>'exercise_id')::uuid,
      COALESCE((v_ex->>'exercise_order')::int, 0),
      COALESCE((v_ex->>'sets')::int, 3),
      COALESCE(v_ex->>'reps_range', '8-12'),
      COALESCE((v_ex->>'rest_seconds')::int, 60),
      v_ex->>'load_percentage',
      v_ex->>'tempo',
      (v_ex->>'rpe_target')::int,
      CASE WHEN v_ex ? 'notes' AND (v_ex->>'notes') IS NOT NULL
           THEN jsonb_build_object('notes', v_ex->>'notes')
           ELSE NULL
      END
    );
    v_count := v_count + 1;
  END LOOP;

  -- Log de auditoria (reaproveita a tabela já existente, sem depender de chave/HTTP)
  INSERT INTO public.fitpro_delivery_log (
    athlete_id, workout_date, source, status, payload, result
  ) VALUES (
    p_athlete_id, p_workout_date, p_source, 'success',
    jsonb_build_object('method', 'direct_db_write', 'exercise_count', v_count),
    jsonb_build_object('daily_workout_id', v_daily_workout_id)
  );

  RETURN json_build_object(
    'success', true,
    'daily_workout_id', v_daily_workout_id,
    'exercise_count', v_count
  );
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.fitpro_delivery_log (
    athlete_id, workout_date, source, status, last_error, payload
  ) VALUES (
    p_athlete_id, p_workout_date, p_source, 'failed', SQLERRM,
    jsonb_build_object('method', 'direct_db_write')
  );
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.fn_publicar_treino_smartreino(uuid,date,integer,text,text[],text,integer,jsonb,text) FROM PUBLIC,anon;

CREATE OR REPLACE FUNCTION public.fn_sugerir_protocolo_por_perfil(p_athlete_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_athlete RECORD; v_pillar TEXT; v_sugestao RECORD;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  SELECT primary_goal, experience_level INTO v_athlete
  FROM public.athletes WHERE id = p_athlete_id;

  v_pillar := CASE
    WHEN v_athlete.primary_goal ILIKE '%hipertrofia%' OR v_athlete.primary_goal ILIKE '%força%'
      OR v_athlete.primary_goal ILIKE '%estetica%' OR v_athlete.primary_goal ILIKE '%estética%' THEN 'estrutural'
    WHEN v_athlete.primary_goal ILIKE '%longevidade%' OR v_athlete.primary_goal ILIKE '%saude%'
      OR v_athlete.primary_goal ILIKE '%saúde%' OR v_athlete.primary_goal ILIKE '%bem-estar%' THEN 'longevidade'
    ELSE 'performance'
  END;

  SELECT id, protocol_name, pillar, variation_name, rpe_range INTO v_sugestao
  FROM public.smart_treino_protocols
  WHERE pillar = v_pillar
    AND (v_athlete.experience_level IS NULL OR recommended_for @> ARRAY[v_athlete.experience_level] OR recommended_for IS NULL)
  ORDER BY random() LIMIT 1;

  IF v_sugestao IS NULL THEN
    SELECT id, protocol_name, pillar, variation_name, rpe_range INTO v_sugestao
    FROM public.smart_treino_protocols WHERE pillar = v_pillar ORDER BY random() LIMIT 1;
  END IF;

  RETURN json_build_object(
    'has_suggestion', v_sugestao.id IS NOT NULL,
    'protocol_id', v_sugestao.id,
    'protocol_name', v_sugestao.protocol_name,
    'pillar', v_sugestao.pillar,
    'variation_name', v_sugestao.variation_name,
    'rpe_range', v_sugestao.rpe_range
  );
END; $function$;
REVOKE EXECUTE ON FUNCTION public.fn_sugerir_protocolo_por_perfil(uuid) FROM PUBLIC,anon;

CREATE OR REPLACE FUNCTION public.get_week_workouts(p_athlete_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_plano_id UUID;
    v_modelos_json JSONB;
    v_exercises_json JSONB;
    v_fase TEXT := 'Base';
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
    -- 1. Tenta recuperar a periodização ou execuções agendadas existentes para a semana ativa
    SELECT plano_id INTO v_plano_id
    FROM public.workout_executions
    WHERE athlete_id = p_athlete_id AND workout_date >= CURRENT_DATE
    ORDER BY workout_date ASC LIMIT 1;

    -- 2. Se houver plano ativo, monta a lista estruturada de modelos e exercícios agendados
    IF v_plano_id IS NOT NULL THEN
        SELECT jsonb_agg(payload) INTO v_modelos_json
        FROM public.workout_executions
        WHERE athlete_id = p_athlete_id AND plano_id = v_plano_id;

        v_fase := 'Periodização Ativa';
    END IF;

    -- 3. FALLBACK ESTRUTURAL: Caso não encontre periodização ativa ou falhe, monta a partir do catálogo "Base"
    IF v_modelos_json IS NULL OR jsonb_array_length(v_modelos_json) = 0 THEN
        WITH fallback_catalog AS (
            SELECT id, name, general_objective as objective
            FROM public.workout_models
            WHERE periodization_phase ILIKE '%Base%'
            LIMIT 3
        )
        SELECT jsonb_agg(jsonb_build_object(
            'model_id', id,
            'workout_name', name,
            'target_goal', objective,
            'is_fallback', true
        )) INTO v_modelos_json
        FROM fallback_catalog;

        -- Coleta exercícios associados para preencher o grid D1-D7 do front
        SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'video_url', video_url))
        INTO v_exercises_json
        FROM public.exercises
        WHERE video_url IS NOT NULL
        ORDER BY random() LIMIT 12;

        INSERT INTO public.fitpro_delivery_log (athlete_id, plano_id, tipo_treino, source, status, error_message)
        VALUES (p_athlete_id, v_plano_id, 'week', 'generic_fallback', 'success', 'Sem plano ativo no banco. Injetado Fase de Base do catálogo.');
    ELSE
        INSERT INTO public.fitpro_delivery_log (athlete_id, plano_id, tipo_treino, source, status)
        VALUES (p_athlete_id, v_plano_id, 'week', 'catalog', 'success');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'phase', v_fase,
        'modelos', v_modelos_json,
        'exercises', COALESCE(v_exercises_json, '[]'::jsonb)
    );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_week_workouts(uuid) FROM PUBLIC,anon;

CREATE OR REPLACE FUNCTION public.get_workout_of_day(p_athlete_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ap record; v_plan record; v_model jsonb; v_start date;
  v_days_since int; v_mes int; v_week_in_month int; v_day_of_cycle int;
  v_meso jsonb; v_micro jsonb; v_days_arr jsonb; v_day jsonb;
  v_is_deload boolean; v_status text; v_groups jsonb; v_exercises jsonb;
  v_goal text; v_synth boolean := false; v_split jsonb; v_seed text;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  SELECT * INTO v_ap FROM public.athlete_periodizations
  WHERE athlete_id = p_athlete_id AND status IN ('active','in_progress')
  ORDER BY (model_snapshot IS NOT NULL) DESC, assigned_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','no_plan','message','Nenhuma periodização ativa atribuída.');
  END IF;

  v_start := v_ap.assigned_at::date;
  v_days_since := GREATEST(0, (p_date - v_start));
  v_mes := (v_days_since / 30) + 1;
  v_week_in_month := ((v_days_since % 30) / 7) + 1;
  IF v_week_in_month > 4 THEN v_week_in_month := 4; END IF;
  v_day_of_cycle := (v_days_since % 7) + 1;
  v_is_deload := (v_week_in_month = 4);

  IF v_ap.model_snapshot IS NOT NULL THEN
    v_model := v_ap.model_snapshot;
  ELSE
    v_synth := true;
    SELECT * INTO v_plan FROM public.periodization_annual_plans WHERE id = v_ap.annual_plan_id;
    v_goal := COALESCE(v_plan.annual_goal, 'hipertrofia');
    v_split := CASE
      WHEN v_goal ILIKE '%forca%' OR v_goal ILIKE '%força%' THEN
        '[{"dia":1,"tipo_dia":"Upper Força","status":"treino","grupos_musculares":["peito","costas","ombro"],"instrucao_app":"Treino de força superior."},
          {"dia":2,"tipo_dia":"Lower Força","status":"treino","grupos_musculares":["quadriceps","posterior_coxa","gluteo"],"instrucao_app":"Treino de força inferior."},
          {"dia":3,"tipo_dia":"descanso","status":"folga","grupos_musculares":[],"instrucao_app":"Descanso ativo."},
          {"dia":4,"tipo_dia":"Upper Volume","status":"treino","grupos_musculares":["peito","ombro","triceps","biceps"],"instrucao_app":"Volume superior."},
          {"dia":5,"tipo_dia":"Lower Volume","status":"treino","grupos_musculares":["quadriceps","gluteo","panturrilha","core"],"instrucao_app":"Volume inferior + core."},
          {"dia":6,"tipo_dia":"descanso","status":"folga","grupos_musculares":[],"instrucao_app":"Descanso."},
          {"dia":7,"tipo_dia":"descanso","status":"folga","grupos_musculares":[],"instrucao_app":"Descanso."}]'::jsonb
      ELSE
        '[{"dia":1,"tipo_dia":"A","status":"treino","grupos_musculares":["peito","ombro","triceps"],"instrucao_app":"Peito, ombro e tríceps."},
          {"dia":2,"tipo_dia":"B","status":"treino","grupos_musculares":["costas","biceps","antebraco"],"instrucao_app":"Costas e bíceps."},
          {"dia":3,"tipo_dia":"C","status":"treino","grupos_musculares":["quadriceps","posterior_coxa","gluteo","panturrilha","core"],"instrucao_app":"Pernas e core."},
          {"dia":4,"tipo_dia":"descanso","status":"folga","grupos_musculares":[],"instrucao_app":"Descanso ativo."},
          {"dia":5,"tipo_dia":"A","status":"treino","grupos_musculares":["peito","ombro","triceps"],"instrucao_app":"Peito, ombro e tríceps."},
          {"dia":6,"tipo_dia":"B","status":"treino","grupos_musculares":["costas","biceps","antebraco"],"instrucao_app":"Costas e bíceps."},
          {"dia":7,"tipo_dia":"C","status":"treino","grupos_musculares":["quadriceps","gluteo","panturrilha","core"],"instrucao_app":"Pernas e core."}]'::jsonb
      END;
    v_model := jsonb_build_object(
      'model_id', COALESCE(v_ap.periodization_model_id,'auto'),
      'nome', COALESCE(v_ap.periodization_model_id,'Plano anual'),
      'categoria', v_goal,
      'mesociclos', COALESCE(v_plan.mesocycles, '[]'::jsonb),
      'microciclo_padrao', jsonb_build_object('semanas_1_a_3', v_split, 'semana_4_deload', v_split));
  END IF;

  SELECT m INTO v_meso FROM jsonb_array_elements(v_model->'mesociclos') m
  WHERE COALESCE((m->>'mes')::int, 0) = v_mes LIMIT 1;
  IF v_meso IS NULL THEN
    SELECT m INTO v_meso FROM jsonb_array_elements(v_model->'mesociclos') m LIMIT 1;
  END IF;
  IF v_meso IS NULL THEN
    v_meso := jsonb_build_object('nome','Mesociclo padrão','series_por_grupo_semana','12-16',
      'faixa_reps','8-12','intensidade_percent_1rm','65-80','rpe_alvo','7-8',
      'frequencia_semanal_por_grupo','2','metodo_principal','séries retas','deload_reducao_volume','40-50%');
  END IF;

  v_micro := v_model->'microciclo_padrao';
  v_days_arr := CASE WHEN v_is_deload THEN v_micro->'semana_4_deload' ELSE v_micro->'semanas_1_a_3' END;
  IF v_days_arr IS NULL THEN v_days_arr := v_micro->'semanas_1_a_3'; END IF;

  SELECT d INTO v_day FROM jsonb_array_elements(v_days_arr) d
  WHERE (d->>'dia')::int = v_day_of_cycle LIMIT 1;

  IF v_day IS NULL THEN
    RETURN jsonb_build_object('status','no_session','date',p_date,'mes',v_mes,'semana',v_week_in_month,
      'dia',v_day_of_cycle,'message','Sem sessão definida para este dia.');
  END IF;

  v_status := v_day->>'status';
  v_groups := COALESCE(v_day->'grupos_musculares','[]'::jsonb);

  IF v_status <> 'treino' THEN
    RETURN jsonb_build_object('status','rest','date',p_date,'mes',v_mes,'semana',v_week_in_month,
      'dia',v_day_of_cycle,'day_type',v_day->>'tipo_dia','instructions',v_day->>'instrucao_app',
      'is_deload_week',v_is_deload,'synthetic',v_synth);
  END IF;

  -- seed estável: mesmo atleta + mesmo dia-de-ciclo (1-7) + mesmo mês do plano
  -- = sempre o mesmo treino ao reabrir, mas ainda varia entre dias/meses diferentes
  v_seed := p_athlete_id::text || '-' || v_mes::text || '-' || v_day_of_cycle::text;
  v_exercises := public.find_exercises_for_groups(v_groups, CASE WHEN v_is_deload THEN 5 ELSE 7 END, v_seed);

  RETURN jsonb_build_object(
    'status','workout','date',p_date,'mes',v_mes,'semana',v_week_in_month,'dia',v_day_of_cycle,
    'is_deload_week',v_is_deload,'synthetic',v_synth,
    'day_type', v_day->>'tipo_dia',
    'day_name', COALESCE(v_day->>'nome', v_day->>'tipo_dia'),
    'groups', v_groups,
    'instructions', v_day->>'instrucao_app',
    'prescription', jsonb_build_object(
      'series_por_grupo_semana', v_meso->>'series_por_grupo_semana',
      'faixa_reps', COALESCE(v_meso->>'faixa_reps', v_meso->>'reps_range'),
      'intensidade_percent_1rm', v_meso->>'intensidade_percent_1rm',
      'rpe_alvo', CASE WHEN v_is_deload THEN 'alvo -2 a -3' ELSE COALESCE(v_meso->>'rpe_alvo', v_meso->>'rpe_cap') END,
      'frequencia_semanal_por_grupo', v_meso->>'frequencia_semanal_por_grupo',
      'metodo_principal', v_meso->>'metodo_principal',
      'deload_reducao_volume', CASE WHEN v_is_deload THEN (v_meso->>'deload_reducao_volume') ELSE NULL END),
    'meso', jsonb_build_object('id', v_meso->>'id','nome', COALESCE(v_meso->>'nome','Mesociclo'),'mes', v_meso->>'mes'),
    'model', jsonb_build_object('id', v_model->>'model_id','nome', v_model->>'nome','categoria', v_model->>'categoria'),
    'exercises', v_exercises);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_workout_of_day(uuid,date) FROM PUBLIC,anon;

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
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_aluno_id AND workout_date=p_data AND status IN ('in_progress','completed')) THEN
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
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
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
$function$;
REVOKE EXECUTE ON FUNCTION public.sync_fitpro_planejamento(uuid,text) FROM PUBLIC,anon;

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
BEGIN
  IF auth.uid() IS NULL OR (NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id=p_athlete_id AND (a.user_id=auth.uid() OR a.coach_id=auth.uid())) AND NOT EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=p_athlete_id AND l.user_id=auth.uid())) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501'; END IF;
  IF v_goal IS NULL OR v_goal NOT IN ('strength','cardio','mobility','recovery') OR p_tempo_min IS NULL OR p_tempo_min NOT IN (15,20,30,45,60) THEN RAISE EXCEPTION 'Objetivo ou duração inválidos'; END IF;
  SELECT * INTO STRICT v_profile FROM public.athletes WHERE id=p_athlete_id;
  SELECT * INTO v_check FROM public.daily_checkins WHERE athlete_id=p_athlete_id AND checkin_date=v_date;
  IF (v_check.id IS NULL OR v_check.sono IS NULL OR v_check.energia IS NULL OR v_check.humor IS NULL OR v_check.motivacao IS NULL OR v_check.dor IS NULL) THEN RAISE EXCEPTION 'Faça a calibração completa antes de montar o treino'; END IF;
  IF (coalesce(v_check.dor,0)>=3 OR nullif(trim(v_check.dor_local),'') IS NOT NULL OR (nullif(trim(v_profile.injuries_limitations),'') IS NOT NULL AND lower(trim(v_profile.injuries_limitations)) NOT IN ('nenhuma','nenhum','não','nao','none','sem restrições','sem restricoes'))) THEN RAISE EXCEPTION 'Revise suas restrições em Ajuste de Treino antes de gerar uma nova sessão'; END IF;
  v_resources := CASE
    WHEN v_new THEN string_to_array(substr(p_equipamento,11),',')
    WHEN p_equipamento IN ('home','outdoor') THEN ARRAY['bodyweight']
    WHEN p_equipamento='home_basic' THEN ARRAY['bodyweight','dumbbells','bands']
    WHEN p_equipamento='gym' THEN ARRAY['gym']
    ELSE NULL END;
  IF v_resources IS NULL OR cardinality(v_resources)=0 OR EXISTS (SELECT 1 FROM unnest(v_resources) r WHERE r NOT IN ('bodyweight','dumbbells','bands','gym')) THEN RAISE EXCEPTION 'Selecione os recursos disponíveis'; END IF;
  SELECT current_phase::text INTO v_phase FROM public.vw_athlete_periodizacao_ativa WHERE athlete_id=p_athlete_id LIMIT 1;
  v_sets := CASE WHEN lower(coalesce(v_phase,'')) ~ '(deload|recuper|descarga)' OR lower(coalesce(v_profile.experience_level,'beginner')) IN ('beginner','iniciante') OR coalesce(v_check.energia,5)<=2 OR v_goal='recovery' THEN 2 ELSE 3 END;
  v_reps := CASE WHEN v_goal IN ('mobility','recovery') THEN '20-30 s' WHEN v_goal='cardio' THEN '30 s' ELSE '8-12' END;
  v_rest := CASE WHEN v_goal IN ('mobility','recovery') THEN 30 WHEN coalesce(v_check.energia,5)<=2 THEN 90 ELSE 60 END;
  v_limit := greatest(1,least(10,floor((p_tempo_min-3)*60.0/(v_sets*40+(v_sets-1)*v_rest+30))::integer));

  -- Seleção estruturada: round-robin entre grupos (pernas, empurrar, puxar, core),
  -- penaliza o que foi feito nas últimas 48h e desempata por hash estável (atleta+dia),
  -- sem random(): mesmo dia = mesmo treino, dia seguinte = variação.
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
  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text||v_date::text||'quick',0));
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date=v_date AND phase_name='quick' AND status IN ('in_progress','completed')) THEN RAISE EXCEPTION 'Um treino rápido já foi iniciado hoje. Retome-o em Treino.'; END IF;
  DELETE FROM public.workout_exercises WHERE daily_workout_id IN (SELECT id FROM public.daily_workouts WHERE athlete_id=p_athlete_id AND workout_date=v_date AND workout_type='quick');
  DELETE FROM public.daily_workouts WHERE athlete_id=p_athlete_id AND workout_date=v_date AND workout_type='quick';
  INSERT INTO public.daily_workouts(athlete_id,day_number,day_name,focus_muscles,workout_type,workout_date)
  VALUES(p_athlete_id,1,'Treino Rápido · '||v_goal,ARRAY['full_body'],'quick',v_date) RETURNING id INTO v_id;
  INSERT INTO public.workout_exercises(daily_workout_id,exercise_id,exercise_order,sets,reps_range,rest_seconds)
  SELECT v_id,(e->>'id')::uuid,ordinality,v_sets,v_reps,v_rest FROM json_array_elements(v_exercises) WITH ORDINALITY t(e,ordinality);
  RETURN json_build_object('daily_workout_id',v_id,'exercises',v_exercises,'estimated_duration_min',v_estimated,'preparation_minutes',3,'requested_duration_min',p_tempo_min,'context',json_build_object('experience_level',v_profile.experience_level,'profile_goal',v_profile.primary_goal,'energy',v_check.energia,'sleep',v_check.sono,'recent_history_used',true,'periodization_phase',v_phase));
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_treino_rapido(p_athlete_id uuid,p_tempo_min integer,p_objetivo text DEFAULT NULL,p_local text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
BEGIN
  RETURN public.fn_treino_rapido(p_athlete_id,p_objetivo,p_tempo_min,p_local);
END $$;
REVOKE ALL ON FUNCTION public.fn_treino_rapido(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_treino_rapido(uuid,integer,text,text) TO authenticated;
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
-- Payment state is written only by trusted fulfillment; clients retain own reads.
DROP POLICY IF EXISTS "own subscriptions insert" ON public.user_subscriptions;
DROP POLICY IF EXISTS "own subscriptions update" ON public.user_subscriptions;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.user_subscriptions FROM anon,authenticated;

-- Remove broad INSERT; replace direct/link ownership policy without changing coach access.
DROP POLICY IF EXISTS "Service role can insert pdi history" ON public.athlete_pdi_history;
DROP POLICY IF EXISTS "Athletes can insert own pdi history" ON public.athlete_pdi_history;
CREATE POLICY "Athletes insert linked PDI history" ON public.athlete_pdi_history FOR INSERT TO authenticated
WITH CHECK (athlete_id=public.fn_current_athlete_id());
CREATE POLICY "Athletes read linked PDI history" ON public.athlete_pdi_history FOR SELECT TO authenticated
USING (athlete_id=public.fn_current_athlete_id());

-- Shares are immutable client receipts. BEFORE INSERT is the only award path.
DROP POLICY IF EXISTS proprio ON public.share_events;
REVOKE ALL ON public.share_events FROM anon;
REVOKE UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.share_events FROM authenticated;
GRANT SELECT,INSERT ON public.share_events TO authenticated;
CREATE INDEX IF NOT EXISTS share_events_reward_dedupe_idx ON public.share_events(athlete_id,content_type,content_id) WHERE rewarded IS TRUE;
CREATE INDEX IF NOT EXISTS share_events_reward_day_idx ON public.share_events(athlete_id,shared_at) WHERE rewarded IS TRUE;

CREATE OR REPLACE FUNCTION public.trg_share_events_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE v_ath uuid; v_xp integer; v_duplicate boolean; v_today integer;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'share_access_denied' USING ERRCODE='42501';
  END IF;
  v_ath:=public.fn_current_athlete_id();
  IF v_ath IS NULL OR (NEW.athlete_id IS NOT NULL AND NEW.athlete_id<>v_ath) THEN
    RAISE EXCEPTION 'share_athlete_access_denied' USING ERRCODE='42501';
  END IF;
  IF NEW.channel NOT IN ('native','native_share','copy','download','whatsapp','instagram') OR
    nullif(trim(NEW.content_type),'') IS NULL OR length(NEW.content_type)>80 OR length(coalesce(NEW.content_id,''))>200 THEN
    RAISE EXCEPTION 'invalid_share_event' USING ERRCODE='22023';
  END IF;
  NEW.athlete_id:=v_ath; NEW.shared_at:=now(); NEW.created_at:=now(); NEW.rewarded:=false; NEW.reward_xp:=0;
  -- Copy/download are export actions, not evidence of a share handoff.
  IF NEW.channel NOT IN ('native','native_share') THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.athletes WHERE id=v_ath FOR UPDATE;
  SELECT EXISTS(SELECT 1 FROM public.share_events s WHERE s.athlete_id=v_ath AND s.content_type=NEW.content_type AND s.content_id IS NOT DISTINCT FROM NEW.content_id AND s.rewarded) INTO v_duplicate;
  SELECT count(*) INTO v_today FROM public.share_events s WHERE s.athlete_id=v_ath AND s.rewarded AND s.shared_at>=date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  IF v_duplicate OR v_today>=3 THEN RETURN NEW; END IF;
  v_xp:=CASE WHEN NEW.content_type IN ('workout','workout_completed','treino_concluido','quick_workout_completed') THEN 20 WHEN NEW.content_type IN ('weekly_recap','id_card_upgrade') THEN 25 ELSE 10 END;
  PERFORM public.fn_award_xp(v_ath,v_xp,'share_bonus',jsonb_build_object('event_id',NEW.id,'content_type',NEW.content_type,'content_id',NEW.content_id,'evidence','native_handoff'));
  NEW.rewarded:=true; NEW.reward_xp:=v_xp;
  RETURN NEW;
END $$;

-- Compatibility RPC: returns the persisted receipt; never creates a reward without an event.
CREATE OR REPLACE FUNCTION public.fn_reward_share(p_athlete_id uuid,p_content_type text,p_content_id text DEFAULT NULL,p_amount integer DEFAULT 15)
RETURNS TABLE(awarded boolean,reason text,new_total_xp integer,new_level integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
DECLARE v_event public.share_events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_athlete_id IS DISTINCT FROM public.fn_current_athlete_id() THEN RAISE EXCEPTION 'share_access_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_event FROM public.share_events s WHERE s.athlete_id=p_athlete_id AND s.user_id=auth.uid() AND s.content_type=p_content_type AND s.content_id IS NOT DISTINCT FROM p_content_id ORDER BY s.shared_at DESC,s.id DESC LIMIT 1;
  RETURN QUERY SELECT coalesce(v_event.rewarded,false),CASE WHEN v_event.id IS NULL THEN 'share_event_required' WHEN v_event.rewarded THEN 'receipt_confirmed' ELSE 'not_rewarded' END,a.total_xp,a.level FROM public.athletes a WHERE a.id=p_athlete_id;
END $$;
REVOKE ALL ON FUNCTION public.fn_reward_share(uuid,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_reward_share(uuid,text,text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.trg_share_events_reward() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.fn_award_xp(p_athlete_id uuid, p_amount integer, p_source text DEFAULT 'unknown'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(new_total_xp integer, new_level integer, leveled_up boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_prev_xp int;
  v_prev_level int;
  v_new_xp int;
  v_new_level int;
begin
  -- Shared content can award only from the receipt trigger, never from browser RPC.
  if coalesce(p_source,'') like 'share%' and pg_trigger_depth()=0 then
    raise exception 'share_event_required' using errcode='42501';
  end if;
  if p_athlete_id is null or p_amount is null or p_amount = 0 then
    return;
  end if;

  if not exists (
    select 1
    from public.athletes a
    where a.id = p_athlete_id
      and (
        a.user_id = (select auth.uid())
        or a.coach_id = (select auth.uid())
        or exists (select 1 from public.athlete_auth_link l where l.athlete_id=a.id and l.user_id=(select auth.uid()))
        or public.is_admin((select auth.uid()))
        or public.is_trainer((select auth.uid()))
      )
  ) then
    raise exception 'athlete_access_denied' using errcode = '42501';
  end if;

  select coalesce(total_xp,0), coalesce(level,1)
    into v_prev_xp, v_prev_level
  from public.athletes where id = p_athlete_id for update;

  if not found then
    raise exception 'athlete % not found', p_athlete_id;
  end if;

  v_new_xp := greatest(0, v_prev_xp + p_amount);
  v_new_level := greatest(1, floor(v_new_xp::numeric / 1000)::int + 1);

  update public.athletes
     set total_xp = v_new_xp, level = v_new_level, updated_at = now()
   where id = p_athlete_id;

  perform public.log_event(
    'created'::event_type, 'athlete_xp', p_athlete_id, null,
    jsonb_build_object('amount', p_amount, 'source', p_source, 'meta', p_metadata,
                       'new_total_xp', v_new_xp, 'new_level', v_new_level, 'event_key', 'xp_awarded')
  );

  return query select v_new_xp, v_new_level, (v_new_level > v_prev_level);
end;
$function$;
