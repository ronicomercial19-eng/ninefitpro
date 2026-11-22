CREATE OR REPLACE FUNCTION public.consumir_ficha(p_athlete_id uuid, p_reason text DEFAULT 'ai_chat'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_remaining int;
BEGIN
  PERFORM public.fn_assert_athlete_owner(p_athlete_id);

  SELECT credits_remaining INTO v_remaining
  FROM athlete_credits WHERE athlete_id = p_athlete_id;

  IF v_remaining IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_credits_record');
  END IF;

  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'sem_fichas', 'remaining', 0);
  END IF;

  UPDATE athlete_credits
  SET credits_used = credits_used + 1, updated_at = now()
  WHERE athlete_id = p_athlete_id;

  INSERT INTO credit_transactions (athlete_id, amount, reason)
  VALUES (p_athlete_id, -1, p_reason);

  RETURN jsonb_build_object('success', true, 'remaining', v_remaining - 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_consume_credit(p_athlete_id uuid, p_amount integer DEFAULT 1, p_reason text DEFAULT 'ai_action'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.athlete_credits%ROWTYPE;
BEGIN
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

CREATE OR REPLACE FUNCTION public.fn_consume_ron_credit(p_athlete_id uuid)
 RETURNS TABLE(allowed boolean, credits_remaining integer, credits_total integer, reset_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.athlete_credits%ROWTYPE;
BEGIN
  PERFORM public.fn_assert_athlete_owner(p_athlete_id);

  SELECT * INTO v_row FROM public.athlete_credits WHERE athlete_id = p_athlete_id FOR UPDATE;

  IF v_row.id IS NULL THEN
    INSERT INTO public.athlete_credits (athlete_id, credits_total, credits_used, plan_type, reset_at)
    VALUES (p_athlete_id, 12, 0, 'padrao', (CURRENT_DATE + interval '1 day'))
    RETURNING * INTO v_row;
  END IF;

  IF v_row.reset_at <= now() THEN
    UPDATE public.athlete_credits
    SET credits_used = 0, reset_at = (CURRENT_DATE + interval '1 day')
    WHERE athlete_id = p_athlete_id
    RETURNING * INTO v_row;
  END IF;

  IF v_row.credits_remaining <= 0 THEN
    RETURN QUERY SELECT false, v_row.credits_remaining, v_row.credits_total, v_row.reset_at;
    RETURN;
  END IF;

  UPDATE public.athlete_credits
  SET credits_used = credits_used + 1, updated_at = now()
  WHERE athlete_id = p_athlete_id
  RETURNING * INTO v_row;

  RETURN QUERY SELECT true, v_row.credits_remaining, v_row.credits_total, v_row.reset_at;
END;
$function$;;
