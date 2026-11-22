CREATE OR REPLACE FUNCTION public.fn_get_daily_context()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_uid uuid := auth.uid(); v_id uuid := public.fn_current_athlete_id();
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; v_c public.daily_checkins;
  v_meals integer := 0; v_water integer := 0; v_done boolean := false; v_started boolean := false; v_scheduled boolean := false; v_rest boolean := false; v_review integer;
  v_readiness numeric := null; v_coverage numeric := 0; v_dimensions jsonb := '{}'::jsonb; v_complete boolean := false; v_safe boolean := false; v_streak integer := 0;
BEGIN
  IF v_uid IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean, false) THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF v_id IS NULL THEN RETURN jsonb_build_object('version', 3, 'status', 'no_athlete_profile', 'date', v_today); END IF;
  SELECT * INTO v_c FROM public.daily_checkins WHERE athlete_id = v_id AND checkin_date = v_today;
  v_complete := v_c.sono BETWEEN 1 AND 5 AND v_c.energia BETWEEN 1 AND 5 AND v_c.humor BETWEEN 1 AND 5 AND v_c.motivacao BETWEEN 1 AND 5 AND v_c.dor BETWEEN 1 AND 5;
  IF v_complete THEN v_readiness := round(((v_c.sono - 1) * 30 + (v_c.energia - 1) * 30 + ((6 - v_c.dor) - 1) * 20 + (v_c.humor - 1) * 10 + (v_c.motivacao - 1) * 10) / 4.0); END IF;
  SELECT count(*) INTO v_meals FROM public.nutrition_logs WHERE athlete_id = v_id AND date = v_today;
  SELECT coalesce(sum(amount_ml), 0) INTO v_water FROM public.hydration_logs WHERE athlete_id = v_id AND log_date = v_today;
  SELECT exists(SELECT 1 FROM public.workout_executions WHERE athlete_id=v_id AND workout_date=v_today AND status='completed'), exists(SELECT 1 FROM public.workout_executions WHERE athlete_id=v_id AND workout_date=v_today AND status IN ('in_progress','paused','started')) INTO v_done, v_started;
  SELECT exists(SELECT 1 FROM public.daily_workouts WHERE athlete_id=v_id AND workout_date=v_today AND coalesce(workout_type,'') NOT IN ('rest','recovery','descanso')), exists(SELECT 1 FROM public.daily_workouts WHERE athlete_id=v_id AND workout_date=v_today AND workout_type IN ('rest','recovery','descanso')) INTO v_scheduled, v_rest;
  SELECT rating INTO v_review FROM public.athlete_day_reviews WHERE athlete_id=v_id AND review_date=v_today;
  v_rest := v_rest OR exists(SELECT 1 FROM public.athlete_day_reviews WHERE athlete_id=v_id AND review_date=v_today AND training_choice='rest');
  v_safe := coalesce(v_c.dor >= 3, false) OR nullif(btrim(v_c.dor_local), '') IS NOT NULL;
  WITH days AS (SELECT generate_series(v_today - 6, v_today, interval '1 day')::date AS d)
  SELECT jsonb_build_object(
    'treino', round(count(*) FILTER (WHERE exists(SELECT 1 FROM public.workout_executions w WHERE w.athlete_id=v_id AND w.workout_date=d AND w.status='completed')) * 100.0 / 7),
    'nutri', round(count(*) FILTER (WHERE exists(SELECT 1 FROM public.nutrition_logs n WHERE n.athlete_id=v_id AND n.date=d)) * 100.0 / 7),
    'sono', round(count(*) FILTER (WHERE exists(SELECT 1 FROM public.daily_checkins c WHERE c.athlete_id=v_id AND c.checkin_date=d AND c.sono BETWEEN 1 AND 5)) * 100.0 / 7),
    'hidr', round(count(*) FILTER (WHERE exists(SELECT 1 FROM public.hydration_logs h WHERE h.athlete_id=v_id AND h.log_date=d)) * 100.0 / 7),
    'calibracao', round(count(*) FILTER (WHERE exists(SELECT 1 FROM public.daily_checkins c WHERE c.athlete_id=v_id AND c.checkin_date=d AND c.sono BETWEEN 1 AND 5 AND c.energia BETWEEN 1 AND 5 AND c.humor BETWEEN 1 AND 5 AND c.motivacao BETWEEN 1 AND 5 AND c.dor BETWEEN 1 AND 5)) * 100.0 / 7)
  ) INTO v_dimensions FROM days;
  SELECT round(avg(value::numeric)) INTO v_coverage FROM jsonb_each_text(v_dimensions);
  SELECT count(*) INTO v_streak FROM public.daily_checkins c WHERE c.athlete_id=v_id AND c.checkin_date BETWEEN v_today - 29 AND v_today AND c.sono BETWEEN 1 AND 5 AND c.energia BETWEEN 1 AND 5 AND c.humor BETWEEN 1 AND 5 AND c.motivacao BETWEEN 1 AND 5 AND c.dor BETWEEN 1 AND 5;
  RETURN jsonb_build_object(
    'version',3,'status','available','date',v_today,'generated_at',now(),
    'calibration',jsonb_build_object('complete',v_complete,'sleep',v_c.sono,'energy',v_c.energia,'mood',v_c.humor,'motivation',v_c.motivacao,'pain',v_c.dor,'pain_location',v_c.dor_local,'observed_at',v_c.created_at),
    'safety',jsonb_build_object('review_required',v_safe,'reason',CASE WHEN v_safe THEN 'pain_reported' END,'is_medical_clearance',false),
    'today',jsonb_build_object('workout_completed',v_done,'workout_in_progress',v_started,'workout_scheduled',v_scheduled,'rest_day',v_rest,'meals',v_meals,'water_ml',v_water,'review',v_review),
    'sync',jsonb_build_object('value',v_readiness,'readiness',v_readiness,'status',CASE WHEN v_complete THEN 'available' ELSE 'not_collected' END,'confidence',CASE WHEN v_complete THEN 'self_report_complete' ELSE 'insufficient_daily_signals' END,'record_coverage',v_coverage,'coverage_dimensions',v_dimensions,'formula','SYNC diário: sono 30% + energia 30% + dor invertida 20% + humor 10% + motivação 10%. Cobertura de 7 dias é exibida separadamente e não altera o SYNC.','parameters',jsonb_build_object('scale','1-5','required_signals',5,'business_timezone','America/Sao_Paulo','window','dia local atual'),'source','daily_checkins/durable_records','is_medical_clearance',false),
    'streak',v_streak);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_get_daily_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_daily_context() TO authenticated;
COMMENT ON FUNCTION public.fn_get_daily_context() IS 'SYNC v3: complete same-day self-report only. Seven-day record coverage is an independent consistency metric.';;
