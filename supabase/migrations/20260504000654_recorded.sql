-- ============================================
-- source_sync_logs
-- ============================================
CREATE TABLE IF NOT EXISTS public.source_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('manual','fitpro','periodizer','wearables')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_sync_logs_aluno ON public.source_sync_logs(aluno_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_sync_logs_source ON public.source_sync_logs(source, synced_at DESC);

ALTER TABLE public.source_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno vê seus próprios logs"
  ON public.source_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.alunos a
      WHERE a.id = source_sync_logs.aluno_id
        AND a.email = public.current_user_email()
    )
  );

CREATE POLICY "Professor/Admin vê logs dos seus alunos"
  ON public.source_sync_logs FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR public.is_professor(auth.uid())
  );

-- ============================================
-- aluno_score_composite
-- ============================================
CREATE TABLE IF NOT EXISTS public.aluno_score_composite (
  aluno_id UUID PRIMARY KEY REFERENCES public.alunos(id) ON DELETE CASCADE,
  score_manual NUMERIC NOT NULL DEFAULT 0,
  score_fitpro NUMERIC NOT NULL DEFAULT 0,
  score_periodizer NUMERIC NOT NULL DEFAULT 0,
  score_wearables NUMERIC NOT NULL DEFAULT 0,
  score_normalized NUMERIC NOT NULL DEFAULT 0,
  active_sources TEXT[] NOT NULL DEFAULT ARRAY['manual']::TEXT[],
  stagnation_flag BOOLEAN NOT NULL DEFAULT false,
  churn_risk TEXT NOT NULL DEFAULT 'baixo' CHECK (churn_risk IN ('baixo','medio','alto')),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.aluno_score_composite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aluno vê seu próprio score composto"
  ON public.aluno_score_composite FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.alunos a
      WHERE a.id = aluno_score_composite.aluno_id
        AND a.email = public.current_user_email()
    )
  );

CREATE POLICY "Professor/Admin vê scores"
  ON public.aluno_score_composite FOR SELECT
  USING (
    public.is_admin(auth.uid())
    OR public.is_professor(auth.uid())
  );

