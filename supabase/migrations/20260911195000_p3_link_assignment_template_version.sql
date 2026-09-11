-- P3: vincula uma atribuição à versão exata do template.
-- A coluna é opcional para preservar atribuições legadas.
alter table public.student_library_assignments
  add column if not exists template_version_id uuid
  references public.ninefit_template_versions(id) on delete restrict;

create index if not exists student_library_assignments_template_version_idx
  on public.student_library_assignments (template_version_id);

comment on column public.student_library_assignments.template_version_id is
  'P3: versão exata do template aplicada ao aluno; nulo preserva atribuições legadas.';