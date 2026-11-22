
-- 1) Mesmo par de bugs do fn_on_xp_awarded: coluna errada + função fantasma
CREATE OR REPLACE FUNCTION public.fn_on_workout_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Garante registro de ativação (coluna correta: activation_started_at)
    INSERT INTO public.athlete_activation (athlete_id, activation_started_at)
    VALUES (NEW.athlete_id, now())
    ON CONFLICT (athlete_id) DO NOTHING;

    -- NOTA: fn_increment_streak nunca existiu (chamada fantasma removida em 10/08/2026)

    -- Conta como missão completada
    PERFORM public.fn_complete_mission(NEW.athlete_id, 'workout_completed');
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Remove o crédito de XP duplicado: progress-sync já é a "única porta de entrada"
-- de XP (200 por workout_complete). Esse trigger mantém o recálculo de score e o
-- snapshot de perfil, que são responsabilidades reais dele, só tira o fn_award_xp.
CREATE OR REPLACE FUNCTION public.trg_workout_xp_and_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN

    -- XP removido daqui em 10/08/2026: progress-sync já credita 200 XP via fn_award_xp
    -- (era o motivo do XP em dobro: 100 aqui + 200 na edge function pro mesmo treino).

    PERFORM public.calcular_sync_score_real(NEW.athlete_id);

    INSERT INTO public.athlete_profile_snapshots (athlete_id, snapshot_data, source)
    VALUES (
      NEW.athlete_id,
      jsonb_build_object(
        'execution_id', NEW.id,
        'workout_date', NEW.workout_date,
        'duration_minutes', NEW.duration_minutes,
        'total_volume_kg', NEW.total_volume_kg,
        'avg_rpe', NEW.avg_rpe
      ),
      'workout_complete'
    );
  END IF;
  RETURN NEW;
END;
$function$;
;
