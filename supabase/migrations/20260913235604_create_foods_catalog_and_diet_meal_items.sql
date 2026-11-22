-- Fase 1B (13/09): kcal por refeição estimado a partir de alimento+quantidade
-- (decisão B do Rony), já que dietas reais de nutri não trazem kcal pronto.

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  unidade_padrao text not null, -- 'g', 'ml', 'un', 'fatia', 'col_sopa', 'col_cha', 'concha', 'scoop'
  kcal_por_unidade numeric not null, -- kcal para 1 unidade_padrao (ex: kcal por grama, ou por unidade inteira)
  proteina_g_por_unidade numeric,
  carbo_g_por_unidade numeric,
  gordura_g_por_unidade numeric,
  fonte text default 'tabela_taco_estimativa',
  created_at timestamptz not null default now()
);

create table if not exists public.diet_meal_items (
  id uuid primary key default gen_random_uuid(),
  diet_meal_id uuid not null references public.diet_meals(id) on delete cascade,
  food_id uuid references public.foods(id),
  descricao_original text not null, -- texto literal da dieta, ex: "Pão Integral (1 fatia)"
  quantidade numeric not null default 1,
  kcal_calculado numeric not null default 0,
  eh_alternativa boolean not null default false, -- true = opção "ou X", não soma no total
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_diet_meal_items_meal on public.diet_meal_items(diet_meal_id);

alter table public.foods enable row level security;
alter table public.diet_meal_items enable row level security;

create policy "authenticated_reads_foods" on public.foods for select to authenticated using (true);

create policy "athlete_reads_own_diet_meal_items"
  on public.diet_meal_items for select
  to authenticated
  using (
    diet_meal_id in (
      select dm.id from public.diet_meals dm
      join public.student_diet_assignments sda on sda.id = dm.diet_assignment_id
      join public.athletes a on a.id = sda.student_id
      where a.user_id = auth.uid()
    )
  );

create policy "creator_manages_diet_meal_items"
  on public.diet_meal_items for all
  to authenticated
  using (
    diet_meal_id in (
      select dm.id from public.diet_meals dm
      join public.student_diet_assignments sda on sda.id = dm.diet_assignment_id
      where sda.created_by = auth.uid()
    )
  )
  with check (true);

-- Recalcula diet_meals.kcal (só itens principais, não alternativas) sempre que os itens mudam
create or replace function public.fn_recalc_diet_meal_kcal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meal_id uuid := coalesce(new.diet_meal_id, old.diet_meal_id);
begin
  update public.diet_meals
  set kcal = coalesce((
    select sum(kcal_calculado) from public.diet_meal_items
    where diet_meal_id = v_meal_id and eh_alternativa = false
  ), 0),
  updated_at = now()
  where id = v_meal_id;
  return null;
end;
$$;

drop trigger if exists trg_recalc_diet_meal_kcal on public.diet_meal_items;
create trigger trg_recalc_diet_meal_kcal
after insert or update or delete on public.diet_meal_items
for each row execute function public.fn_recalc_diet_meal_kcal();

comment on table public.foods is 'Fase 1B (13/09): catálogo mínimo de alimentos com kcal/macros por unidade, para estimar kcal de refeições cujo texto original só tem alimento+quantidade (caso real: dieta da Marcella pra Fernanda).';
comment on table public.diet_meal_items is 'Fase 1B (13/09): itens de uma diet_meal (alimento+quantidade), usados para calcular kcal automaticamente. eh_alternativa=true para opções "ou X" que não entram no total.';
;
