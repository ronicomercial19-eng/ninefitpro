CREATE TABLE public.strava_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id bigint NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz
);
GRANT SELECT ON public.strava_connections TO authenticated;
GRANT ALL ON public.strava_connections TO service_role;
ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc read own" ON public.strava_connections FOR SELECT TO authenticated USING (user_id = auth.uid());
-- tokens are only ever written by the service role (edge functions), never directly by clients.

CREATE TABLE public.strava_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strava_id bigint NOT NULL UNIQUE,
  activity_type text,
  name text,
  distance_km numeric,
  moving_time_s integer,
  elevation_gain_m numeric,
  start_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.strava_activities TO authenticated;
GRANT ALL ON public.strava_activities TO service_role;
ALTER TABLE public.strava_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa read own" ON public.strava_activities FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_strava_activities_user ON public.strava_activities(user_id, start_date DESC);

CREATE OR REPLACE FUNCTION public.strava_is_connected(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.strava_connections WHERE user_id = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.strava_is_connected(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.strava_is_connected(uuid) TO authenticated;;
