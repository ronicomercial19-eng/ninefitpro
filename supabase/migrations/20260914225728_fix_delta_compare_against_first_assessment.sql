-- Regra descoberta com 2 evidências independentes (score_global e gordura_corporal
-- batendo exatamente com o print real): o app compara sempre contra a PRIMEIRA
-- avaliação disponível do atleta, não a anterior imediata. "período" = desde o início.

CREATE OR REPLACE FUNCTION public.fn_get_ron_progresso_screen(p_athlete_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_atual record;
  v_primeira_score numeric;
  v_forca_total numeric;
  v_gordura_atual numeric;
  v_gordura_primeira numeric;
  v_ultimo_pr record;
  v_result jsonb;
BEGIN
  SELECT score_global, gordura_corporal, massa_muscular, data_avaliacao
  INTO v_atual
  FROM public.avaliacoes_unificadas
  WHERE athlete_id = p_athlete_id AND score_global IS NOT NULL
  ORDER BY data_avaliacao DESC LIMIT 1;

  -- "no período" = desde a primeira avaliação com score_global do atleta
  SELECT score_global INTO v_primeira_score
  FROM public.avaliacoes_unificadas
  WHERE athlete_id = p_athlete_id AND score_global IS NOT NULL
  ORDER BY data_avaliacao ASC LIMIT 1;

  SELECT gordura_corporal INTO v_gordura_primeira
  FROM public.avaliacoes_unificadas
  WHERE athlete_id = p_athlete_id AND gordura_corporal IS NOT NULL
  ORDER BY data_avaliacao ASC LIMIT 1;

  SELECT SUM(wes.actual_weight * wes.actual_reps) INTO v_forca_total
  FROM public.workout_exercise_sets wes
  JOIN public.workout_executions we ON we.id = wes.execution_id
  WHERE we.athlete_id = p_athlete_id
    AND we.status = 'completed'
    AND wes.completed = true
    AND wes.actual_weight IS NOT NULL
    AND wes.actual_reps IS NOT NULL;

  SELECT gordura_corporal INTO v_gordura_atual
  FROM public.avaliacoes_unificadas
  WHERE athlete_id = p_athlete_id AND gordura_corporal IS NOT NULL
  ORDER BY data_avaliacao DESC LIMIT 1;

  SELECT exercicio, data_pr INTO v_ultimo_pr
  FROM public.personal_records
  WHERE athlete_id = p_athlete_id
  ORDER BY data_pr DESC LIMIT 1;

  SELECT jsonb_build_object(

    'avaliacao_atual', jsonb_build_object(
      'score_atual', v_atual.score_global,
      'score_primeira_do_periodo', v_primeira_score,
      'delta_pp', CASE WHEN v_primeira_score IS NOT NULL AND v_atual.score_global != v_primeira_score
        THEN round((v_atual.score_global - v_primeira_score)::numeric, 1)
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
    ),

    'metas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'titulo', titulo, 'exercicio', exercicio, 'metrica', metrica,
        'valor_inicial', valor_inicial, 'valor_atual', valor_atual, 'valor_meta', valor_meta,
        'unidade', unidade, 'prazo', prazo, 'status', status
      ) ORDER BY prazo NULLS LAST)
      FROM public.metas_progresso
      WHERE athlete_id = p_athlete_id
    ), '[]'::jsonb),

    -- delta de gordura também "no período" (primeira avaliação), consistente com score
    'insights', (
      SELECT jsonb_agg(texto) FROM (
        SELECT format('Redução de %spp de gordura corporal nas últimas avaliações.',
          round((v_gordura_primeira - v_gordura_atual)::numeric, 1)) AS texto
        WHERE v_gordura_atual IS NOT NULL AND v_gordura_primeira IS NOT NULL
          AND v_gordura_atual < v_gordura_primeira
        UNION ALL
        SELECT format('Último recorde: %s em %s.', v_ultimo_pr.exercicio, to_char(v_ultimo_pr.data_pr, 'DD/MM/YYYY'))
        WHERE v_ultimo_pr.exercicio IS NOT NULL
      ) insights_gerados
    )

  ) INTO v_result;

  RETURN v_result;
END;
$function$;;
