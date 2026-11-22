-- Blocos de ativação e mobilidade (neural/integração/reset do protocolo 9x9x9) não são grupos musculares;
-- o guard tratava esses exercícios como "fora do foco do dia" e bloqueava/sinalizava treinos válidos.
-- Exceção estreita: só 'exercicios de ativacao' e 'mobilidade', e só quando o dia tem foco definido.
CREATE OR REPLACE FUNCTION public.fitpro_matches_focus(p_muscles text[], p_focus text[])
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT
    (coalesce(cardinality(p_focus),0) > 0
      AND EXISTS(SELECT 1 FROM unnest(p_muscles) m
                 WHERE public.fitpro_muscle_key(m) IN ('exercicios de ativacao','mobilidade')))
    OR EXISTS(SELECT 1 FROM unnest(p_muscles) m, unnest(p_focus) f
              WHERE public.fitpro_muscle_key(m)=public.fitpro_muscle_key(f)
                 OR public.fitpro_muscle_key(f)='full_body'
                 OR (public.fitpro_muscle_key(f)='membros inferiores'
                     AND public.fitpro_muscle_key(m) IN ('gluteos','isquiotibiais','quadriceps','panturrilhas','adutores','abdutores')))
$function$;

-- Reavalia só os dias sinalizados por 'exercise_focus_or_order_review': limpa quando, com a regra corrigida,
-- nenhum exercício está fora do foco e não há ordem duplicada. Dias com ordem duplicada real continuam sinalizados.
UPDATE public.daily_workouts d SET prescription_issue = NULL
WHERE d.prescription_issue = 'exercise_focus_or_order_review'
  AND NOT EXISTS (
    SELECT 1 FROM public.workout_exercises w JOIN public.exercises e ON e.id = w.exercise_id
    WHERE w.daily_workout_id = d.id
      AND (NOT public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)), d.focus_muscles)
           OR EXISTS (SELECT 1 FROM public.workout_exercises x WHERE x.daily_workout_id = d.id AND x.exercise_order = w.exercise_order AND x.id <> w.id))
  );;
