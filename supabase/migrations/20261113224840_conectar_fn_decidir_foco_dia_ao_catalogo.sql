
CREATE OR REPLACE FUNCTION public.fn_decidir_foco_dia(p_aluno_id uuid, p_data date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_periodizacao RECORD;
  v_wave RECORD;
  v_focus_efetivo text;
  v_protocol_sugerido int;
  v_grupos text[];
  v_cap jsonb;
  v_catalogo jsonb;
BEGIN
  SELECT ap.id AS periodizacao_id, ap.annual_plan_id
  INTO v_periodizacao
  FROM athlete_periodizations ap
  WHERE ap.athlete_id = p_aluno_id AND ap.status IN ('in_progress', 'active')
  ORDER BY ap.created_at DESC
  LIMIT 1;

  SELECT w.id, w.wave_order, w.wave_label, w.focus, w.volume_change_pct, w.started_at
  INTO v_wave
  FROM fitpro_smartperiodizer_waves w
  JOIN fitpro_smartperiodizer_periodizations fsp ON fsp.id = w.smartperiodizer_periodization_id
  WHERE fsp.fitpro_student_id = p_aluno_id AND w.status = 'current' AND fsp.status = 'active'
  ORDER BY w.started_at DESC NULLS LAST
  LIMIT 1;

  v_focus_efetivo := COALESCE(
    v_wave.focus,
    CASE
      WHEN v_wave.wave_label ~* 'hipertrofia|tensional|cluster|variaç' THEN 'hypertrophy'
      WHEN v_wave.wave_label ~* 'força|potência|peaking|realização' THEN 'strength'
      WHEN v_wave.wave_label ~* 'metabólico' THEN 'emagrecimento'
      WHEN v_wave.wave_label ~* 'deload' THEN 'recovery'
      WHEN v_wave.wave_label ~* 'base|adaptação neural|teste' THEN 'base'
      ELSE 'hypertrophy'
    END
  );

  v_protocol_sugerido := CASE v_focus_efetivo
    WHEN 'hypertrophy'   THEN 4
    WHEN 'strength'      THEN 4
    WHEN 'emagrecimento' THEN 5
    WHEN 'recovery'      THEN 9
    WHEN 'base'          THEN 6
    ELSE 4
  END;

  BEGIN
    v_cap := public.fn_athlete_capacity_core(p_aluno_id);
  EXCEPTION WHEN OTHERS THEN
    v_cap := NULL;
  END;

  -- NOVO (conexão pendente resolvida): lê o catálogo rico de periodização
  -- (rpe_cap/reps_range/sets_range/intensity_pct_1rm/fase atual) via a função
  -- auxiliar já existente e testada, mas até agora nunca consumida por este
  -- fluxo. Falha de leitura nunca derruba a decisão de foco do dia (fallback
  -- heurístico acima continua valendo quando o catálogo não tem dado).
  BEGIN
    v_catalogo := public.fn_periodizacao_prescricao_atual(p_aluno_id);
  EXCEPTION WHEN OTHERS THEN
    v_catalogo := NULL;
  END;

  RETURN jsonb_build_object(
    'periodizacao_id', v_periodizacao.periodizacao_id,
    'wave_id', v_wave.id,
    'wave_label', v_wave.wave_label,
    'focus_bruto', v_wave.focus,
    'focus_efetivo', v_focus_efetivo,
    'focus_inferido', (v_wave.focus IS NULL),
    'volume_change_pct', v_wave.volume_change_pct,
    'protocol_sugerido', v_protocol_sugerido,
    'tem_wave_ativa', (v_wave.id IS NOT NULL),
    'capacidade', v_cap,
    'catalogo', v_catalogo
  );
END;
$function$;
;
