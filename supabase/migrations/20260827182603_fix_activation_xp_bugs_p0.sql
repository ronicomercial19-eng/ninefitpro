-- ============================================================
-- FIX 1: activation_finish() — bug #1/#2 do QA Master
-- Decisão de Ron: Opção B. Ativação conclui no onboarding.
-- Trilha de 7 dias vira desafio de consistência separado,
-- não bloqueia mais a ativação. fully_activated agora é
-- setado corretamente (nunca ficava true).
-- ============================================================
CREATE OR REPLACE FUNCTION public.activation_finish(p_athlete_id uuid)
 RETURNS TABLE(fully_activated boolean, finished_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  -- Ativação conclui no onboarding (Opção B): fully_activated = true aqui,
  -- independente da trilha de 7 dias (que agora é desafio à parte).
  UPDATE public.athlete_activation
  SET finished_at = now(),
      fully_activated = true
  WHERE athlete_id = p_athlete_id;

  UPDATE public.athletes
  SET onboarding_completed_at = COALESCE(onboarding_completed_at, now())
  WHERE id = p_athlete_id
  RETURNING user_id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET first_access_completed = true
    WHERE user_id = v_user_id;
  END IF;

  RETURN QUERY
  SELECT aa.fully_activated, aa.finished_at
  FROM public.athlete_activation aa
  WHERE aa.athlete_id = p_athlete_id;
END;
$function$;

-- ============================================================
-- FIX 2: activation_advance('execute') — bug #6 do QA Master
-- Decisão de Ron: manter XP de bônus do onboarding, mas REMOVER
-- a concessão de XP daqui. XP de treino real passa a ter evento
-- próprio (fn_award_workout_xp), condicionado a execução real.
-- ============================================================
CREATE OR REPLACE FUNCTION public.activation_advance(p_athlete_id uuid, p_step text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(step text, ok boolean, activation_row jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.athlete_activation (athlete_id, activated_at)
  VALUES (p_athlete_id, now())
  ON CONFLICT (athlete_id) DO NOTHING;

  IF p_step = 'assessment' THEN
    UPDATE public.athletes SET
      primary_goal = COALESCE(p_payload->>'goal', primary_goal),
      objetivo = COALESCE(p_payload->>'goal', objetivo),
      experience_level = COALESCE(p_payload->>'experience_level', experience_level),
      nivel = COALESCE(p_payload->>'experience_level', nivel),
      weekly_frequency = COALESCE((p_payload->>'weekly_frequency')::int4, weekly_frequency),
      sessions_per_week = COALESCE((p_payload->>'weekly_frequency')::int4, sessions_per_week),
      injuries_limitations = COALESCE(p_payload->>'restrictions', injuries_limitations)
    WHERE id = p_athlete_id;

    UPDATE public.athlete_activation
    SET assessment_done_at = now()
    WHERE athlete_id = p_athlete_id;

  ELSIF p_step = 'generation' THEN
    INSERT INTO public.daily_workouts (
      athlete_id, day_number, day_name, focus_muscles,
      workout_type, workout_date
    ) VALUES (
      p_athlete_id,
      COALESCE((p_payload->>'day_number')::int4, 1),
      COALESCE(p_payload->>'day_name', 'Treino Inicial'),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(p_payload->'focus_muscles')),
        ARRAY['full_body']
      ),
      COALESCE(p_payload->>'workout_type', 'quick'),
      CURRENT_DATE
    );

    UPDATE public.athlete_activation
    SET plan_generated_at = now()
    WHERE athlete_id = p_athlete_id;

    PERFORM public.fn_complete_mission(p_athlete_id, 'first_plan');

  ELSIF p_step = 'execute' THEN
    -- Registra a execução como PENDING, não COMPLETED.
    -- Só vira 'completed' quando houver sets reais registrados
    -- (ver fn_award_workout_xp abaixo). XP removido daqui.
    INSERT INTO public.workout_executions (athlete_id, workout_date, status, started_at)
    VALUES (p_athlete_id, CURRENT_DATE, 'pending', now());

    UPDATE public.athlete_activation
    SET first_workout_at = COALESCE(first_workout_at, now())
    WHERE athlete_id = p_athlete_id;

    -- XP de treino NÃO é mais concedido aqui. Ver fn_award_workout_xp.

  ELSIF p_step = 'consistency' THEN
    UPDATE public.athlete_activation
    SET consistency_days = CASE
          WHEN last_active_at::date = now()::date THEN consistency_days
          ELSE consistency_days + 1
        END,
        last_active_at = now()
    WHERE athlete_id = p_athlete_id;

  ELSE
    RETURN QUERY SELECT p_step, false, '{}'::jsonb;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p_step, true, to_jsonb(aa.*)
  FROM public.athlete_activation aa
  WHERE aa.athlete_id = p_athlete_id;
END;
$function$;

-- ============================================================
-- FIX 3 (novo): fn_award_workout_xp — evento de XP próprio,
-- só concede XP quando há pelo menos 1 set real (completed=true,
-- com actual_reps ou actual_weight preenchido) associado à
-- execução. Chamar isso do front quando o usuário finalizar
-- o treino de verdade, em vez de dar XP no clique de 'concluir'.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_award_workout_xp(p_execution_id uuid, p_amount integer DEFAULT 50)
 RETURNS TABLE(awarded boolean, reason text, new_total_xp integer, new_level integer, leveled_up boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_athlete_id uuid;
  v_real_sets int;
  v_xp_result record;
BEGIN
  SELECT athlete_id INTO v_athlete_id
  FROM public.workout_executions
  WHERE id = p_execution_id;

  IF v_athlete_id IS NULL THEN
    RETURN QUERY SELECT false, 'execution_not_found', NULL::int, NULL::int, NULL::boolean;
    RETURN;
  END IF;

  -- Exige pelo menos 1 set com execução real registrada
  SELECT count(*) INTO v_real_sets
  FROM public.workout_exercise_sets
  WHERE execution_id = p_execution_id
    AND completed = true
    AND (actual_reps IS NOT NULL OR actual_weight IS NOT NULL);

  IF v_real_sets = 0 THEN
    RETURN QUERY SELECT false, 'no_real_execution_recorded', NULL::int, NULL::int, NULL::boolean;
    RETURN;
  END IF;

  -- Marca a execução como concluída de verdade
  UPDATE public.workout_executions
  SET status = 'completed', completed_at = COALESCE(completed_at, now())
  WHERE id = p_execution_id;

  SELECT * INTO v_xp_result
  FROM public.fn_award_xp(v_athlete_id, p_amount, 'workout_completed', jsonb_build_object('execution_id', p_execution_id, 'real_sets', v_real_sets));

  RETURN QUERY SELECT true, 'ok', v_xp_result.new_total_xp, v_xp_result.new_level, v_xp_result.leveled_up;
END;
$function$;

-- ============================================================
-- FIX 4: trg_activation_day3 — checagem real de tempo decorrido
-- Antes: disparava em QUALQUER update com status='active', sem
-- checar dias. Agora: só marca day_3 se já houve ao menos 3 dias
-- corridos desde activation_started_at.
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_activation_day3()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_started timestamptz;
BEGIN
  IF NEW.status = 'active' AND NEW.athlete_id IS NOT NULL THEN
    SELECT activation_started_at INTO v_started
    FROM public.athlete_activation
    WHERE athlete_id = NEW.athlete_id;

    IF v_started IS NOT NULL AND now() >= v_started + interval '3 days' THEN
      UPDATE public.athlete_activation
      SET day_3_completed = true, day_3_completed_at = now()
      WHERE athlete_id = NEW.athlete_id
      AND day_3_completed = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
;
