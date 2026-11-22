
-- Master Registry (Banco Supremo)
CREATE TABLE IF NOT EXISTS public.master_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  source text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_master_registry_user_created ON public.master_registry(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_master_registry_event ON public.master_registry(event_type);

ALTER TABLE public.master_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master_registry_select_own" ON public.master_registry;
CREATE POLICY "master_registry_select_own" ON public.master_registry
  FOR SELECT USING ((select auth.uid()) = user_id OR public.is_admin((select auth.uid())));

DROP POLICY IF EXISTS "master_registry_insert_own" ON public.master_registry;
CREATE POLICY "master_registry_insert_own" ON public.master_registry
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Ron Memory
CREATE TABLE IF NOT EXISTS public.ron_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ron_memory_user_key ON public.ron_memory(user_id, key);

ALTER TABLE public.ron_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ron_memory_select_own" ON public.ron_memory;
CREATE POLICY "ron_memory_select_own" ON public.ron_memory
  FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "ron_memory_insert_own" ON public.ron_memory;
CREATE POLICY "ron_memory_insert_own" ON public.ron_memory
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "ron_memory_update_own" ON public.ron_memory;
CREATE POLICY "ron_memory_update_own" ON public.ron_memory
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Daily Tasks
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_key text NOT NULL,
  title text NOT NULL,
  xp_reward int NOT NULL DEFAULT 25,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  task_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_key, task_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON public.daily_tasks(user_id, task_date);

ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_tasks_all_own" ON public.daily_tasks;
CREATE POLICY "daily_tasks_all_own" ON public.daily_tasks
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

-- Sync Score & XP on athletes
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS sync_score int DEFAULT 0;
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS xp_total int DEFAULT 0;
