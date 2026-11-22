
-- Corrige calcular_sync_score_real incluindo checkin diário
CREATE OR REPLACE FUNCTION public.calcular_sync_score_real(p_athlete_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_score           int := 0;
  v_treinos_semana  int;
  v_tem_avaliacao   bool;
  v_tem_plano       bool;
  v_tem_pdi         bool;
  v_dias_consist    int;
  v_checkin_hoje    bool;
  v_checkin_media   numeric;
BEGIN
  -- Treinos na semana (0–40 pts)
  SELECT COUNT(*) INTO v_treinos_semana
  FROM workout_executions
  WHERE athlete_id = p_athlete_id
    AND workout_date >= now() - interval '7 days'
    AND status = 'completed';
  v_score := v_score + LEAST(40, v_treinos_semana * 10);

  -- Avaliação (0–20 pts)
  SELECT EXISTS(
    SELECT 1 FROM avaliacoes_unificadas WHERE athlete_id = p_athlete_id
  ) INTO v_tem_avaliacao;
  IF v_tem_avaliacao THEN v_score := v_score + 20; END IF;

  -- Plano ativo (0–20 pts)
  SELECT EXISTS(
    SELECT 1 FROM planos_de_treino_gerados
    WHERE athlete_id = p_athlete_id AND status = 'active'
  ) INTO v_tem_plano;
  IF v_tem_plano THEN v_score := v_score + 20; END IF;

  -- PDI calibrado (0–10 pts)
  SELECT EXISTS(
    SELECT 1 FROM athlete_pdi_history WHERE athlete_id = p_athlete_id
  ) INTO v_tem_pdi;
  IF v_tem_pdi THEN v_score := v_score + 10; END IF;

  -- Consistência 30 dias (0–10 pts)
  SELECT COUNT(DISTINCT workout_date) INTO v_dias_consist
  FROM workout_executions
  WHERE athlete_id = p_athlete_id
    AND workout_date >= now() - interval '30 days';
  v_score := v_score + LEAST(10, v_dias_consist);

  -- Daily Protocol checkin hoje (0–10 pts BÔNUS)
  -- Média das respostas (sono+energia+alimentação) normalizada
  SELECT 
    EXISTS(SELECT 1 FROM daily_checkins WHERE athlete_id = p_athlete_id AND checkin_date = CURRENT_DATE),
    AVG((COALESCE(sono,3) + COALESCE(energia,3) + COALESCE(alimentacao,3)) / 3.0)
  INTO v_checkin_hoje, v_checkin_media
  FROM daily_checkins
  WHERE athlete_id = p_athlete_id
    AND checkin_date >= CURRENT_DATE - 7;

  IF v_checkin_hoje THEN
    v_score := v_score + LEAST(10, ROUND(COALESCE(v_checkin_media, 3) * 2)::int);
  END IF;

  -- Garante 0–100
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Persiste
  UPDATE athletes SET sync_score = v_score WHERE id = p_athlete_id;

  RETURN v_score;
END;
$$;

-- Corrige fn_get_athlete_scores para sempre recalcular em tempo real
CREATE OR REPLACE FUNCTION public.fn_get_athlete_scores(p_athlete_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_sync      int;
  v_xp        int;
  v_level     int;
  v_radar     jsonb;
BEGIN
  -- Recalcula sync em tempo real
  v_sync := calcular_sync_score_real(p_athlete_id);

  -- XP e level
  SELECT COALESCE(total_xp, 0), COALESCE(level, 1)
  INTO v_xp, v_level
  FROM athletes WHERE id = p_athlete_id;

  -- Radar 5D via view se existir, senão zeros
  BEGIN
    SELECT to_jsonb(r) INTO v_radar
    FROM vw_radar_5d r WHERE athlete_id = p_athlete_id;
  EXCEPTION WHEN OTHERS THEN
    v_radar := '{"forca":0,"resistencia":0,"core":0,"cardio":0,"mobilidade":0,"global":0}'::jsonb;
  END;

  IF v_radar IS NULL THEN
    v_radar := '{"forca":0,"resistencia":0,"core":0,"cardio":0,"mobilidade":0,"global":0}'::jsonb;
  END IF;

  RETURN json_build_object(
    'sync_score', v_sync,
    'total_xp',   v_xp,
    'level',      v_level,
    'radar',      v_radar
  );
END;
$$;

-- Trigger: recalcula sync após checkin diário
CREATE OR REPLACE FUNCTION public.fn_on_checkin_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM calcular_sync_score_real(NEW.athlete_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_sync_on_checkin ON daily_checkins;
CREATE TRIGGER trg_recalc_sync_on_checkin
  AFTER INSERT OR UPDATE ON daily_checkins
  FOR EACH ROW EXECUTE FUNCTION fn_on_checkin_created();
;
