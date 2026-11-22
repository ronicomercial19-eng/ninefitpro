-- Nova função: recalcula user_stats_agg a partir das tabelas VIVAS
-- (workout_executions/personal_records, chave athlete_id), em vez de
-- treinos_realizados (0 linhas, morta) usada pela recalc_user_stats antiga.
-- recalc_user_stats(aluno_id) é mantida intacta para não quebrar nenhum
-- caller legado; esta é a versão nova que a tela do FitPro deve chamar.

CREATE OR REPLACE FUNCTION public.recalc_athlete_stats(p_athlete_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_mes int;
  v_kg_mes numeric;
  v_ultimo date;
  v_streak int := 0;
  v_check_date date;
  v_prs int;
  v_total_geral int;
BEGIN
  -- Treinos concluídos no mês corrente + volume total (kg)
  SELECT COUNT(*), COALESCE(SUM(total_volume_kg), 0)
  INTO v_total_mes, v_kg_mes
  FROM public.workout_executions
  WHERE athlete_id = p_athlete_id
    AND status = 'completed'
    AND workout_date >= date_trunc('month', CURRENT_DATE)::date;

  -- Último treino concluído (qualquer período)
  SELECT MAX(workout_date) INTO v_ultimo
  FROM public.workout_executions
  WHERE athlete_id = p_athlete_id AND status = 'completed';

  -- Total geral de treinos concluídos (histórico completo)
  SELECT COUNT(*) INTO v_total_geral
  FROM public.workout_executions
  WHERE athlete_id = p_athlete_id AND status = 'completed';

  -- PRs (já usa athlete_id corretamente na tabela personal_records)
  SELECT COUNT(*) INTO v_prs
  FROM public.personal_records
  WHERE athlete_id = p_athlete_id;

  -- Streak: dias consecutivos com treino concluído, terminando no último dia
  IF v_ultimo IS NOT NULL THEN
    v_check_date := v_ultimo;
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.workout_executions
        WHERE athlete_id = p_athlete_id
          AND status = 'completed'
          AND workout_date = v_check_date
      ) THEN
        v_streak := v_streak + 1;
        v_check_date := v_check_date - 1;
      ELSE
        EXIT;
      END IF;
      IF v_streak > 365 THEN EXIT; END IF;
    END LOOP;
    -- só conta streak vivo se o último treino foi hoje ou ontem
    IF v_ultimo < CURRENT_DATE - 1 THEN v_streak := 0; END IF;
  END IF;

  -- Upsert por athlete_id (aluno_id fica NULL — não é mais a chave de escrita nova)
  INSERT INTO public.user_stats_agg (
    aluno_id, athlete_id, total_treinos_mes, kg_total_mes,
    streak_dias, ultimo_treino, prs_count, total_treinos_geral, updated_at
  )
  VALUES (
    NULL, p_athlete_id, v_total_mes, v_kg_mes,
    v_streak, v_ultimo, v_prs, v_total_geral, now()
  )
  ON CONFLICT (athlete_id) DO UPDATE SET
    total_treinos_mes = EXCLUDED.total_treinos_mes,
    kg_total_mes = EXCLUDED.kg_total_mes,
    streak_dias = EXCLUDED.streak_dias,
    ultimo_treino = EXCLUDED.ultimo_treino,
    prs_count = EXCLUDED.prs_count,
    total_treinos_geral = EXCLUDED.total_treinos_geral,
    updated_at = now();
END;
$function$;
;
