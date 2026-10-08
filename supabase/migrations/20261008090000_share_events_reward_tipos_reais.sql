-- O trigger de XP de compartilhamento usava tipos que o app não envia ('treino_concluido') e deduplicava por content_type
-- mesmo com content_id nulo (o app não manda content_id), o que pagaria só o primeiro compartilhamento de cada tipo para sempre.
-- Agora: valores por ShareContentType real e dedupe = mesmo content_id (se houver) ou mesmo tipo no mesmo dia (horário de São Paulo).
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
  v_day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  v_ath := NEW.athlete_id;
  IF v_ath IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT a.id INTO v_ath FROM athletes a WHERE a.user_id = NEW.user_id LIMIT 1;
    NEW.athlete_id := v_ath;
  END IF;

  NEW.rewarded := false;
  v_xp := CASE NEW.content_type
    WHEN 'first_workout' THEN 30
    WHEN 'workout_completed' THEN 20
    WHEN 'quick_workout_completed' THEN 15
    WHEN 'weekly_recap' THEN 25
    WHEN 'id_card_upgrade' THEN 25
    WHEN 'personal_record' THEN 25
    WHEN 'goal_achieved' THEN 25
    WHEN 'assessment_completed' THEN 20
    WHEN 'level_up' THEN 20
    WHEN 'streak_7' THEN 20
    ELSE 10 END;
  NEW.reward_xp := v_xp;
  IF NEW.shared_at IS NULL THEN NEW.shared_at := now(); END IF;

  IF v_ath IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.content_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM share_events s WHERE s.athlete_id = v_ath AND s.content_type = NEW.content_type AND s.content_id = NEW.content_id AND s.rewarded = true) INTO v_dup;
  ELSE
    SELECT EXISTS (SELECT 1 FROM share_events s WHERE s.athlete_id = v_ath AND s.content_type = NEW.content_type AND s.rewarded = true AND s.shared_at >= v_day_start) INTO v_dup;
  END IF;
  SELECT count(*) INTO v_today FROM share_events s WHERE s.athlete_id = v_ath AND s.rewarded = true AND s.shared_at >= v_day_start;

  IF NOT v_dup AND v_today < 3 THEN
    BEGIN
      PERFORM public.fn_award_xp(v_ath, v_xp, 'share_bonus', jsonb_build_object('content_type', NEW.content_type, 'content_id', NEW.content_id));
      NEW.rewarded := true;
    EXCEPTION WHEN OTHERS THEN
      NEW.rewarded := false;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
