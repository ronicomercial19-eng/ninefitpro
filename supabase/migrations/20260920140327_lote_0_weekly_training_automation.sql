-- Lote 0: weekly training automation audit trail.
create table if not exists public.training_automation_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  week_start date not null,
  week_end date not null,
  status text not null default 'running' check (status in ('running', 'completed', 'completed_with_errors', 'failed')),
  total_athletes integer not null default 0,
  processed_athletes integer not null default 0,
  generated_athletes integer not null default 0,
  blocked_athletes integer not null default 0,
  failed_athletes integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.training_automation_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.training_automation_runs(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  macro_rules_id uuid,
  status text not null default 'pending' check (status in ('pending', 'generated', 'delivered', 'blocked', 'failed')),
  feedback_summary jsonb not null default '{}'::jsonb,
  generation_result jsonb not null default '{}'::jsonb,
  delivery_result jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, athlete_id)
);
create index if not exists idx_training_automation_runs_week on public.training_automation_runs(week_start, status);
create index if not exists idx_training_automation_items_athlete on public.training_automation_items(athlete_id, created_at desc);
alter table public.training_automation_runs enable row level security;
alter table public.training_automation_items enable row level security;
revoke all on public.training_automation_runs from anon, authenticated;
revoke all on public.training_automation_items from anon, authenticated;
create or replace function public.touch_training_automation_item()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_touch_training_automation_item on public.training_automation_items;
create trigger trg_touch_training_automation_item before update on public.training_automation_items for each row execute function public.touch_training_automation_item();;
