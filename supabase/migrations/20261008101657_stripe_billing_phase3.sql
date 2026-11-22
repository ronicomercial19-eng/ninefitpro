CREATE TABLE public.stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stripe_customers TO authenticated;
GRANT ALL ON public.stripe_customers TO service_role;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc read own" ON public.stripe_customers FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.stripe_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_price_id text,
  status text NOT NULL,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  plan text NOT NULL DEFAULT 'primepass_monthly',
  amount_cents integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stripe_subscriptions TO authenticated;
GRANT ALL ON public.stripe_subscriptions TO service_role;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ss read own" ON public.stripe_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_stripe_sub_user ON public.stripe_subscriptions(user_id);

-- Revenue visible to admins for the dashboard (MRR card etc.)
CREATE POLICY "ss read admin" ON public.stripe_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ae insert own" ON public.analytics_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "ae read admin" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_analytics_events_type_date ON public.analytics_events(event_type, created_at DESC);;
