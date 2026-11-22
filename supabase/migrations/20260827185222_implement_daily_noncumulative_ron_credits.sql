INSERT INTO public.athlete_credits (athlete_id, credits_total, credits_used, plan_type, reset_at)
SELECT a.id, 12, 0, 'padrao', (CURRENT_DATE + interval '1 day')
FROM public.athletes a
LEFT JOIN public.athlete_credits ac ON ac.athlete_id = a.id
WHERE ac.id IS NULL;

CREATE OR REPLACE FUNCTION public.fn_consume_ron_credit(p_athlete_id uuid)
RETURNS TABLE(allowed boolean, credits_remaining int, credits_total int, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.athlete_credits%ROWTYPE;
BEGIN
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
