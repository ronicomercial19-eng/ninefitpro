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
BEGIN
  SELECT ap.id AS periodizacao_id, ap.annual_plan_id
  INTO v_periodizacao
  FROM athlete_periodizations ap
  WHERE ap.athlete_id = p_aluno_id AND ap.status IN ('in_progress', 'active')
  ORDER BY ap.created_at DESC
  LIMIT 1;

  -- CORREÇÃO (26/10): antes esta query pegava QUALQUER wave 'current' do aluno, mesmo que
  -- pertencesse a uma fitpro_smartperiodizer_periodizations já arquivada/trocada (achado real:
  -- Fernanda tinha 3 periodizações diferentes com sobra de wave 'current' de testes/históricos
  -- antigos, e a vigente de verdade, criada 20/10, ficava sem wave nenhuma sendo lida). Agora
  -- exige fsp.status = 'active' explicitamente — a wave só conta se pertencer à periodização
  -- realmente em vigor no SmartPeriodizer, não a qualquer uma que o aluno já teve.
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

  RETURN jsonb_build_object(
    'periodizacao_id', v_periodizacao.periodizacao_id,
    'wave_id', v_wave.id,
    'wave_label', v_wave.wave_label,
    'focus_bruto', v_wave.focus,
    'focus_efetivo', v_focus_efetivo,
    'focus_inferido', (v_wave.focus IS NULL),
    'volume_change_pct', v_wave.volume_change_pct,
    'protocol_sugerido', v_protocol_sugerido,
    'tem_wave_ativa', (v_wave.id IS NOT NULL)
  );
END;
$function$;;
