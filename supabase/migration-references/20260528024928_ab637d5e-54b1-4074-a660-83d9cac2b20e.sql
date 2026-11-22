
CREATE TABLE IF NOT EXISTS public.bio_hrv_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  hrv_ms numeric NOT NULL,
  source text DEFAULT 'manual',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bio_hrv_user_time ON public.bio_hrv_logs(user_id, recorded_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_hrv_logs TO authenticated;
GRANT ALL ON public.bio_hrv_logs TO service_role;
ALTER TABLE public.bio_hrv_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hrv_own" ON public.bio_hrv_logs;
CREATE POLICY "hrv_own" ON public.bio_hrv_logs FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.bio_heart_rate_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  bpm integer NOT NULL,
  context text DEFAULT 'rest',
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bio_hr_user_time ON public.bio_heart_rate_logs(user_id, recorded_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_heart_rate_logs TO authenticated;
GRANT ALL ON public.bio_heart_rate_logs TO service_role;
ALTER TABLE public.bio_heart_rate_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hr_own" ON public.bio_heart_rate_logs;
CREATE POLICY "hr_own" ON public.bio_heart_rate_logs FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.bio_sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sleep_date date NOT NULL,
  duration_min integer,
  quality_score integer,
  deep_min integer,
  rem_min integer,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, sleep_date)
);
CREATE INDEX IF NOT EXISTS idx_bio_sleep_user_date ON public.bio_sleep_logs(user_id, sleep_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_sleep_logs TO authenticated;
GRANT ALL ON public.bio_sleep_logs TO service_role;
ALTER TABLE public.bio_sleep_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sleep_own" ON public.bio_sleep_logs;
CREATE POLICY "sleep_own" ON public.bio_sleep_logs FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.bio_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  steps integer DEFAULT 0,
  calories numeric DEFAULT 0,
  distance_m numeric DEFAULT 0,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bio_act_user_time ON public.bio_activity_logs(user_id, recorded_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_activity_logs TO authenticated;
GRANT ALL ON public.bio_activity_logs TO service_role;
ALTER TABLE public.bio_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "act_own" ON public.bio_activity_logs;
CREATE POLICY "act_own" ON public.bio_activity_logs FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.bio_recovery_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  recovery_score integer,
  nervous_system text DEFAULT 'balanced',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bio_rec_user_time ON public.bio_recovery_state(user_id, evaluated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_recovery_state TO authenticated;
GRANT ALL ON public.bio_recovery_state TO service_role;
ALTER TABLE public.bio_recovery_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rec_own" ON public.bio_recovery_state;
CREATE POLICY "rec_own" ON public.bio_recovery_state FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.ai_context_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  sync_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_ctx_user_time ON public.ai_context_snapshots(user_id, captured_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_context_snapshots TO authenticated;
GRANT ALL ON public.ai_context_snapshots TO service_role;
ALTER TABLE public.ai_context_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ctx_own" ON public.ai_context_snapshots;
CREATE POLICY "ctx_own" ON public.ai_context_snapshots FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_ins_user_time ON public.ai_insights(user_id, generated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;
GRANT ALL ON public.ai_insights TO service_role;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ins_own" ON public.ai_insights;
CREATE POLICY "ins_own" ON public.ai_insights FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.proactive_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trigger_id text NOT NULL,
  fired_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proev_user_time ON public.proactive_events(user_id, fired_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proactive_events TO authenticated;
GRANT ALL ON public.proactive_events TO service_role;
ALTER TABLE public.proactive_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "proev_own" ON public.proactive_events;
CREATE POLICY "proev_own" ON public.proactive_events FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.profile_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phist_user_time ON public.profile_history(user_id, snapshot_at DESC);
GRANT SELECT, INSERT ON public.profile_history TO authenticated;
GRANT ALL ON public.profile_history TO service_role;
ALTER TABLE public.profile_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "phist_own_read" ON public.profile_history;
CREATE POLICY "phist_own_read" ON public.profile_history FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.snapshot_profile_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profile_history (user_id, snapshot)
  VALUES (OLD.user_id, to_jsonb(OLD));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profile_history ON public.profiles;
CREATE TRIGGER trg_profile_history
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.snapshot_profile_history();

CREATE OR REPLACE VIEW public.v_unified_users
WITH (security_invoker = true) AS
SELECT
  p.user_id,
  p.email,
  p.full_name,
  p.role,
  p.status,
  a.id AS athlete_id,
  a.coach_id,
  a.onboarding_completed_at,
  a.password_changed,
  upe.experience_level,
  upe.training_environment,
  upe.primary_goal
FROM public.profiles p
LEFT JOIN public.athletes a ON a.user_id = p.user_id
LEFT JOIN public.user_profiles_extended upe ON upe.user_id = p.user_id;

GRANT SELECT ON public.v_unified_users TO authenticated;

COMMENT ON TABLE public.bio_hrv_logs IS 'domain:bio';
COMMENT ON TABLE public.bio_heart_rate_logs IS 'domain:bio';
COMMENT ON TABLE public.bio_sleep_logs IS 'domain:bio';
COMMENT ON TABLE public.bio_activity_logs IS 'domain:bio';
COMMENT ON TABLE public.bio_recovery_state IS 'domain:bio';
COMMENT ON TABLE public.ai_context_snapshots IS 'domain:ai';
COMMENT ON TABLE public.ai_insights IS 'domain:ai';
COMMENT ON TABLE public.proactive_events IS 'domain:ai';
COMMENT ON TABLE public.profile_history IS 'domain:identity';
