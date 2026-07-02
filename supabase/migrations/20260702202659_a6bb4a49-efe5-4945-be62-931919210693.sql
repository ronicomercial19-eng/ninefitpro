
-- ============================================================
-- FitPro P0: RPCs de leitura de score, healthflix e consumo de fichas
-- ============================================================

-- 1) get_athlete_scores: retorna sync score + breakdown 5D
CREATE OR REPLACE FUNCTION public.get_athlete_scores(p_athlete_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sync numeric := 0;
  v_treino numeric := 0;
  v_nutri numeric := 0;
  v_sono numeric := 0;
  v_mob numeric := 0;
  v_hidr numeric := 0;
  v_last timestamptz;
BEGIN
  -- Score global do athlete
  SELECT COALESCE(sync_score, 0)
  INTO v_sync
  FROM public.athletes
  WHERE id = p_athlete_id;

  -- Breakdown a partir de aluno_score_composite (se existir registro)
  SELECT
    COALESCE(consistency_score, 0),
    COALESCE(nutrition_score, 0),
    COALESCE(sleep_score, 0),
    COALESCE(mobility_score, 0),
    COALESCE(hydration_score, 0),
    updated_at
  INTO v_treino, v_nutri, v_sono, v_mob, v_hidr, v_last
  FROM public.aluno_score_composite
  WHERE athlete_id = p_athlete_id
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Fallback: derivar de check-ins últimos 7d
  IF v_treino = 0 AND v_nutri = 0 THEN
    SELECT
      COALESCE(AVG(CASE WHEN treinos_semana IS NOT NULL THEN LEAST(100, treinos_semana * 20) END), 0),
      COALESCE(AVG(alimentacao)*10, 0),
      COALESCE(AVG(sono)*10, 0),
      COALESCE(AVG(energia)*10, 0),
      COALESCE(100 - AVG(dor)*10, 0)
    INTO v_treino, v_nutri, v_sono, v_mob, v_hidr
    FROM public.ninefit_checkins
    WHERE athlete_id = p_athlete_id
      AND data_checkin >= (CURRENT_DATE - INTERVAL '7 days');
  END IF;

  -- Se sync_score do athlete é 0, computar como média dos 5
  IF v_sync = 0 THEN
    v_sync := ROUND((v_treino + v_nutri + v_sono + v_mob + v_hidr) / 5.0);
  END IF;

  RETURN jsonb_build_object(
    'sync_score', ROUND(v_sync),
    'treino', ROUND(v_treino),
    'nutri', ROUND(v_nutri),
    'sono', ROUND(v_sono),
    'mob', ROUND(v_mob),
    'hidr', ROUND(v_hidr),
    'updated_at', COALESCE(v_last, now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_athlete_scores(uuid) TO authenticated, service_role;

-- 2) get_healthflix_feed: catálogo priorizado por fase + histórico
CREATE OR REPLACE FUNCTION public.get_healthflix_feed(p_athlete_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(row_to_json(li))
  INTO v_result
  FROM (
    SELECT id, name, category, subcategory, thumbnail_url, player_url, type, payload
    FROM public.library_items
    WHERE type IN ('video','videos','healthflix')
    ORDER BY
      CASE WHEN id IN (
        SELECT library_item_id FROM public.healthflix_progress WHERE athlete_id = p_athlete_id
      ) THEN 1 ELSE 0 END,
      updated_at DESC NULLS LAST
    LIMIT 100
  ) li;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_healthflix_feed(uuid) TO authenticated, service_role;

-- 3) fn_consume_credit: debita fichas atomicamente
CREATE OR REPLACE FUNCTION public.fn_consume_credit(
  p_athlete_id uuid,
  p_amount integer DEFAULT 1,
  p_reason text DEFAULT 'ai_action'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer;
BEGIN
  -- Garante linha
  INSERT INTO public.athlete_credits (athlete_id, credits_total, credits_used, credits_remaining, plan_type)
  VALUES (p_athlete_id, 150, 0, 150, 'base_2990')
  ON CONFLICT (athlete_id) DO NOTHING;

  -- Lock e valida saldo
  SELECT credits_remaining INTO v_remaining
  FROM public.athlete_credits
  WHERE athlete_id = p_athlete_id
  FOR UPDATE;

  IF v_remaining IS NULL OR v_remaining < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'remaining', COALESCE(v_remaining,0), 'error', 'insufficient_credits');
  END IF;

  UPDATE public.athlete_credits
  SET credits_used = credits_used + p_amount,
      credits_remaining = credits_remaining - p_amount,
      updated_at = now()
  WHERE athlete_id = p_athlete_id;

  INSERT INTO public.credit_transactions (athlete_id, amount, reason, metadata)
  VALUES (p_athlete_id, -p_amount, p_reason, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'remaining', v_remaining - p_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_consume_credit(uuid, integer, text) TO authenticated, service_role;

-- 4) fn_add_credits: recarga (chamada pelo checkout success)
CREATE OR REPLACE FUNCTION public.fn_add_credits(
  p_athlete_id uuid,
  p_amount integer,
  p_reason text DEFAULT 'recharge'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.athlete_credits (athlete_id, credits_total, credits_used, credits_remaining, plan_type)
  VALUES (p_athlete_id, p_amount, 0, p_amount, 'base_2990')
  ON CONFLICT (athlete_id) DO UPDATE
    SET credits_total = public.athlete_credits.credits_total + EXCLUDED.credits_total,
        credits_remaining = public.athlete_credits.credits_remaining + EXCLUDED.credits_total,
        updated_at = now();

  INSERT INTO public.credit_transactions (athlete_id, amount, reason, metadata)
  VALUES (p_athlete_id, p_amount, p_reason, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_add_credits(uuid, integer, text) TO authenticated, service_role;

-- 5) Realtime nas tabelas usadas por hooks
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_score_logs;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_credits;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_activation;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activation_events;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
