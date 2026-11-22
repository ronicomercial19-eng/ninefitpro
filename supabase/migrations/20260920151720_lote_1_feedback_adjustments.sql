-- Lote 1: feedback loop estruturado e recomendações de ajuste.
create table if not exists public.training_feedback_signals (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  execution_id uuid references public.workout_executions(id) on delete set null,
  source text not null check (source in ('execution', 'protocol_feedback', 'sync_score')),
  signal_type text not null check (signal_type in ('pain', 'fatigue', 'high_rpe', 'low_adherence', 'positive_response', 'critical')),
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  score numeric,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_training_feedback_signals_athlete on public.training_feedback_signals(athlete_id, occurred_at desc);
create table if not exists public.training_adjustment_recommendations (
  id uuid primary key default gen_random_uuid(), athlete_id uuid not null references public.athletes(id) on delete cascade, macro_rules_id uuid, week_start date not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'applied')),
  recommendation_type text not null check (recommendation_type in ('maintain', 'reduce_intensity', 'reduce_volume', 'increase_recovery', 'review_with_professor')),
  rationale text not null, proposed_changes jsonb not null default '{}'::jsonb, source_summary jsonb not null default '{}'::jsonb, reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (athlete_id, week_start)
);
create index if not exists idx_training_adjustment_recommendations_status on public.training_adjustment_recommendations(status, week_start);
alter table public.training_feedback_signals enable row level security;
alter table public.training_adjustment_recommendations enable row level security;
revoke all on public.training_feedback_signals from anon, authenticated;
revoke all on public.training_adjustment_recommendations from anon, authenticated;
create or replace function public.touch_training_adjustment_recommendation() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_touch_training_adjustment_recommendation on public.training_adjustment_recommendations;
create trigger trg_touch_training_adjustment_recommendation before update on public.training_adjustment_recommendations for each row execute function public.touch_training_adjustment_recommendation();;
