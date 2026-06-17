
-- Enums
DO $$ BEGIN
  CREATE TYPE public.pdi_recovery_rate AS ENUM ('fast','medium','slow');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.pdi_peak_window AS ENUM ('morning','afternoon','night');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.pdi_goal AS ENUM ('performance','aesthetics','longevity','recomposition');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.pdi_discomfort AS ENUM ('aggressive','moderate','conservative');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.user_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  recovery_rate public.pdi_recovery_rate DEFAULT 'medium',
  volume_tolerance int CHECK (volume_tolerance BETWEEN 1 AND 10) DEFAULT 5,
  peak_window public.pdi_peak_window DEFAULT 'morning',
  injury_zones text[] DEFAULT '{}',
  consistency_30d numeric DEFAULT 0,
  stress_sensitivity int CHECK (stress_sensitivity BETWEEN 1 AND 10) DEFAULT 5,
  goal public.pdi_goal DEFAULT 'performance',
  time_horizon int DEFAULT 12,
  discomfort_tolerance public.pdi_discomfort DEFAULT 'moderate',
  base_location_sp text,
  dietary_restrictions text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_parameters TO authenticated;
GRANT ALL ON public.user_parameters TO service_role;

ALTER TABLE public.user_parameters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_parameters_select_own" ON public.user_parameters;
CREATE POLICY "user_parameters_select_own" ON public.user_parameters
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "user_parameters_insert_own" ON public.user_parameters;
CREATE POLICY "user_parameters_insert_own" ON public.user_parameters
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "user_parameters_update_own" ON public.user_parameters;
CREATE POLICY "user_parameters_update_own" ON public.user_parameters
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.tg_user_parameters_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS user_parameters_updated_at ON public.user_parameters;
CREATE TRIGGER user_parameters_updated_at BEFORE UPDATE ON public.user_parameters
  FOR EACH ROW EXECUTE FUNCTION public.tg_user_parameters_updated_at();

-- Relative thresholds (percentile 33/66 of last 30 sync_score_logs)
CREATE OR REPLACE FUNCTION public.fn_compute_user_thresholds(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p33 numeric; p66 numeric; n int;
BEGIN
  SELECT count(*) INTO n FROM public.sync_score_logs
    WHERE user_id = p_user_id AND created_at >= now() - interval '30 days';
  IF n < 5 THEN
    RETURN jsonb_build_object('low', 40, 'mid', 60, 'high', 80, 'n', n, 'mode', 'cold_start');
  END IF;
  SELECT
    percentile_disc(0.33) WITHIN GROUP (ORDER BY score),
    percentile_disc(0.66) WITHIN GROUP (ORDER BY score)
  INTO p33, p66
  FROM public.sync_score_logs
  WHERE user_id = p_user_id AND created_at >= now() - interval '30 days';
  RETURN jsonb_build_object('low', p33, 'mid', (p33+p66)/2.0, 'high', p66, 'n', n, 'mode', 'personal');
END $$;

GRANT EXECUTE ON FUNCTION public.fn_compute_user_thresholds(uuid) TO authenticated, service_role;

-- Auto-refresh consistency_30d on check-in
CREATE OR REPLACE FUNCTION public.fn_refresh_consistency_30d()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid; v_pct numeric;
BEGIN
  v_user := NEW.user_id;
  IF v_user IS NULL THEN RETURN NEW; END IF;
  SELECT (count(DISTINCT date_trunc('day', created_at)) * 100.0 / 30.0)
    INTO v_pct
  FROM public.ninefit_checkins
  WHERE user_id = v_user AND created_at >= now() - interval '30 days';
  INSERT INTO public.user_parameters (user_id, consistency_30d)
    VALUES (v_user, COALESCE(v_pct,0))
    ON CONFLICT (user_id) DO UPDATE SET consistency_30d = EXCLUDED.consistency_30d, updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_refresh_consistency_30d ON public.ninefit_checkins;
CREATE TRIGGER tg_refresh_consistency_30d AFTER INSERT ON public.ninefit_checkins
  FOR EACH ROW EXECUTE FUNCTION public.fn_refresh_consistency_30d();
