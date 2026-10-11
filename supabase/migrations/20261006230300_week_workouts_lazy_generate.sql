-- Treino da semana: fn_get_week_workouts gera a semana de forma preguiçosa quando há periodização ativa
-- e nenhum treino (não-rápido) de hoje até o fim da semana. Gerador idempotente; falha nunca quebra a leitura.
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
