
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

    -- NOTA: fn_increment_streak nunca existiu no banco (chamada fantasma removida em 10/08/2026).
    -- Streak precisa de implementação própria se for para viver aqui; hoje o streak exibido
    -- no app parece vir de contagem direta de daily_checkins, não deste trigger.

    -- Conta como missão completada
    PERFORM public.fn_complete_mission(NEW.id, 'xp_awarded');
  END IF;
  RETURN NEW;
END;
$function$;
;
