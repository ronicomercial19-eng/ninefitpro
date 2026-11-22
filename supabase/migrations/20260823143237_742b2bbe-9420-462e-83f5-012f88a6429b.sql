CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id text REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  amount numeric,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id, status);

GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own subscriptions select" ON public.user_subscriptions;
CREATE POLICY "own subscriptions select" ON public.user_subscriptions
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "own subscriptions insert" ON public.user_subscriptions;
CREATE POLICY "own subscriptions insert" ON public.user_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "own subscriptions update" ON public.user_subscriptions;
CREATE POLICY "own subscriptions update" ON public.user_subscriptions
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));;
