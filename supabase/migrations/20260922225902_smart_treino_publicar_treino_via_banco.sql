
-- Fase 1 (correção de entrega) — RPC única de escrita para o Smart Treino publicar
-- treinos diretamente nas tabelas que o FitPro já lê (daily_workouts + workout_exercises),
-- em vez de depender de chamada HTTP inexistente (/v1/fitpro/events).
-- Realtime nas duas tabelas já propaga a mudança para o app do atleta automaticamente.

CREATE OR REPLACE FUNCTION public.fn_publicar_treino_smartreino(
  p_athlete_id uuid,
  p_workout_date date,
  p_day_number int,
  p_day_name text,
  p_focus_muscles text[],
  p_workout_type text,
  p_estimated_duration_minutes int,
  p_exercises jsonb, -- array de {exercise_id, sets, reps_range, rest_seconds, load_percentage, tempo, rpe_target, notes, exercise_order}
  p_source text DEFAULT 'smartreino'
)
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
      rest_seconds, load_percentage, tempo, rpe_target, notes
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
      v_ex->>'notes'
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
;
