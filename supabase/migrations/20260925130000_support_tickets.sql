create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid references auth.users(id) on delete set null,
  requester_name text not null,
  requester_email text not null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
revoke all on public.support_tickets from anon;
grant insert on public.support_tickets to anon, authenticated;
grant select, update on public.support_tickets to authenticated;

drop policy if exists support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets for insert to anon, authenticated
  with check (requester_user_id is null or requester_user_id = auth.uid());
drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets for select to authenticated
  using (requester_user_id = auth.uid());
drop policy if exists support_tickets_update on public.support_tickets;
create policy support_tickets_update on public.support_tickets for update to authenticated
  using (requester_user_id = auth.uid()) with check (requester_user_id = auth.uid());
