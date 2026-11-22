-- Motor único para as telas "Progresso" e "RON" do FitPro (fonte de dados
-- do Progress Tracker) — resolve todos os componentes vistos no print real:
-- Avaliação Atual (score_global + delta em pp vs. anterior), Composição
-- Corporal (radar gordura/músculo), Força Total (1RM mais recente),
-- Tendência de Gordura 60 dias, Progressão de Força (histórico 1RM por
-- exercício), Recordes Recentes (já existente via personal_records),
-- Corridas Recentes (bio_activity_logs via athlete_auth_link), Insights.

CREATE OR REPLACE FUNCTION public.fn_get_ron_progresso_screen(p_athlete_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_atual record;
  v_anterior record;
  v_forca_total numeric;
  v_result jsonb;
BEGIN
  -- Avaliação atual e anterior (para delta em pontos percentuais)
  SELECT score_global, gordura_corporal, massa_muscular, data_avaliacao
  INTO v_atual
  FROM public.avaliacoes_unificadas
  WHERE athlete_id = p_athlete_id AND score_global IS NOT NULL
  ORDER BY data_avaliacao DESC LIMIT 1;

  SELECT score_global INTO v_anterior
  FROM public.avaliacoes_unificadas
  WHERE athlete_id = p_athlete_id AND score_global IS NOT NULL
    AND data_avaliacao < COALESCE(v_atual.data_avaliacao, CURRENT_DATE)
  ORDER BY data_avaliacao DESC LIMIT 1;

  -- Força total: soma dos sets reais registrados (workout_exercise_sets),
  -- não das avaliações — "Sem sets registrados" é literal no print.
  SELECT SUM(wes.weight_kg * wes.reps) INTO v_forca_total
  FROM public.workout_exercise_sets wes
  JOIN public.workout_executions we ON we.id = wes.execution_id
  WHERE we.athlete_id = p_athlete_id AND we.status = 'completed';

  SELECT jsonb_build_object(

    'avaliacao_atual', jsonb_build_object(
      'score_atual', v_atual.score_global,
      'score_anterior', v_anterior.score_global,
      'delta_pp', CASE WHEN v_anterior.score_global IS NOT NULL
        THEN round((v_atual.score_global - v_anterior.score_global)::numeric, 1)
        ELSE NULL END,
      'data', v_atual.data_avaliacao
    ),

    'composicao_corporal', jsonb_build_object(
      'gordura_corporal', v_atual.gordura_corporal,
      'massa_muscular', v_atual.massa_muscular
    ),

    'forca_total', jsonb_build_object(
      'total_kg', v_forca_total,
      'tem_sets_registrados', v_forca_total IS NOT NULL
    ),

    'tendencia_gordura_60d', (
      SELECT jsonb_agg(jsonb_build_object('data', data_avaliacao, 'valor', gordura_corporal) ORDER BY data_avaliacao)
      FROM public.avaliacoes_unificadas
      WHERE athlete_id = p_athlete_id
        AND gordura_corporal IS NOT NULL
        AND data_avaliacao >= CURRENT_DATE - INTERVAL '60 days'
    ),

    'progressao_forca', (
      SELECT jsonb_agg(jsonb_build_object(
        'exercicio', exercicio, 'data', data_pr, 'valor', valor, 'unidade', unidade
      ) ORDER BY data_pr)
      FROM public.personal_records
      WHERE athlete_id = p_athlete_id AND tipo = 'forca'
    ),

    'recordes_recentes', (
      SELECT jsonb_agg(jsonb_build_object(
        'exercicio', exercicio, 'data', data_pr, 'valor', valor, 'unidade', unidade
      ) ORDER BY data_pr DESC)
      FROM (
        SELECT * FROM public.personal_records
        WHERE athlete_id = p_athlete_id
        ORDER BY data_pr DESC LIMIT 5
      ) recentes
    ),

    'corridas_recentes', (
      SELECT jsonb_agg(jsonb_build_object(
        'data', recorded_at, 'distancia_km', round((distance_m::numeric / 1000), 2), 'fonte', source
      ) ORDER BY recorded_at DESC)
      FROM (
        SELECT bal.* FROM public.bio_activity_logs bal
        JOIN public.athlete_auth_link aal ON aal.user_id = bal.user_id
        WHERE aal.athlete_id = p_athlete_id AND bal.source = 'move_gps'
        ORDER BY bal.recorded_at DESC LIMIT 5
      ) corridas
    )

  ) INTO v_result;

  RETURN v_result;
END;
$function$;;
