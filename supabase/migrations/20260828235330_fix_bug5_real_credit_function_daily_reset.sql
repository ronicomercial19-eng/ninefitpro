-- FIX #5 real (QA Master): a função DE VERDADE chamada pelo app é
-- fn_consume_credit (não fn_consume_ron_credit, que eu tinha corrigido
-- antes sem perceber que nada chamava ela). fn_consume_credit tinha um
-- pool fixo de 150 fichas PRA SEMPRE (credits_used só cresce, nunca
-- reseta) — uma vez esgotado, ficava travado permanentemente em
-- "Fichas insuficientes". Reescrita para respeitar a decisão do Rony:
-- fichas diárias NÃO cumulativas.
CREATE OR REPLACE FUNCTION public.fn_consume_credit(p_athlete_id uuid, p_amount integer DEFAULT 1, p_reason text DEFAULT 'ai_action'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.athlete_credits%ROWTYPE;
BEGIN
  INSERT INTO public.athlete_credits (athlete_id, credits_total, credits_used, plan_type, reset_at)
  VALUES (p_athlete_id, 12, 0, 'padrao', (CURRENT_DATE + interval '1 day'))
  ON CONFLICT (athlete_id) DO NOTHING;

  SELECT * INTO v_row FROM public.athlete_credits WHERE athlete_id = p_athlete_id FOR UPDATE;

  -- Reset diário: ficha não usada não acumula pro dia seguinte
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

-- Reseta o saldo de todo mundo pra fichas de hoje, já que o pool antigo
-- (150 fixo) não tinha relação com a regra nova (12/dia)
UPDATE public.athlete_credits SET credits_total = 12, credits_used = 0, plan_type = 'padrao', reset_at = (CURRENT_DATE + interval '1 day');;
