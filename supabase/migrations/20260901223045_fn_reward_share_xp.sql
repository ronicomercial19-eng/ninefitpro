-- Recompensa por compartilhar (Viral Share). Idempotente por (athlete_id, content_type, content_id):
-- nunca credita duas vezes pro mesmo compartilhamento, mesmo se o insert em share_events for retentado.
CREATE OR REPLACE FUNCTION public.fn_reward_share(
  p_athlete_id uuid,
  p_content_type text,
  p_content_id text DEFAULT NULL,
  p_amount integer DEFAULT 15
)
RETURNS TABLE(awarded boolean, reason text, new_total_xp integer, new_level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_already boolean;
  v_xp record;
BEGIN
  IF p_athlete_id IS NULL THEN
    RETURN QUERY SELECT false, 'no_athlete', NULL::int, NULL::int;
    RETURN;
  END IF;

  -- Já recompensado esse compartilhamento específico?
  SELECT EXISTS (
    SELECT 1 FROM public.share_events
    WHERE athlete_id = p_athlete_id
      AND content_type = p_content_type
      AND content_id IS NOT DISTINCT FROM p_content_id
      AND rewarded = true
  ) INTO v_already;

  IF v_already THEN
    RETURN QUERY SELECT false, 'already_rewarded', NULL::int, NULL::int;
    RETURN;
  END IF;

  SELECT new_total_xp, new_level INTO v_xp
  FROM public.fn_award_xp(p_athlete_id, p_amount, 'share_bonus', jsonb_build_object('content_type', p_content_type, 'content_id', p_content_id));

  -- Marca como recompensado o evento de share mais recente que bate esses critérios
  UPDATE public.share_events
  SET rewarded = true
  WHERE id = (
    SELECT id FROM public.share_events
    WHERE athlete_id = p_athlete_id
      AND content_type = p_content_type
      AND content_id IS NOT DISTINCT FROM p_content_id
      AND rewarded IS NOT TRUE
    ORDER BY shared_at DESC LIMIT 1
  );

  RETURN QUERY SELECT true, 'ok', v_xp.new_total_xp, v_xp.new_level;
END;
$function$;

ALTER TABLE public.share_events ADD COLUMN IF NOT EXISTS rewarded boolean DEFAULT false;;
