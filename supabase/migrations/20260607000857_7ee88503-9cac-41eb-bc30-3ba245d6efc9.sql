
-- HealthFlix + Library + SmartPeriodizer integration tables
CREATE TABLE IF NOT EXISTS public.healthflix_progress (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athletes(id) on delete cascade,
  fitpro_student_id text not null,
  content_id text not null,
  content_title text,
  progress_percent numeric default 0,
  started_at timestamptz,
  completed_at timestamptz,
  last_event_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(fitpro_student_id, content_id)
);
GRANT SELECT, INSERT, UPDATE ON public.healthflix_progress TO authenticated;
GRANT ALL ON public.healthflix_progress TO service_role;
ALTER TABLE public.healthflix_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athlete read own progress" ON public.healthflix_progress FOR SELECT TO authenticated
  USING (athlete_id IN (SELECT id FROM public.athletes WHERE user_id = (select auth.uid())) OR public.is_trainer((select auth.uid())));
CREATE POLICY "service writes progress" ON public.healthflix_progress FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.integration_events_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event_type text not null,
  fitpro_student_id text,
  fitpro_professor_id text,
  entity_type text,
  entity_id text,
  payload jsonb default '{}'::jsonb,
  delivered boolean default true,
  received_at timestamptz not null default now()
);
GRANT SELECT ON public.integration_events_log TO authenticated;
GRANT ALL ON public.integration_events_log TO service_role;
ALTER TABLE public.integration_events_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer read events" ON public.integration_events_log FOR SELECT TO authenticated
  USING (public.is_trainer((select auth.uid())));

CREATE TABLE IF NOT EXISTS public.periodization_plans_remote (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  external_plan_id text,
  plan_name text,
  total_weeks integer,
  current_week integer,
  waves jsonb default '[]'::jsonb,
  raw_payload jsonb default '{}'::jsonb,
  status text default 'active',
  last_synced_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(athlete_id, external_plan_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodization_plans_remote TO authenticated;
GRANT ALL ON public.periodization_plans_remote TO service_role;
ALTER TABLE public.periodization_plans_remote ENABLE ROW LEVEL SECURITY;
CREATE POLICY "athlete read own plan" ON public.periodization_plans_remote FOR SELECT TO authenticated
  USING (athlete_id IN (SELECT id FROM public.athletes WHERE user_id = (select auth.uid())) OR public.is_trainer((select auth.uid())));
CREATE POLICY "trainer manage plans" ON public.periodization_plans_remote FOR ALL TO authenticated
  USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

CREATE TRIGGER trg_healthflix_progress_updated BEFORE UPDATE ON public.healthflix_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_periodization_plans_remote_updated BEFORE UPDATE ON public.periodization_plans_remote
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
