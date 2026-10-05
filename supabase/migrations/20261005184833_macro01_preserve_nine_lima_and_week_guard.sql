-- Commit the already-live Nine/Lima level fallback, preserving current behavior.
CREATE OR REPLACE FUNCTION public.fn_aplicar_nine_lima(p_athlete_id uuid, p_data date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid;
  v_goal text;
  v_pillar text;
  v_level text;
  v_lvl_raw text;
  v_protocol_id text;
  v_count int;
  v_res json;
begin
  -- posse do recurso
  if auth.uid() is null or not (
    exists (select 1 from athletes a where a.id = p_athlete_id and a.user_id = auth.uid())
    or exists (select 1 from athlete_auth_link al where al.athlete_id = p_athlete_id and al.user_id = auth.uid())
    or exists (select 1 from athletes a join auth.users u on u.email = a.email where a.id = p_athlete_id and u.id = auth.uid())
  ) then
    raise exception 'not authorized';
  end if;

  -- nunca sobrescrever treino já iniciado/concluído na data
  if exists (select 1 from workout_executions we where we.athlete_id = p_athlete_id and we.workout_date = p_data and we.status in ('in_progress','completed')) then
    return json_build_object('success', false, 'error', 'treino_do_dia_ja_iniciado');
  end if;

  select coalesce(a.user_id, al.user_id), lower(coalesce(a.training_level::text, a.experience_level::text, a.nivel::text, a.level::text, ''))
    into v_user, v_lvl_raw
  from athletes a left join athlete_auth_link al on al.athlete_id = a.id
  where a.id = p_athlete_id limit 1;

  select up.goal::text into v_goal from user_parameters up where up.user_id = v_user;

  v_pillar := case v_goal
    when 'aesthetics' then 'estrutural'
    when 'recomposition' then 'estrutural'
    when 'longevity' then 'longevidade'
    else 'performance' end;

  v_level := case
    when v_lvl_raw like 'inic%' or v_lvl_raw like 'begin%' then 'iniciante'
    when v_lvl_raw like 'avan%' or v_lvl_raw like 'adv%' then 'avancado'
    else 'intermediario' end;

  select count(*) into v_count from smart_treino_protocols where pillar = v_pillar and v_level = any(recommended_for);

  -- fallback: pilar sem protocolo pro nível (ex.: longevidade/avançado) usa o nível intermediário
  if v_count = 0 and v_level <> 'intermediario' then
    v_level := 'intermediario';
    select count(*) into v_count from smart_treino_protocols where pillar = v_pillar and v_level = any(recommended_for);
  end if;

  if v_count = 0 then
    return json_build_object('success', false, 'error', 'nenhum_protocolo_para_o_perfil');
  end if;

  -- rotaciona entre os protocolos do pilar/nível conforme o dia do ano
  select id into v_protocol_id
  from smart_treino_protocols
  where pillar = v_pillar and v_level = any(recommended_for)
  order by protocol_id, variation_id, id
  offset (extract(doy from p_data)::int % v_count) limit 1;

  v_res := public.fn_aplicar_protocolo_9x9x9(p_athlete_id, v_protocol_id, p_data);
  return v_res;
end;
$function$;

-- Legacy week generation must not delete a week already in execution.
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
  IF p_dias_semana IS NULL OR p_dias_semana NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'invalid_week_frequency' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || 'weekly_generation',0));
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date BETWEEN CURRENT_DATE AND CURRENT_DATE+6 AND status IN ('in_progress','completed')) THEN
    RAISE EXCEPTION 'workout_prescription_locked' USING ERRCODE='55000';
  END IF;
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
