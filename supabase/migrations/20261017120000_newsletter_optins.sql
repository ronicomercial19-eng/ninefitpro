create table if not exists public.newsletter_optins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  athlete_id uuid references public.athletes(id) on delete set null,
  email text not null,
  source text not null default 'hub',
  consent_text text not null,
  consent_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint newsletter_optins_user_unique unique (user_id)
);

alter table public.newsletter_optins enable row level security;

drop policy if exists "newsletter: own select" on public.newsletter_optins;
drop policy if exists "newsletter: own insert" on public.newsletter_optins;
drop policy if exists "newsletter: own update" on public.newsletter_optins;

create policy "newsletter: own select" on public.newsletter_optins
  for select to authenticated using (user_id = auth.uid());
create policy "newsletter: own insert" on public.newsletter_optins
  for insert to authenticated with check (user_id = auth.uid());
create policy "newsletter: own update" on public.newsletter_optins
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
