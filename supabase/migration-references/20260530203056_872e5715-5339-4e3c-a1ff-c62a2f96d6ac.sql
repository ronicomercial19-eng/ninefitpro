
-- Wave 21 / Onda A — FitPro V3 schema (skills, nexus, monetization, connectors, protocols)

-- =====================================================================
-- 1. SKILLS ENGINE
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  tags text[] NOT NULL DEFAULT '{}',
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{"usage":0,"retention":0,"completion":0,"engagement":0,"rating":0}'::jsonb,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.skills TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills readable to all auth" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "skills readable to anon (active only)" ON public.skills FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "skills writable by trainer/admin" ON public.skills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'trainer') OR owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'trainer') OR owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.skill_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'global' CHECK (scope IN ('global','trainer','student')),
  target_id uuid,
  active boolean NOT NULL DEFAULT true,
  activated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_skill_activations_skill ON public.skill_activations(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_activations_target ON public.skill_activations(target_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_activations TO authenticated;
GRANT ALL ON public.skill_activations TO service_role;
ALTER TABLE public.skill_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activations readable" ON public.skill_activations FOR SELECT TO authenticated USING (true);
CREATE POLICY "activations writable by trainer/admin" ON public.skill_activations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'trainer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'trainer'));

CREATE TABLE IF NOT EXISTS public.skill_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('view','start','complete','rate','abandon')),
  value numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_skill_events_skill ON public.skill_events(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_events_user ON public.skill_events(user_id);
GRANT SELECT, INSERT ON public.skill_events TO authenticated;
GRANT ALL ON public.skill_events TO service_role;
ALTER TABLE public.skill_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skill_events insert own" ON public.skill_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "skill_events read own or staff" ON public.skill_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'trainer'));

-- =====================================================================
-- 2. MONETIZATION OFFERS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.monetization_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'prime',
  checkout_url text,
  iframe_url text,
  thumbnail_url text,
  plan_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  priority int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.monetization_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monetization_offers TO authenticated;
GRANT ALL ON public.monetization_offers TO service_role;
ALTER TABLE public.monetization_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers readable" ON public.monetization_offers FOR SELECT USING (status = 'active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "offers writable by admin" ON public.monetization_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================================
-- 3. API CONNECTORS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.api_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  provider text NOT NULL,
  endpoint text,
  auth_mode text NOT NULL DEFAULT 'none' CHECK (auth_mode IN ('none','apikey','oauth','iframe_sso')),
  iframe_url text,
  permissions text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
  secret_ref text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.api_connectors TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.api_connectors TO authenticated;
GRANT ALL ON public.api_connectors TO service_role;
ALTER TABLE public.api_connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connectors readable" ON public.api_connectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "connectors writable by admin" ON public.api_connectors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================================
-- 4. BIOHACKER PROTOCOLS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.biohacker_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('sleep','recovery','energy','performance')),
  name text NOT NULL,
  description text,
  hero_image text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  skill_id uuid REFERENCES public.skills(id) ON DELETE SET NULL,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  duration_min int NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.biohacker_protocols TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.biohacker_protocols TO authenticated;
GRANT ALL ON public.biohacker_protocols TO service_role;
ALTER TABLE public.biohacker_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "protocols readable" ON public.biohacker_protocols FOR SELECT USING (status = 'active' OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'trainer'));
CREATE POLICY "protocols writable by trainer/admin" ON public.biohacker_protocols FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'trainer'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'trainer'));

-- =====================================================================
-- 5. PHYSIO MODULES (Grid Nativo do Ecossistema)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.physio_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  hero_image text,
  cta_label text NOT NULL DEFAULT 'Acessar',
  cta_route text,
  connector_key text,
  category text NOT NULL DEFAULT 'performance',
  display_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.physio_modules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.physio_modules TO authenticated;
GRANT ALL ON public.physio_modules TO service_role;
ALTER TABLE public.physio_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "physio readable" ON public.physio_modules FOR SELECT USING (status='active' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "physio writable by admin" ON public.physio_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================================
-- 6. ONBOARDING PROGRESS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'welcome',
  completed_steps text[] NOT NULL DEFAULT '{}',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_progress TO service_role;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding own row" ON public.onboarding_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- updated_at triggers
-- =====================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_skills_touch BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_offers_touch BEFORE UPDATE ON public.monetization_offers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_connectors_touch BEFORE UPDATE ON public.api_connectors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_protocols_touch BEFORE UPDATE ON public.biohacker_protocols FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_physio_touch BEFORE UPDATE ON public.physio_modules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_onboarding_touch BEFORE UPDATE ON public.onboarding_progress FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- Realtime
-- =====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.skills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.skill_activations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monetization_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_connectors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.biohacker_protocols;
ALTER PUBLICATION supabase_realtime ADD TABLE public.physio_modules;

-- =====================================================================
-- SEED: physio modules (Meu Ecossistema)
-- =====================================================================
INSERT INTO public.physio_modules (key, name, description, cta_label, cta_route, connector_key, category, display_order)
VALUES
 ('staff','Staff','Conectar com profissionais e agendar','Acessar','/9fit/staff','staff','performance',10),
 ('planejamento','Planejamento','Periodização científica e adaptativa','Acessar','/9fit/smart-periodizer','smart_periodizer','performance',20),
 ('ajuste_treino','Ajuste de Treino','SmartTreino ou IA adaptativa','Escolher','/9fit/train/ajuste',NULL,'performance',30),
 ('ron','Ron','Assistente com memória e autonomia','Conversar','/9fit/ron','ron','foco',40),
 ('progress','Progress','Avaliações e histórico de resultados','Ver progresso','/9fit/stats','progress','performance',50),
 ('store','Store','Produtos, suplementos, acessórios','Visitar','/9fit/store','store_9fit','nutricao',60),
 ('foods','Foods','Minha dieta ou 9Foods marketplace','Acessar','/9fit/foods','foods_9','nutricao',70),
 ('healthflix','HealthFlix','Conteúdo de treino e educação','Assistir','/9fit/healthflix','healthflix','foco',80),
 ('habitflow','HabitFlow','Construa hábitos sustentáveis','Acessar','/9fit/habitflow','habitflow','foco',90),
 ('zap','9Zap','Comunicação inteligente','Acessar','/9fit/zap','zap_9','foco',100),
 ('events','Events','Eventos e workshops','Ver eventos','/9fit/events','events','performance',110)
ON CONFLICT (key) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description, cta_label=EXCLUDED.cta_label,
  cta_route=EXCLUDED.cta_route, connector_key=EXCLUDED.connector_key,
  category=EXCLUDED.category, display_order=EXCLUDED.display_order;

-- =====================================================================
-- SEED: api connectors (placeholders, admin completa depois)
-- =====================================================================
INSERT INTO public.api_connectors (key, provider, auth_mode, status) VALUES
 ('9pay','9Pay','iframe_sso','pending'),
 ('staff','Staff Container','iframe_sso','pending'),
 ('smart_periodizer','Smart Periodizer','iframe_sso','pending'),
 ('ron','Ron Brain','apikey','pending'),
 ('progress','Progress Tracker','apikey','pending'),
 ('store_9fit','9FIT Ecommerce','iframe_sso','pending'),
 ('foods_9','9Foods','apikey','pending'),
 ('healthflix','HealthFlix','iframe_sso','pending'),
 ('habitflow','HabitFlow','iframe_sso','pending'),
 ('zap_9','9Zap','apikey','pending'),
 ('events','StaffEventsHub','iframe_sso','pending')
ON CONFLICT (key) DO NOTHING;
