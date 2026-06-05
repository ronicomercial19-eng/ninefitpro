
-- POSTURA_SCANS
CREATE TABLE public.postura_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  athlete_id uuid,
  front_url text,
  back_url text,
  left_url text,
  right_url text,
  status text NOT NULL DEFAULT 'pending', -- pending|processing|done|failed
  result jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.postura_scans TO authenticated;
GRANT ALL ON public.postura_scans TO service_role;
ALTER TABLE public.postura_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own scans" ON public.postura_scans
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id OR public.is_trainer((select auth.uid())));
CREATE POLICY "users insert own scans" ON public.postura_scans
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "trainers update scans" ON public.postura_scans
  FOR UPDATE TO authenticated USING (public.is_trainer((select auth.uid())) OR (select auth.uid()) = user_id);
CREATE TRIGGER postura_scans_updated BEFORE UPDATE ON public.postura_scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SHARE_EVENTS
CREATE TABLE public.share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel text NOT NULL, -- whatsapp|copy|native|instagram
  content_type text NOT NULL, -- workout|progress|achievement|store|plan
  content_id text,
  reward_xp integer NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.share_events TO authenticated;
GRANT ALL ON public.share_events TO service_role;
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own shares" ON public.share_events
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "users insert shares" ON public.share_events
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
