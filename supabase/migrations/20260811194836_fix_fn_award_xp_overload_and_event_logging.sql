-- 1. Remove a versão morta (3 args) — 0 registros em uso confirmados, só grava em activation_events sem atualizar XP real
DROP FUNCTION IF EXISTS public.fn_award_xp(uuid, integer, text);

-- 2. Corrige a versão real (4 args): remove o cast inválido para 'any_event_type_placeholder' 
--    e usa log_event() com o enum correto ('created'), preservando o tipo semântico em metadata
CREATE OR REPLACE FUNCTION public.fn_award_xp(
  p_athlete_id uuid, 
  p_amount integer, 
  p_source text DEFAULT 'unknown'::text, 
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_total_xp integer, new_level integer, leveled_up boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_xp int;
  v_prev_level int;
  v_new_xp int;
  v_new_level int;
BEGIN
  IF p_athlete_id IS NULL OR p_amount IS NULL OR p_amount = 0 THEN
    RETURN;
  END IF;

  SELECT COALESCE(total_xp,0), COALESCE(level,1)
    INTO v_prev_xp, v_prev_level
  FROM public.athletes WHERE id = p_athlete_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'athlete % not found', p_athlete_id;
  END IF;

  v_new_xp := GREATEST(0, v_prev_xp + p_amount);
  v_new_level := GREATEST(1, floor(v_new_xp::numeric / 1000)::int + 1);

  UPDATE public.athletes
     SET total_xp = v_new_xp,
         level    = v_new_level,
         updated_at = now()
   WHERE id = p_athlete_id;

  -- Corrigido: usa log_event() com enum válido ('created') em vez do cast inválido que sempre falhava
  PERFORM public.log_event(
    'created'::event_type,
    'athlete_xp',
    p_athlete_id,
    NULL,
    jsonb_build_object('amount', p_amount, 'source', p_source, 'meta', p_metadata,
                       'new_total_xp', v_new_xp, 'new_level', v_new_level, 'event_key', 'xp_awarded')
  );

  RETURN QUERY SELECT v_new_xp, v_new_level, (v_new_level > v_prev_level);
END;
$function$;

COMMENT ON FUNCTION public.fn_award_xp(uuid, integer, text, jsonb) IS 'Única versão de fn_award_xp (overload de 3 args removido em 11/08 - nunca usado, 0 registros). Corrigido bug de cast inválido no log de evento (era any_event_type_placeholder, agora usa log_event() com enum válido).';;
