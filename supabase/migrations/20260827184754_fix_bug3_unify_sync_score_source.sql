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

  -- FIX #3 (QA Master): "Sync calibrada" e "Sync Score" eram duas contas
  -- diferentes (RPE bruto vs composto real), causando 64% vs 0% pra mesma
  -- pessoa. Agora toda vez que um treino é gravado, recalculamos o score
  -- composto oficial (calcular_sync_score_real, já grava em athletes.sync_score)
  -- e logamos ESSE mesmo número aqui. Uma fonte única para as duas telas.
  IF v_source = 'workout_execution' THEN
    v_score := public.calcular_sync_score_real(v_athlete_id);
  ELSE
    v_score := public.calcular_sync_score_real(v_athlete_id);
  END IF;

  INSERT INTO public.sync_score_logs (user_id, source, score, metadata, created_at)
  VALUES (v_user_id, v_source, v_score, v_row, now());

  RETURN NEW;
END;
$function$;;
