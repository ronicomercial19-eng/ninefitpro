-- Correct periodized generation to preserve Quick Training sessions as well.

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
        AND we.status IN ('in_progress', 'completed', 'skipped')
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
