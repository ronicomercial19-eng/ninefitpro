
-- Conecta o Nine CORE (prescrição diária) ao mesmo dado rico de periodização que
-- o Nine PRO (tela de planejamento) já usa via vw_athlete_periodizacao_ativa.
-- Puramente de leitura, reaproveita a view já testada (curm/cw) em vez de
-- duplicar a lógica. Não seleciona exercício, não grava nada, não tem lock.
CREATE OR REPLACE FUNCTION public.fn_periodizacao_prescricao_atual(p_aluno_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT jsonb_build_object(
    'rpe_cap', v.rpe_cap,
    'reps_range', v.reps_range,
    'sets_range', v.sets_range,
    'intensity_pct_1rm', v.intensity_pct_1rm,
    'current_phase', v.current_phase,
    'current_week_index', v.current_week_index,
    'fonte', 'catalogo_periodizacao'
  )
  FROM vw_athlete_periodizacao_ativa v
  WHERE v.athlete_id = p_aluno_id
    AND (v.rpe_cap IS NOT NULL OR v.reps_range IS NOT NULL OR v.sets_range IS NOT NULL);
$function$;
;
