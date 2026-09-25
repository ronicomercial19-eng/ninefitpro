-- P0: make activation functions match the live athlete_activation contract
-- and prevent cross-athlete SECURITY DEFINER access.

CREATE OR REPLACE FUNCTION public.activation_advance(
  p_athlete_id uuid,
  p_step text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(step text, ok boolean, activation_row jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = p_athlete_id
      AND (a.user_id = auth.uid() OR a.coach_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.athlete_auth_link l
    WHERE l.athlete_id = p_athlete_id AND l.user_id = auth.uid()
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'athlete_access_denied';
  END IF;

  INSERT INTO public.athlete_activation (athlete_id, activation_started_at)
  VALUES (p_athlete_id, now())
  ON CONFLICT (athlete_id) DO NOTHING;

  IF p_step = 'assessment' THEN
    UPDATE public.athletes SET
      primary_goal = COALESCE(p_payload->>'goal', primary_goal),
      objetivo = COALESCE(p_payload->>'goal', objetivo),
      experience_level = COALESCE(p_payload->>'experience_level', experience_level),
      nivel = COALESCE(p_payload->>'experience_level', nivel),
      weekly_frequency = COALESCE((p_payload->>'weekly_frequency')::int4, weekly_frequency),
      sessions_per_week = COALESCE((p_payload->>'weekly_frequency')::int4, sessions_per_week),
      injuries_limitations = COALESCE(p_payload->>'restrictions', injuries_limitations)
    WHERE id = p_athlete_id;
    UPDATE public.athlete_activation SET assessment_done_at = now()
    WHERE athlete_id = p_athlete_id;
  ELSIF p_step = 'generation' THEN
    INSERT INTO public.daily_workouts (athlete_id, day_number, day_name, focus_muscles, workout_type, workout_date)
    VALUES (
      p_athlete_id,
      COALESCE((p_payload->>'day_number')::int4, 1),
      COALESCE(p_payload->>'day_name', 'Treino Inicial'),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_payload->'focus_muscles')), ARRAY['full_body']),
      COALESCE(p_payload->>'workout_type', 'quick'), CURRENT_DATE
    );
    UPDATE public.athlete_activation SET plan_generated_at = now()
    WHERE athlete_id = p_athlete_id;
  ELSIF p_step = 'execute' THEN
    UPDATE public.athlete_activation SET first_workout_at = COALESCE(first_workout_at, now())
    WHERE athlete_id = p_athlete_id;
  ELSIF p_step = 'consistency' THEN
    UPDATE public.athlete_activation SET
      consistency_days = consistency_days + 1
    WHERE athlete_id = p_athlete_id;
  ELSE
    RETURN QUERY SELECT p_step, false, '{}'::jsonb;
    RETURN;
  END IF;

  RETURN QUERY SELECT p_step, true, to_jsonb(a.*)
  FROM public.athlete_activation a WHERE a.athlete_id = p_athlete_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.activation_finish(p_athlete_id uuid)
RETURNS TABLE(fully_activated boolean, finished_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_allowed boolean;
  v_activation public.athlete_activation%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = p_athlete_id
      AND (a.user_id = auth.uid() OR a.coach_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.athlete_auth_link l
    WHERE l.athlete_id = p_athlete_id AND l.user_id = auth.uid()
  ) INTO v_allowed;
  IF NOT v_allowed THEN RAISE EXCEPTION 'athlete_access_denied'; END IF;

  SELECT * INTO v_activation FROM public.athlete_activation WHERE athlete_id = p_athlete_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'activation_not_started'; END IF;
  IF v_activation.assessment_done_at IS NULL
     OR v_activation.plan_generated_at IS NULL
     OR v_activation.first_workout_at IS NULL THEN
    RAISE EXCEPTION 'activation_prerequisites_incomplete';
  END IF;

  UPDATE public.athlete_activation
  SET finished_at = COALESCE(finished_at, now()), fully_activated = true
  WHERE athlete_id = p_athlete_id
  RETURNING * INTO v_activation;

  UPDATE public.athletes
  SET onboarding_completed_at = COALESCE(onboarding_completed_at, now())
  WHERE id = p_athlete_id
  RETURNING user_id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET first_access_completed = true WHERE user_id = v_user_id;
  END IF;

  RETURN QUERY SELECT v_activation.fully_activated, v_activation.finished_at;
END;
$$;

REVOKE ALL ON FUNCTION public.activation_advance(uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.activation_finish(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activation_advance(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activation_finish(uuid) TO authenticated;
