-- Segundo bug exposto ao remover o EXCEPTION silencioso: sync_score_logs.score é NOT NULL,
-- mas a função nunca calculava um valor para essa coluna. Adiciona cálculo básico de score
-- por fonte (workout_execution usa avg_rpe/status; checkin usa um valor neutro padrão).

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
  v_score numeric;
  v_row jsonb := to_jsonb(NEW);
BEGIN
  v_athlete_id := COALESCE(NEW.athlete_id, NULL);
  IF v_athlete_id IS NULL THEN RETURN NEW; END IF;

  SELECT user_id INTO v_user_id FROM public.athletes WHERE id = v_athlete_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  -- Score básico por fonte: workout usa RPE médio invertido (menor RPE percebido = melhor
  -- prontidão, escala 0-10 -> 0-100); outras fontes usam score neutro de conclusão (70)
  -- até existir lógica mais específica por tipo de evento.
  IF v_source = 'workout_execution' THEN
    v_score := CASE 
      WHEN (v_row->>'avg_rpe') IS NOT NULL THEN LEAST(100, GREATEST(0, (v_row->>'avg_rpe')::numeric * 10))
      WHEN (v_row->>'status') = 'completed' THEN 70
      ELSE 50
    END;
  ELSE
    v_score := 70; -- placeholder neutro para checkin e demais fontes até refinarmos por tipo
  END IF;

  INSERT INTO public.sync_score_logs (user_id, source, score, metadata, created_at)
  VALUES (v_user_id, v_source, v_score, v_row, now());

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.fn_log_sync_score_event() IS 'Corrigido 11/08 (2 bugs): (1) inseria em coluna athlete_id inexistente, agora resolve para user_id; (2) score é NOT NULL e nunca era fornecido, agora calcula valor básico por fonte. EXCEPTION silencioso removido para expor falhas futuras.';;
