
-- 1. Add annual_plan_id to athlete_periodizations
ALTER TABLE public.athlete_periodizations
ADD COLUMN IF NOT EXISTS annual_plan_id uuid REFERENCES public.periodization_annual_plans(id);

-- 2. Create api_access_logs table
CREATE TABLE IF NOT EXISTS public.api_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  api_key_hash text,
  athlete_id uuid,
  response_status int,
  request_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.api_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view api logs"
ON public.api_access_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert api logs"
ON public.api_access_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
;