CREATE TRIGGER trg_aluno_score_composite_updated_at
  BEFORE UPDATE ON public.aluno_score_composite
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- recalculate_composite_score(aluno_id)
-- ============================================
CREATE OR REPLACE FUNCTION public.recalculate_composite_score(p_aluno_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score_manual NUMERIC := 0;
  v_score_fitpro NUMERIC := 0;
  v_score_periodizer NUMERIC := 0;
  v_score_wearables NUMERIC := 0;
  v_active TEXT[] := ARRAY[]::TEXT[];
  v_max_possible NUMERIC := 0;
  v_total NUMERIC := 0;
  v_normalized NUMERIC := 0;
  v_stagnation BOOLEAN := false;
  v_churn TEXT := 'baixo';
  v_last_manual_date DATE;
  v_last_sync_date TIMESTAMPTZ;
  v_days_inactive INT;
  v_recent_score NUMERIC;
  v_prev_score NUMERIC;
  v_fitpro_count INT;
  v_periodizer_adherence NUMERIC;
  v_wearables_recovery NUMERIC;
BEGIN
  -- MANUAL (0-20): última avaliação score_global / 5
  SELECT COALESCE(score_global, 0) / 5.0, data_avaliacao
    INTO v_score_manual, v_last_manual_date
  FROM public.avaliacoes_unificadas
  WHERE aluno_id = p_aluno_id
  ORDER BY data_avaliacao DESC
  LIMIT 1;

  IF v_score_manual IS NULL THEN v_score_manual := 0; END IF;
  IF v_score_manual > 0 THEN
    v_active := array_append(v_active, 'manual');
    v_max_possible := v_max_possible + 20;
  END IF;

  -- FITPRO (0-25): aderência últimos 30 dias
  SELECT COUNT(*) INTO v_fitpro_count
  FROM public.source_sync_logs
  WHERE aluno_id = p_aluno_id
    AND source = 'fitpro'
    AND synced_at > now() - INTERVAL '30 days';

  IF v_fitpro_count > 0 THEN
    -- 12 treinos/mês = 100% (25 pts)
    v_score_fitpro := LEAST(25, (v_fitpro_count::NUMERIC / 12.0) * 25);
    v_active := array_append(v_active, 'fitpro');
    v_max_possible := v_max_possible + 25;
  END IF;

  -- PERIODIZER (0-25): aderência média
  SELECT AVG((payload->>'adherence_pct')::NUMERIC) INTO v_periodizer_adherence
  FROM public.source_sync_logs
  WHERE aluno_id = p_aluno_id
    AND source = 'periodizer'
    AND synced_at > now() - INTERVAL '60 days'
    AND payload ? 'adherence_pct';

  IF v_periodizer_adherence IS NOT NULL THEN
    v_score_periodizer := LEAST(25, (v_periodizer_adherence / 100.0) * 25);
    v_active := array_append(v_active, 'periodizer');
    v_max_possible := v_max_possible + 25;
  END IF;

  -- WEARABLES (0-30): índice de recuperação
  SELECT AVG(
    LEAST(100, GREATEST(0,
      COALESCE((payload->>'sleep_score')::NUMERIC, 50) * 0.4 +
      COALESCE((payload->>'hrv')::NUMERIC, 50) * 0.6
    ))
  ) INTO v_wearables_recovery
  FROM public.source_sync_logs
  WHERE aluno_id = p_aluno_id
    AND source = 'wearables'
    AND synced_at > now() - INTERVAL '7 days';

  IF v_wearables_recovery IS NOT NULL THEN
    v_score_wearables := LEAST(30, (v_wearables_recovery / 100.0) * 30);
    v_active := array_append(v_active, 'wearables');
    v_max_possible := v_max_possible + 30;
  END IF;

  -- Garante manual mínimo
  IF array_length(v_active, 1) IS NULL THEN
    v_active := ARRAY['manual']::TEXT[];
    v_max_possible := 20;
  END IF;

  v_total := v_score_manual + v_score_fitpro + v_score_periodizer + v_score_wearables;
  IF v_max_possible > 0 THEN
    v_normalized := ROUND((v_total / v_max_possible) * 100, 1);
  END IF;

  -- Estagnação: comparar últimos 2 manuais
  SELECT score_global INTO v_recent_score
  FROM public.avaliacoes_unificadas
  WHERE aluno_id = p_aluno_id
  ORDER BY data_avaliacao DESC LIMIT 1;

  SELECT score_global INTO v_prev_score
  FROM public.avaliacoes_unificadas
  WHERE aluno_id = p_aluno_id
  ORDER BY data_avaliacao DESC OFFSET 1 LIMIT 1;

  IF v_recent_score IS NOT NULL AND v_prev_score IS NOT NULL AND v_prev_score > 0 THEN
    IF ABS((v_recent_score - v_prev_score) / v_prev_score) < 0.05 THEN
      v_stagnation := true;
    END IF;
  END IF;

  -- Churn risk: dias sem sync
  SELECT MAX(synced_at) INTO v_last_sync_date
  FROM public.source_sync_logs
  WHERE aluno_id = p_aluno_id;

  IF v_last_sync_date IS NULL AND v_last_manual_date IS NULL THEN
    v_churn := 'alto';
  ELSE
    v_days_inactive := EXTRACT(DAY FROM now() - GREATEST(
      COALESCE(v_last_sync_date, '1970-01-01'::TIMESTAMPTZ),
      COALESCE(v_last_manual_date::TIMESTAMPTZ, '1970-01-01'::TIMESTAMPTZ)
    ))::INT;
    IF v_days_inactive > 30 THEN v_churn := 'alto';
    ELSIF v_days_inactive > 14 THEN v_churn := 'medio';
    ELSE v_churn := 'baixo';
    END IF;
  END IF;

  INSERT INTO public.aluno_score_composite (
    aluno_id, score_manual, score_fitpro, score_periodizer, score_wearables,
    score_normalized, active_sources, stagnation_flag, churn_risk, last_calculated_at, updated_at
  ) VALUES (
    p_aluno_id, v_score_manual, v_score_fitpro, v_score_periodizer, v_score_wearables,
    v_normalized, v_active, v_stagnation, v_churn, now(), now()
  )
  ON CONFLICT (aluno_id) DO UPDATE SET
    score_manual = EXCLUDED.score_manual,
    score_fitpro = EXCLUDED.score_fitpro,
    score_periodizer = EXCLUDED.score_periodizer,
    score_wearables = EXCLUDED.score_wearables,
    score_normalized = EXCLUDED.score_normalized,
    active_sources = EXCLUDED.active_sources,
    stagnation_flag = EXCLUDED.stagnation_flag,
    churn_risk = EXCLUDED.churn_risk,
    last_calculated_at = now(),
    updated_at = now();
END;
$$;;
