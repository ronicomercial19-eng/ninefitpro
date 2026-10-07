-- Contrato único de loop: todo loop do FitPro registra o evento no master_registry
-- (event_type + source + payload com athlete_id). Gatilho -> ação -> evento -> sync/XP -> notificação.
-- Falha de registro nunca quebra o loop.
CREATE OR REPLACE FUNCTION public.fn_loop_emit(p_athlete_id uuid, p_event_type text, p_source text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_user uuid;
BEGIN
  SELECT coalesce(a.user_id, l.user_id) INTO v_user
  FROM public.athletes a LEFT JOIN public.athlete_auth_link l ON l.athlete_id = a.id
  WHERE a.id = p_athlete_id LIMIT 1;
  IF v_user IS NULL THEN RETURN; END IF;
  INSERT INTO public.master_registry (user_id, event_type, source, payload)
  VALUES (v_user, p_event_type, p_source, coalesce(p_payload, '{}'::jsonb) || jsonb_build_object('athlete_id', p_athlete_id));
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.fn_loop_emit(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_loop_emit_share()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.fn_loop_emit(NEW.athlete_id, 'share_completed', 'share', jsonb_build_object('content_type', NEW.content_type, 'channel', NEW.channel, 'rewarded', NEW.rewarded, 'xp', NEW.reward_xp));
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_loop_emit_checkin()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.fn_loop_emit(NEW.athlete_id, 'daily_calibration', 'calibracao', jsonb_build_object('checkin_date', NEW.checkin_date));
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_loop_emit_workout()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.fn_loop_emit(NEW.athlete_id, 'workout_complete', 'train', jsonb_build_object('execution_id', NEW.id, 'workout_date', NEW.workout_date, 'phase', NEW.phase_name));
  END IF;
  RETURN NEW;
END; $function$;

REVOKE ALL ON FUNCTION public.trg_loop_emit_share(), public.trg_loop_emit_checkin(), public.trg_loop_emit_workout() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_loop_emit_share ON public.share_events;
CREATE TRIGGER trg_loop_emit_share AFTER INSERT ON public.share_events FOR EACH ROW EXECUTE FUNCTION public.trg_loop_emit_share();

DROP TRIGGER IF EXISTS trg_loop_emit_checkin ON public.daily_checkins;
CREATE TRIGGER trg_loop_emit_checkin AFTER INSERT ON public.daily_checkins FOR EACH ROW EXECUTE FUNCTION public.trg_loop_emit_checkin();

DROP TRIGGER IF EXISTS trg_loop_emit_workout ON public.workout_executions;
CREATE TRIGGER trg_loop_emit_workout AFTER INSERT OR UPDATE OF status ON public.workout_executions FOR EACH ROW EXECUTE FUNCTION public.trg_loop_emit_workout();

-- Streaming/HealthFlix: o loop real é student_library_assignments (professor atribui na biblioteca, aluno assiste no FitPro).
-- As tabelas abaixo ficam como legado (vazias), sem apagar.
COMMENT ON TABLE public.fitpro_healthflix_assignments IS 'LEGADO: o loop de streaming usa student_library_assignments + fn_library_progress.';
COMMENT ON TABLE public.fitpro_healthflix_progress IS 'LEGADO: o loop de streaming usa student_library_assignments + fn_library_progress.';
COMMENT ON TABLE public.healthflix_progress IS 'LEGADO: o loop de streaming usa student_library_assignments + fn_library_progress.';
