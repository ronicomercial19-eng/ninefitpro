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
  PERFORM private.fitpro_require_current_access();
  IF p_workout_type='quick' THEN RAISE EXCEPTION 'Use o motor de treino rápido para preparar esta sessão.';END IF;
  IF p_workout_date IS NULL OR p_workout_date<(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Escolha hoje ou uma data futura.';END IF;
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date=p_workout_date AND (daily_workout_id IN(SELECT id FROM public.daily_workouts WHERE athlete_id=p_athlete_id AND workout_date=p_workout_date AND workout_type IS DISTINCT FROM 'quick') OR (daily_workout_id IS NULL AND phase_name IS DISTINCT FROM 'quick')) AND status IN ('started','in_progress','paused','completed','skipped')) THEN
    RAISE EXCEPTION 'workout_prescription_locked' USING ERRCODE='55000';
  END IF;
  IF p_athlete_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'athlete_id_required');
  END IF;

  IF p_exercises IS NULL OR jsonb_array_length(p_exercises) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'no_exercises_provided');
  END IF;

  IF jsonb_typeof(p_exercises) IS DISTINCT FROM 'array' OR jsonb_array_length(p_exercises)>100 THEN RAISE EXCEPTION 'invalid_exercises';END IF;
  FOR v_ex IN SELECT * FROM jsonb_array_elements(p_exercises) LOOP
   IF jsonb_typeof(v_ex) IS DISTINCT FROM 'object' OR nullif(v_ex->>'exercise_id','') IS NULL
    OR nullif(v_ex->>'sets','') IS NULL OR (v_ex->>'sets')::int NOT BETWEEN 1 AND 10
    OR length(btrim(coalesce(v_ex->>'reps_range',''))) NOT BETWEEN 1 AND 40
    OR ((v_ex->>'reps_range') ~ '^[0-9]+$' AND (v_ex->>'reps_range')::numeric>=100)
    OR nullif(v_ex->>'rest_seconds','') IS NULL OR (v_ex->>'rest_seconds')::int NOT BETWEEN 0 AND 600
    OR NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=(v_ex->>'exercise_id')::uuid)
   THEN RAISE EXCEPTION 'Revise exercícios, séries, doses com unidade e descansos antes de publicar.';END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.daily_workouts WHERE athlete_id=p_athlete_id AND workout_date=p_workout_date AND workout_type IS DISTINCT FROM 'quick') THEN
   RAISE EXCEPTION 'Já existe uma sessão planejada nesta data. Use o ajuste explícito para revisar a prescrição salva.';
  END IF;

  -- Upsert em daily_workouts (idempotente por athlete_id + workout_date)
  SELECT id INTO v_daily_workout_id
  FROM public.daily_workouts
  WHERE athlete_id = p_athlete_id AND workout_date = p_workout_date AND workout_type IS DISTINCT FROM 'quick'
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
      COALESCE((v_ex->>'exercise_order')::int, v_count+1),
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
