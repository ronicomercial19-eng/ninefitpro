-- Tabela protegida para guardar a chave de integração (só acessível via SECURITY DEFINER function, RLS bloqueia acesso direto)
CREATE TABLE IF NOT EXISTS public.integration_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name text NOT NULL UNIQUE,
  secret_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;
-- Sem policies: ninguém via API/authenticated acessa. Só functions SECURITY DEFINER leem.

INSERT INTO public.integration_secrets (integration_name, secret_value)
VALUES ('supra_ingest_key', 'bef584918308f9caad20e7bcf44c0f720ba3b817ceca180d0f7e9b546a8b6dd7')
ON CONFLICT (integration_name) DO UPDATE SET secret_value = EXCLUDED.secret_value;

COMMENT ON TABLE public.integration_secrets IS 'Chaves de integração com sistemas externos (ex: Banco Supra). RLS sem policies = inacessível via API; só lida por functions SECURITY DEFINER internas.';

-- Função ponte: envia evento ao Banco Supra via HTTP (pg_net, assíncrono, não bloqueia a transação)
CREATE OR REPLACE FUNCTION public.fn_send_event_to_supra(
  p_event_type text,
  p_user_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_importance numeric DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  SELECT secret_value INTO v_key FROM public.integration_secrets WHERE integration_name = 'supra_ingest_key';
  IF v_key IS NULL THEN RETURN; END IF;

  PERFORM net.http_post(
    url := 'https://bwcduzbzdysxljbuqfos.supabase.co/functions/v1/ingest-event',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-api-key', v_key,
      'x-source-system', 'fitpro'
    ),
    body := jsonb_build_object(
      'event_type', p_event_type,
      'user_id', p_user_id,
      'payload', p_payload,
      'importance_score', p_importance
    )
  );
END;
$function$;

COMMENT ON FUNCTION public.fn_send_event_to_supra(text, uuid, jsonb, numeric) IS 'Ponte FitPro -> Banco Supra. Envia evento via pg_net.http_post (assíncrono) para a Edge Function ingest-event do projeto bwcduzbzdysxljbuqfos. Criada 11/08.';

-- Trigger 1: envia evento quando XP é concedido
CREATE OR REPLACE FUNCTION public.trg_fn_send_xp_event_to_supra()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.total_xp IS DISTINCT FROM OLD.total_xp THEN
    PERFORM public.fn_send_event_to_supra(
      'xp_gained',
      NEW.user_id,
      jsonb_build_object('athlete_id', NEW.id, 'total_xp', NEW.total_xp, 'level', NEW.level),
      2
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_send_xp_to_supra ON public.athletes;
CREATE TRIGGER trg_send_xp_to_supra
AFTER UPDATE ON public.athletes
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_send_xp_event_to_supra();

-- Trigger 2: envia evento quando avaliação recebe score
CREATE OR REPLACE FUNCTION public.trg_fn_send_avaliacao_event_to_supra()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF NEW.score_global IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM public.athletes WHERE id = NEW.athlete_id;
    IF v_user_id IS NOT NULL THEN
      PERFORM public.fn_send_event_to_supra(
        'evaluation_done',
        v_user_id,
        jsonb_build_object('avaliacao_id', NEW.id, 'score_global', NEW.score_global),
        3
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_send_avaliacao_to_supra ON public.avaliacoes_unificadas;
CREATE TRIGGER trg_send_avaliacao_to_supra
AFTER INSERT OR UPDATE ON public.avaliacoes_unificadas
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_send_avaliacao_event_to_supra();;
