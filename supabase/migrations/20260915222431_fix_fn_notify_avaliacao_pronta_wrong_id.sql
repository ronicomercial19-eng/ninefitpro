-- Achado 15/09: trg_notify_avaliacao_pronta (criada por outro dev, não vista
-- antes) chamava fn_get_user_id_for_athlete(NEW.aluno_id) quando a função
-- espera um athletes.id — mesmo bug de confusão de identidade já resolvido
-- em outros pontos do sistema, reintroduzido aqui. Resultado: 0 notificações
-- de "avaliacao_pronta" enviadas desde a criação da trigger (confirmado:
-- notifications count=0 para esse event_type). Corrigido para NEW.athlete_id.

CREATE OR REPLACE FUNCTION public.fn_notify_avaliacao_pronta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_user_id UUID;
BEGIN
  IF NEW.athlete_id IS NOT NULL THEN
    v_user_id := public.fn_get_user_id_for_athlete(NEW.athlete_id);
    IF v_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_user_id, 'info', 'avaliacao_pronta', 'Nova avaliação registrada', 'Sua avaliação física foi registrada. Confira seus resultados.', 'avaliacoes_unificadas', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;;
