CREATE TABLE IF NOT EXISTS public.zap_webhook_events (
  event_id text PRIMARY KEY,
  event_type text,
  payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT ALL ON public.zap_webhook_events TO service_role;
ALTER TABLE public.zap_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.zap_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);