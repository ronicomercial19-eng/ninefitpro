-- Fase 1 (13/09): estrutura de refeições por dieta, para marcação real de kcal
-- (pedido do Rony) em vez de HTML solto. Convive com student_diet_assignments
-- (que continua guardando o documento/HTML como "ver plano completo").

create table if not exists public.diet_meals (
  id uuid primary key default gen_random_uuid(),
  diet_assignment_id uuid not null references public.student_diet_assignments(id) on delete cascade,
  nome text not null,
  horario_previsto time,
  kcal numeric not null default 0,
  proteina_g numeric,
  carbo_g numeric,
  gordura_g numeric,
  ordem int not null default 0,
  origem text not null default 'professor' check (origem in ('professor', 'ia_perfil', 'manual', 'extracao_html')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_diet_meals_assignment on public.diet_meals(diet_assignment_id);

alter table public.diet_meals enable row level security;

-- Aluno só lê refeições da própria dieta ativa (via bridge athletes)
create policy "athlete_reads_own_diet_meals"
  on public.diet_meals for select
  to authenticated
  using (
    diet_assignment_id in (
      select sda.id from public.student_diet_assignments sda
      join public.athletes a on a.id = sda.student_id
      where a.user_id = auth.uid()
    )
  );

-- Quem atribuiu a dieta (professor/nutri) pode gerenciar as refeições dela
create policy "creator_manages_diet_meals"
  on public.diet_meals for all
  to authenticated
  using (
    diet_assignment_id in (
      select sda.id from public.student_diet_assignments sda
      where sda.created_by = auth.uid()
    )
  )
  with check (true);

comment on table public.diet_meals is 'Fase 1 (13/09): refeições estruturadas (nome/horário/kcal/macros) de uma dieta atribuída ou autoguiada. Populada por professor, extração de HTML existente, ou futuramente fn_gerar_dieta.';
;
