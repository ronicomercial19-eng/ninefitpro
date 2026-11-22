-- Item G: garante que nunca haja mais de 1 periodization_annual_plans.status='active' por atleta.
-- Antes de inserir um novo plano 'active', arquiva qualquer plano 'active' anterior do mesmo atleta.
-- Cobre todos os caminhos de escrita (Wizard, IA, banco de modelos) sem depender de cada função lembrar disso.

create or replace function fn_archive_previous_active_plan()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' then
    update periodization_annual_plans
    set status = 'archived',
        updated_at = now()
    where athlete_id = new.athlete_id
      and status = 'active'
      and id is distinct from new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_archive_previous_active_plan on periodization_annual_plans;

create trigger trg_archive_previous_active_plan
before insert on periodization_annual_plans
for each row
execute function fn_archive_previous_active_plan();;
