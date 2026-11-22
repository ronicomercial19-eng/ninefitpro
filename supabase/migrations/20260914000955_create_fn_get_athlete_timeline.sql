-- Motor único de timeline para a tela "Histórico" do FitPro: unifica
-- avaliações físicas (Progress Tracker), treinos concluídos e PRs numa
-- única linha do tempo ordenada por data, resolvendo a lacuna de que hoje
-- não existe nenhuma fonte que combine essas 3 origens de dado.

CREATE OR REPLACE FUNCTION public.fn_get_athlete_timeline(p_athlete_id uuid, p_limit int DEFAULT 30)
RETURNS TABLE (
  event_date date,
  event_type text,
  title text,
  detail jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY

  -- Avaliações físicas (Progress Tracker)
  SELECT
    au.data_avaliacao AS event_date,
    'assessment'::text AS event_type,
    'Avaliação Física'::text AS title,
    jsonb_build_object(
      'score_global', au.score_global,
      'origem', au.origem,
      'peso', au.peso,
      'gordura_corporal', au.gordura_corporal
    ) AS detail
  FROM public.avaliacoes_unificadas au
  WHERE au.athlete_id = p_athlete_id

  UNION ALL

  -- Treinos concluídos
  SELECT
    we.workout_date AS event_date,
    'workout'::text AS event_type,
    'Treino Concluído'::text AS title,
    jsonb_build_object(
      'total_volume_kg', we.total_volume_kg,
      'status', we.status
    ) AS detail
  FROM public.workout_executions we
  WHERE we.athlete_id = p_athlete_id AND we.status = 'completed'

  UNION ALL

  -- Recordes pessoais
  SELECT
    pr.data_pr AS event_date,
    'pr'::text AS event_type,
    ('Recorde: ' || pr.exercicio)::text AS title,
    jsonb_build_object(
      'valor', pr.valor,
      'unidade', pr.unidade,
      'exercicio', pr.exercicio
    ) AS detail
  FROM public.personal_records pr
  WHERE pr.athlete_id = p_athlete_id

  ORDER BY event_date DESC
  LIMIT p_limit;
END;
$function$;;
