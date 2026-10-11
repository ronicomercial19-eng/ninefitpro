-- Macro 03: weekly planning is generated from the active periodization.
-- Existing assignments and executions are immutable to this generator.

CREATE OR REPLACE FUNCTION public.fn_get_week_workouts(
  p_athlete_id uuid,
  p_week_start date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_periodization record;
  v_week json;
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

  SELECT json_agg(row_to_json(d) ORDER BY d.workout_date) INTO v_week
  FROM (
    SELECT
      dw.id,
      extract(isodow FROM dates.workout_date)::integer AS day_number,
      coalesce(dw.day_name, (ARRAY['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'])[extract(isodow FROM dates.workout_date)::integer]) AS day_name,
      dates.workout_date,
      dw.workout_type,
      CASE
        WHEN dw.id IS NULL THEN 'rest'
        WHEN dw.workout_type = 'rest' THEN 'rest'
        ELSE coalesce(wx.status, 'planned')
      END AS status,
      wx.execution_id,
      CASE WHEN dw.id IS NULL THEN '[]'::json
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

REVOKE ALL ON FUNCTION public.fn_get_week_workouts(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_week_workouts(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_generate_periodized_week(
  p_athlete_id uuid,
  p_week_start date,
  p_days_week integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
BEGIN
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
      WHERE dw.athlete_id = p_athlete_id AND dw.workout_date = v_date
      UNION ALL
      SELECT 1 FROM public.workout_executions we
      WHERE we.athlete_id = p_athlete_id AND we.workout_date = v_date
        AND we.status IN ('started', 'in_progress', 'paused', 'completed', 'skipped')
    ) INTO v_existing;

    IF v_existing THEN
      v_preserved := v_preserved + 1;
      CONTINUE;
    END IF;

    v_result := public.prescrever_treino(p_athlete_id, v_date);
    IF coalesce(v_result->>'sucesso', 'false') <> 'true' OR nullif(v_result->>'daily_workout_id', '') IS NULL THEN
      RAISE EXCEPTION 'periodized_day_generation_failed:%', coalesce(v_result->>'motivo', 'unknown') USING ERRCODE = 'P0001';
    END IF;
    v_generated := v_generated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'week_start', v_week_start,
    'week_end', v_week_start + 6,
    'weekly_frequency', v_frequency,
    'generated', v_generated,
    'preserved', v_preserved
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_generate_periodized_week(uuid, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_generate_periodized_week(uuid, date, integer) TO authenticated;

-- Keep old callers compatible while removing random selection and destructive
-- week replacement from the legacy entry point.
CREATE OR REPLACE FUNCTION public.fn_gerar_treino_semana(
  p_athlete_id uuid,
  p_categoria text DEFAULT 'Hipertrofia'::text,
  p_dias_semana integer DEFAULT 4
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_week_start date := date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_result jsonb;
BEGIN
  v_result := public.fn_generate_periodized_week(p_athlete_id, v_week_start, p_dias_semana);
  RETURN json_build_object(
    'success', v_result->'success',
    'categoria', coalesce(p_categoria, 'Periodização ativa'),
    'dias_gerados', coalesce((v_result->>'generated')::integer, 0),
    'preservados', coalesce((v_result->>'preserved')::integer, 0),
    'week_start', v_result->'week_start',
    'week_end', v_result->'week_end',
    'error', v_result->'error'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_gerar_treino_semana(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_gerar_treino_semana(uuid, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_skip_daily_workout_execution(p_daily_workout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_athlete_id uuid := public.fn_current_athlete_id();
  v_day public.daily_workouts%ROWTYPE;
  v_execution_id uuid;
  v_date date;
BEGIN
  IF auth.uid() IS NULL OR v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'athlete_authentication_required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_day
  FROM public.daily_workouts
  WHERE id = p_daily_workout_id AND athlete_id = v_athlete_id
  FOR UPDATE;
  IF v_day.id IS NULL OR v_day.workout_type = 'quick' THEN
    RAISE EXCEPTION 'daily_workout_access_denied' USING ERRCODE = '42501';
  END IF;
  v_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  IF v_day.workout_date IS DISTINCT FROM v_date THEN
    RAISE EXCEPTION 'only_today_can_be_skipped' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workout_exercises WHERE daily_workout_id = v_day.id) THEN
    RAISE EXCEPTION 'workout_has_no_exercises' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_athlete_id::text || v_date::text || 'daily', 0));

  IF EXISTS (
    SELECT 1 FROM public.workout_executions
    WHERE athlete_id = v_athlete_id AND daily_workout_id = v_day.id AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'completed_workout_cannot_be_skipped' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workout_executions
    WHERE athlete_id = v_athlete_id AND daily_workout_id = v_day.id
      AND status IN ('started', 'in_progress', 'paused')
  ) THEN
    RAISE EXCEPTION 'workout_execution_in_progress' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workout_executions
    WHERE athlete_id = v_athlete_id AND workout_date = v_date
      AND daily_workout_id IS DISTINCT FROM v_day.id
      AND status IN ('in_progress', 'started', 'paused')
  ) THEN
    RAISE EXCEPTION 'another_workout_is_in_progress' USING ERRCODE = '55000';
  END IF;

  SELECT id INTO v_execution_id
  FROM public.workout_executions
  WHERE athlete_id = v_athlete_id AND daily_workout_id = v_day.id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_execution_id IS NULL THEN
    INSERT INTO public.workout_executions(athlete_id, daily_workout_id, workout_date, status, phase_name)
    VALUES (v_athlete_id, v_day.id, v_date, 'skipped', v_day.day_name)
    RETURNING id INTO v_execution_id;
  ELSE
    UPDATE public.workout_executions
    SET status = 'skipped', completed_at = NULL, started_at = NULL
    WHERE id = v_execution_id AND athlete_id = v_athlete_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'execution_id', v_execution_id, 'daily_workout_id', v_day.id, 'date', v_date, 'status', 'skipped');
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_skip_daily_workout_execution(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_skip_daily_workout_execution(uuid) TO authenticated;
