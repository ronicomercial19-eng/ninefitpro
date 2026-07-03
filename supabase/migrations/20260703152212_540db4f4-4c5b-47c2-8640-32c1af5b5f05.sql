-- ============================================================
-- Rodada 2: correções dos 3 bloqueadores residuais
-- ============================================================

-- 1) get_athlete_scores retorna o formato esperado pelo frontend
--    {sync_score, treino, nutri, sono, mob, hidr, updated_at}
DROP FUNCTION IF EXISTS public.get_athlete_scores(uuid);

CREATE OR REPLACE FUNCTION public.get_athlete_scores(p_athlete_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_radar record;
  v_sync numeric := 0;
  v_updated timestamptz := now();
BEGIN
  SELECT eixo_treino, eixo_nutri, eixo_sono, eixo_recovery, eixo_hrv
    INTO v_radar
    FROM public.vw_radar_5d
   WHERE athlete_id = p_athlete_id;

  -- sync_score: prioriza score_normalized (composite), fallback = média dos 5 eixos
  SELECT COALESCE(score_normalized, 0), COALESCE(updated_at, now())
    INTO v_sync, v_updated
    FROM public.aluno_score_composite
   WHERE aluno_id = p_athlete_id
   ORDER BY updated_at DESC
   LIMIT 1;

  IF v_sync IS NULL OR v_sync = 0 THEN
    v_sync := ROUND(
      ( COALESCE(LEAST(v_radar.eixo_treino * 25, 100), 0)
      + COALESCE(LEAST(v_radar.eixo_nutri * 5,  100), 0)
      + COALESCE(v_radar.eixo_sono, 0)
      + COALESCE(v_radar.eixo_recovery, 0)
      + COALESCE(v_radar.eixo_hrv, 0)
      ) / 5.0
    );
  END IF;

  RETURN jsonb_build_object(
    'sync_score', COALESCE(v_sync, 0),
    'treino',     COALESCE(LEAST(v_radar.eixo_treino * 25, 100), 0),
    'nutri',      COALESCE(LEAST(v_radar.eixo_nutri * 5,  100), 0),
    'sono',       COALESCE(v_radar.eixo_sono, 0),
    'mob',        COALESCE(v_radar.eixo_recovery, 0),
    'hidr',       COALESCE(v_radar.eixo_hrv, 0),
    'updated_at', v_updated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_athlete_scores(uuid) TO authenticated, anon, service_role;

-- 2) Trigger para inserir em sync_score_logs quando houver atividade
--    força evento Realtime que o hook useAthleteScores escuta
CREATE OR REPLACE FUNCTION public.fn_log_sync_score_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athlete uuid;
  v_source text := TG_ARGV[0];
BEGIN
  v_athlete := COALESCE(NEW.athlete_id, NULL);
  IF v_athlete IS NULL THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.sync_score_logs (athlete_id, source, metadata, created_at)
    VALUES (v_athlete, v_source, to_jsonb(NEW), now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_score_from_workout ON public.workout_executions;
CREATE TRIGGER trg_sync_score_from_workout
AFTER INSERT OR UPDATE ON public.workout_executions
FOR EACH ROW EXECUTE FUNCTION public.fn_log_sync_score_event('workout_execution');

DROP TRIGGER IF EXISTS trg_sync_score_from_checkin ON public.ninefit_checkins;
CREATE TRIGGER trg_sync_score_from_checkin
AFTER INSERT OR UPDATE ON public.ninefit_checkins
FOR EACH ROW EXECUTE FUNCTION public.fn_log_sync_score_event('checkin');

-- 3) Garantir realtime em daily_workouts (para WorkoutExecution reagir a ajustes)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_workouts;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;