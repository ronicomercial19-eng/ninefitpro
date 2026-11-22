
CREATE OR REPLACE FUNCTION public.fn_on_xp_awarded()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.total_xp IS DISTINCT FROM OLD.total_xp AND NEW.total_xp > COALESCE(OLD.total_xp, 0) THEN
    -- Garante registro de ativação (coluna correta: activation_started_at)
    INSERT INTO public.athlete_activation (athlete_id, activation_started_at)
    VALUES (NEW.id, now())
    ON CONFLICT (athlete_id) DO NOTHING;

    -- Incrementa streak (respeita a regra de 1x por dia já embutida na função)
    PERFORM public.fn_increment_streak(NEW.id);

    -- Conta como missão completada
    PERFORM public.fn_complete_mission(NEW.id, 'xp_awarded');
  END IF;
  RETURN NEW;
END;
$function$;
;
