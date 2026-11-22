-- Mesmo padrão de falha achado em fn_get_ron_progresso_screen/fn_registrar_peso_avulso
-- (14/09): SECURITY DEFINER com EXECUTE liberado até pra PUBLIC/anon, sem checar se
-- p_athlete_id pertence a quem chama. Corrigido antes de ligar essa função a um botão.
CREATE OR REPLACE FUNCTION public.fn_get_athlete_timeline(p_athlete_id uuid, p_limit integer DEFAULT 30)
 RETURNS TABLE(event_date date, event_type text, title text, detail jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND a.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.athlete_auth_link al WHERE al.athlete_id = p_athlete_id AND al.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.athletes a
    JOIN auth.users u ON u.email = a.email
    WHERE a.id = p_athlete_id AND u.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY

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
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_get_athlete_timeline(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_get_athlete_timeline(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_athlete_timeline(uuid, integer) TO authenticated;;
