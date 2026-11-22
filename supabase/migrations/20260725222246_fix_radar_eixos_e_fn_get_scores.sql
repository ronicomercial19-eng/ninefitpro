
-- Corrige fn_get_athlete_scores para mapear eixos reais do vw_radar_5d
-- para os nomes que o frontend espera (forca, resistencia, core, cardio, mobilidade, global)
CREATE OR REPLACE FUNCTION public.fn_get_athlete_scores(p_athlete_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_sync    int;
  v_xp      int;
  v_level   int;
  v_treino  numeric := 0;
  v_nutri   numeric := 0;
  v_sono    numeric := 0;
  v_recov   numeric := 0;
  v_hrv     numeric := 0;
BEGIN
  -- Recalcula sync em tempo real
  v_sync := calcular_sync_score_real(p_athlete_id);

  -- XP e level
  SELECT COALESCE(total_xp, 0), COALESCE(level, 1)
  INTO v_xp, v_level
  FROM athletes WHERE id = p_athlete_id;

  -- Radar: busca eixos reais e mapeia para nomes do frontend
  SELECT 
    COALESCE(eixo_treino, 0),
    COALESCE(eixo_nutri, 0),
    COALESCE(eixo_sono, 0),
    COALESCE(eixo_recovery, 0),
    COALESCE(eixo_hrv, 0)
  INTO v_treino, v_nutri, v_sono, v_recov, v_hrv
  FROM vw_radar_5d
  WHERE athlete_id = p_athlete_id;

  RETURN json_build_object(
    'sync_score', v_sync,
    'total_xp',   v_xp,
    'level',      v_level,
    'radar', json_build_object(
      'forca',       v_treino,   -- eixo_treino → força
      'resistencia', v_hrv,      -- eixo_hrv → resistência/cardio
      'core',        v_recov,    -- eixo_recovery → core/recovery
      'cardio',      v_hrv,      -- eixo_hrv → cardio
      'mobilidade',  v_sono,     -- eixo_sono → mobilidade/recuperação
      'global',      ROUND((v_treino + v_nutri + v_sono + v_recov + v_hrv) / 5.0)
    )
  );
END;
$$;
;
