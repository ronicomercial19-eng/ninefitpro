-- P3: versionamento de templates sem alterar dados existentes
create table if not exists public.ninefit_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.ninefit_template_library(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft','review','approved','archived')),
  design_tokens jsonb not null default '{}'::jsonb,
  prescription_schema jsonb not null default '{}'::jsonb,
  protocol_schema jsonb not null default '{}'::jsonb,
  required_variables jsonb not null default '[]'::jsonb,
  change_reason text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (template_id, version)
);

alter table public.ninefit_template_versions enable row level security;

create index if not exists ninefit_template_versions_template_idx
  on public.ninefit_template_versions (template_id, version desc);

create policy "template_versions_creator_read"
  on public.ninefit_template_versions
  for select to authenticated
  using (created_by = (select auth.uid()));

create policy "template_versions_assigned_student_read"
  on public.ninefit_template_versions
  for select to authenticated
  using (
    status = 'approved'
    and exists (
      select 1
      from public.ninefit_template_library t
      join public.student_library_assignments a
        on a.content_ref = t.slug
      join public.athletes at
        on at.id = a.athlete_id
      where t.id = ninefit_template_versions.template_id
        and at.user_id = (select auth.uid())
        and a.status in ('assigned','in_progress','completed')
    )
  );

create policy "template_versions_creator_insert"
  on public.ninefit_template_versions
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "template_versions_creator_update"
  on public.ninefit_template_versions
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

comment on table public.ninefit_template_versions is
  'P3 version snapshots for NineFit templates; executions and assignments remain immutable references to a version.';
