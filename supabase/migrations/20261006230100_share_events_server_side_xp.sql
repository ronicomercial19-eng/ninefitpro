-- Compartilhamento: o servidor decide o XP (ignora o que o cliente manda), dedupe por conteúdo e teto de 3/dia.
CREATE OR REPLACE FUNCTION public.trg_share_events_reward()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ath uuid;
  v_xp int;
  v_dup boolean;
  v_today int;
BEGIN
  -- resolve o atleta (cliente pode mandar só user_id)
  v_ath := NEW.athlete_id;
  IF v_ath IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT a.id INTO v_ath FROM athletes a WHERE a.user_id = NEW.user_id LIMIT 1;
    NEW.athlete_id := v_ath;
  END IF;

  -- o servidor decide recompensa; ignora o que o cliente mandou
  NEW.rewarded := false;
  v_xp := CASE NEW.content_type
    WHEN 'treino_concluido' THEN 20
    WHEN 'weekly_recap' THEN 25
    WHEN 'id_card_upgrade' THEN 25
    ELSE 10 END;
  NEW.reward_xp := v_xp;
  IF NEW.shared_at IS NULL THEN NEW.shared_at := now(); END IF;

  IF v_ath IS NULL THEN
    RETURN NEW;
  END IF;

  -- dedupe por conteúdo + teto diário
  SELECT EXISTS (SELECT 1 FROM share_events s WHERE s.athlete_id = v_ath AND s.content_type = NEW.content_type AND s.content_id IS NOT DISTINCT FROM NEW.content_id AND s.rewarded = true) INTO v_dup;
  SELECT count(*) INTO v_today FROM share_events s WHERE s.athlete_id = v_ath AND s.rewarded = true AND s.shared_at >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';

  IF NOT v_dup AND v_today < 3 THEN
    BEGIN
      PERFORM public.fn_award_xp(v_ath, v_xp, 'share_bonus', jsonb_build_object('content_type', NEW.content_type, 'content_id', NEW.content_id));
      NEW.rewarded := true;
    EXCEPTION WHEN OTHERS THEN
      NEW.rewarded := false; -- nunca quebra o compartilhamento por causa do XP
    END;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_share_events_reward() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_share_events_reward ON public.share_events;
CREATE TRIGGER trg_share_events_reward
  BEFORE INSERT ON public.share_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_share_events_reward();
