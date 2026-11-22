-- Bug confirmado: fn_log_sync_score_event tentava inserir em sync_score_logs.athlete_id,
-- coluna que não existe (a tabela só tem user_id). O EXCEPTION WHEN OTHERS silenciava o erro,
-- fazendo eventos de workout_executions e ninefit_checkins nunca chegarem em sync_score_logs.
-- Correção: resolve athlete_id -> athletes.user_id (chave real de identidade) antes de inserir.

CREATE OR REPLACE FUNCTION public.fn_log_sync_score_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_athlete_id uuid;
  v_user_id uuid;
  v_source text := TG_ARGV[0];
BEGIN
  v_athlete_id := COALESCE(NEW.athlete_id, NULL);
  IF v_athlete_id IS NULL THEN RETURN NEW; END IF;

  -- Resolve para o user_id real (chave que sync_score_logs de fato usa)
  SELECT user_id INTO v_user_id FROM public.athletes WHERE id = v_athlete_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.sync_score_logs (user_id, source, metadata, created_at)
  VALUES (v_user_id, v_source, to_jsonb(NEW), now());

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.fn_log_sync_score_event() IS 'Corrigido 11/08: tentava inserir em coluna athlete_id inexistente em sync_score_logs (tabela só tem user_id), erro era engolido silenciosamente pelo EXCEPTION WHEN OTHERS. Agora resolve athlete_id -> athletes.user_id corretamente e removeu o EXCEPTION silencioso para expor falhas futuras.';;
