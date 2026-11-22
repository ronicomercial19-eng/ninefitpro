
create table public.hydration_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  log_date date not null default (now() at time zone 'America/Sao_Paulo')::date,
  amount_ml integer not null check (amount_ml > 0),
  created_at timestamptz not null default now()
);

create index idx_hydration_logs_athlete_date on public.hydration_logs(athlete_id, log_date);

alter table public.hydration_logs enable row level security;

create policy "Athlete manages own hydration log"
on public.hydration_logs
for all
using (
  athlete_id in (select athletes.id from athletes where athletes.user_id = auth.uid())
  or athlete_id in (select athlete_auth_link.athlete_id from athlete_auth_link where athlete_auth_link.user_id = auth.uid())
)
with check (
  athlete_id in (select athletes.id from athletes where athletes.user_id = auth.uid())
  or athlete_id in (select athlete_auth_link.athlete_id from athlete_auth_link where athlete_auth_link.user_id = auth.uid())
);

-- Função pra registrar um "copo" e retornar o total do dia
create or replace function public.fn_add_hydration(p_athlete_id uuid, p_amount_ml integer default 250)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  insert into public.hydration_logs (athlete_id, amount_ml)
  values (p_athlete_id, p_amount_ml);

  select coalesce(sum(amount_ml), 0) into v_total
  from public.hydration_logs
  where athlete_id = p_athlete_id
    and log_date = (now() at time zone 'America/Sao_Paulo')::date;

  return v_total;
end;
$$;

-- Função pra ler o total do dia sem inserir
create or replace function public.fn_get_hydration_today(p_athlete_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(amount_ml), 0)::integer
  from public.hydration_logs
  where athlete_id = p_athlete_id
    and log_date = (now() at time zone 'America/Sao_Paulo')::date;
$$;
;
