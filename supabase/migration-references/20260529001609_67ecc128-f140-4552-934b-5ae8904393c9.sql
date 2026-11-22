-- Wave 14/16/17: RON v9 memory + Adaptive State + Activation + Monetization

CREATE EXTENSION IF NOT EXISTS vector;

-- ============ RON Long-term Memory ============
CREATE TABLE IF NOT EXISTS public.ron_long_term_memories (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN
    ('fact','preference','injury','goal','insight','adaptation','session_summary','limitation')),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  importance_score FLOAT DEFAULT 0.7 CHECK (importance_score BETWEEN 0 AND 1),
  last_accessed TIMESTAMPTZ DEFAULT now(),
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ron_mem_user_idx ON public.ron_long_term_memories(user_id, importance_score DESC);
CREATE INDEX IF NOT EXISTS ron_mem_embed_idx ON public.ron_long_term_memories
  USING hnsw (embedding vector_cosine_ops);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ron_long_term_memories TO authenticated;
GRANT ALL ON public.ron_long_term_memories TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ron_long_term_memories_id_seq TO authenticated, service_role;
ALTER TABLE public.ron_long_term_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ron_mem_own" ON public.ron_long_term_memories;
CREATE POLICY "ron_mem_own" ON public.ron_long_term_memories
  FOR ALL USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- ============ Sync Score Logs ============
CREATE TABLE IF NOT EXISTS public.sync_score_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  score NUMERIC(4,2) NOT NULL,
  feedback_text TEXT,
  inferred_state TEXT CHECK (inferred_state IN ('power','low','balanced')),
  consistency_pct NUMERIC,
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sync_logs_user_date_idx ON public.sync_score_logs(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_score_logs TO authenticated;
GRANT ALL ON public.sync_score_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sync_score_logs_id_seq TO authenticated, service_role;
ALTER TABLE public.sync_score_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync_logs_own" ON public.sync_score_logs;
CREATE POLICY "sync_logs_own" ON public.sync_score_logs
  FOR ALL USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- ============ Activation Events ============
CREATE TABLE IF NOT EXISTS public.activation_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, event_key)
);
CREATE INDEX IF NOT EXISTS activation_user_idx ON public.activation_events(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activation_events TO authenticated;
GRANT ALL ON public.activation_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.activation_events_id_seq TO authenticated, service_role;
ALTER TABLE public.activation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activation_own" ON public.activation_events;
CREATE POLICY "activation_own" ON public.activation_events
  FOR ALL USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- ============ Subscription Plans ============
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  features JSONB DEFAULT '[]'::jsonb,
  is_recommended BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_public_read" ON public.subscription_plans;
CREATE POLICY "plans_public_read" ON public.subscription_plans FOR SELECT USING (true);

INSERT INTO public.subscription_plans (id, name, tagline, price_monthly, price_yearly, features, is_recommended, display_order)
VALUES
  ('starter','STARTER','Comece a sentir a diferença', 0, 0,
    '["Avaliação básica inicial","Plano de treino limitado","Conteúdo introdutório","FitCopilot leve"]'::jsonb, false, 1),
  ('pro','PRO','Para quem leva a sério', 59, 540,
    '["Periodização completa (SmartPeriodizer)","Hubs principais (TRAIN, HUB, Progress)","Avaliações avançadas","IA básica + maioria dos protocolos"]'::jsonb, false, 2),
  ('prime','PRIME','Longevita PrimePass — Alta performance', 149, 1490,
    '["Tudo do PRO","Agentes IA completos (RON v9)","Protocolos premium exclusivos","Comunidade + streaming exclusivo","Smartwatch full + prioridade + eventos"]'::jsonb, true, 3)
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, tagline=EXCLUDED.tagline,
  price_monthly=EXCLUDED.price_monthly, price_yearly=EXCLUDED.price_yearly,
  features=EXCLUDED.features, is_recommended=EXCLUDED.is_recommended,
  display_order=EXCLUDED.display_order;

-- ============ Monetization Events ============
CREATE TABLE IF NOT EXISTS public.monetization_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  plan_id TEXT,
  context TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS monet_user_idx ON public.monetization_events(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.monetization_events TO authenticated;
GRANT ALL ON public.monetization_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.monetization_events_id_seq TO authenticated, service_role;
ALTER TABLE public.monetization_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monet_insert_own" ON public.monetization_events;
CREATE POLICY "monet_insert_own" ON public.monetization_events
  FOR INSERT WITH CHECK (user_id = (select auth.uid()) OR user_id IS NULL);

DROP POLICY IF EXISTS "monet_read_own" ON public.monetization_events;
CREATE POLICY "monet_read_own" ON public.monetization_events
  FOR SELECT USING (user_id = (select auth.uid()));