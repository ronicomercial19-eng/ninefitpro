-- Additional checks found while expanding the live RPC inventory. No signatures removed.
CREATE OR REPLACE FUNCTION public.fn_check_onboarding_progress(p_athlete_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_athlete RECORD; v_activation RECORD; v_treinos INT4; v_tem_plano BOOLEAN; v_prime BOOLEAN;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  SELECT name, age, peso_kg, altura_cm, avatar_url INTO v_athlete
  FROM public.athletes WHERE id = p_athlete_id;

  SELECT consistency_days, first_workout_at, profile_reminder_dismissed INTO v_activation
  FROM public.athlete_activation WHERE athlete_id = p_athlete_id;

  SELECT COUNT(*) INTO v_treinos FROM public.workout_executions
  WHERE athlete_id = p_athlete_id AND status = 'completed';

  SELECT EXISTS(SELECT 1 FROM public.daily_workouts WHERE athlete_id = p_athlete_id) INTO v_tem_plano;
  SELECT EXISTS(
    SELECT 1 FROM public.user_plans WHERE athlete_id = p_athlete_id AND is_active = true AND plan_type = 'prime'
  ) INTO v_prime;

  RETURN json_build_object(
    'perfil_completo', (v_athlete.name IS NOT NULL AND v_athlete.age IS NOT NULL
                         AND v_athlete.peso_kg IS NOT NULL AND v_athlete.altura_cm IS NOT NULL),
    'tem_foto', (v_athlete.avatar_url IS NOT NULL),
    'primeiro_treino', (v_treinos > 0),
    'tres_dias', (COALESCE(v_activation.consistency_days, 0) >= 3),
    'sete_dias', (COALESCE(v_activation.consistency_days, 0) >= 7),
    'tem_plano', v_tem_plano,
    'prime_ativo', COALESCE(v_prime, false),
    'mostrar_lembrete_perfil', (
      NOT (v_athlete.name IS NOT NULL AND v_athlete.age IS NOT NULL
           AND v_athlete.peso_kg IS NOT NULL AND v_athlete.altura_cm IS NOT NULL)
      AND NOT COALESCE(v_activation.profile_reminder_dismissed, false)
    )
  );
END; $function$;
CREATE OR REPLACE FUNCTION public.fn_complete_mission(p_athlete_id uuid, p_mission_type text DEFAULT 'default'::text)
 RETURNS TABLE(missions_completed integer, weekly_count integer, consistency_score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_days INT;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  INSERT INTO public.athlete_activation (athlete_id, activation_started_at)
  VALUES (p_athlete_id, now())
  ON CONFLICT (athlete_id) DO NOTHING;

  SELECT COALESCE(consistency_days, 0) INTO v_days
  FROM public.athlete_activation WHERE athlete_id = p_athlete_id;

  RETURN QUERY SELECT 1, v_days, LEAST(100, v_days * 10);
END; $function$;
CREATE OR REPLACE FUNCTION public.fn_compute_user_thresholds(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p33 numeric; p66 numeric; n int;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'user_access_denied' USING ERRCODE='42501'; END IF;
  SELECT count(*) INTO n FROM public.sync_score_logs
    WHERE user_id = p_user_id AND created_at >= now() - interval '30 days';
  IF n < 5 THEN
    RETURN jsonb_build_object('low', 40, 'mid', 60, 'high', 80, 'n', n, 'mode', 'cold_start');
  END IF;
  SELECT
    percentile_disc(0.33) WITHIN GROUP (ORDER BY score),
    percentile_disc(0.66) WITHIN GROUP (ORDER BY score)
  INTO p33, p66
  FROM public.sync_score_logs
  WHERE user_id = p_user_id AND created_at >= now() - interval '30 days';
  RETURN jsonb_build_object('low', p33, 'mid', (p33+p66)/2.0, 'high', p66, 'n', n, 'mode', 'personal');
END $function$;
CREATE OR REPLACE FUNCTION public.fn_consume_credit(p_athlete_id uuid, p_amount integer DEFAULT 1, p_reason text DEFAULT 'ai_action'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.athlete_credits%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount<=0 OR p_amount>1000 THEN RAISE EXCEPTION 'invalid_credit_amount' USING ERRCODE='22023'; END IF;
  PERFORM public.fn_assert_athlete_owner(p_athlete_id);

  INSERT INTO public.athlete_credits (athlete_id, credits_total, credits_used, plan_type, reset_at)
  VALUES (p_athlete_id, 12, 0, 'padrao', (CURRENT_DATE + interval '1 day'))
  ON CONFLICT (athlete_id) DO NOTHING;

  SELECT * INTO v_row FROM public.athlete_credits WHERE athlete_id = p_athlete_id FOR UPDATE;

  IF v_row.reset_at IS NULL OR v_row.reset_at <= now() THEN
    UPDATE public.athlete_credits
    SET credits_used = 0, reset_at = (CURRENT_DATE + interval '1 day')
    WHERE athlete_id = p_athlete_id
    RETURNING * INTO v_row;
  END IF;

  IF v_row.credits_remaining < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'remaining', v_row.credits_remaining, 'total', v_row.credits_total,
      'reset_at', v_row.reset_at, 'error', 'insufficient_credits');
  END IF;

  UPDATE public.athlete_credits
  SET credits_used = credits_used + p_amount, updated_at = now()
  WHERE athlete_id = p_athlete_id;

  INSERT INTO public.credit_transactions (athlete_id, amount, reason, metadata)
  VALUES (p_athlete_id, -p_amount, p_reason, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'remaining', v_row.credits_remaining - p_amount, 'total', v_row.credits_total, 'reset_at', v_row.reset_at);
END;
$function$;
CREATE OR REPLACE FUNCTION public.regenerar_dia_evitando_regiao(p_athlete_id uuid, p_body_region text, p_workout_date date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_id uuid;
  v_new_plan jsonb;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || p_workout_date::text,0));
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date=p_workout_date AND status IN ('in_progress','completed')) THEN RAISE EXCEPTION 'workout_prescription_locked' USING ERRCODE='55000'; END IF;
  SELECT id INTO v_old_id FROM daily_workouts
  WHERE athlete_id = p_athlete_id AND workout_date = p_workout_date
  ORDER BY created_at DESC LIMIT 1;

  IF v_old_id IS NOT NULL THEN
    DELETE FROM workout_exercises WHERE daily_workout_id = v_old_id;
    DELETE FROM daily_workouts WHERE id = v_old_id;
  END IF;

  SELECT prescrever_treino(p_athlete_id, p_workout_date) INTO v_new_plan;

  INSERT INTO pain_reports (athlete_id, body_region, intensity, action_taken, resolved_detail)
  VALUES (p_athlete_id, p_body_region, 7, 'day_regenerated', v_new_plan);

  RETURN jsonb_build_object(
    'success', true, 'action', 'day_regenerated',
    'avoided_region', p_body_region, 'new_plan', v_new_plan
  );
END;
$function$;
-- No repo or SQL caller depends on this legacy amount-taking completion shortcut.
-- Keep the function for trusted integrations; browser execution uses fn_complete_workout_execution.
REVOKE EXECUTE ON FUNCTION public.fn_award_workout_xp(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_award_workout_xp(uuid,integer) TO service_role;
