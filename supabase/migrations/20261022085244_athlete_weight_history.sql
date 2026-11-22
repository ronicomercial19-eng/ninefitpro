create table if not exists public.athlete_weight_history (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  old_kg numeric,
  new_kg numeric,
  source text not null,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists athlete_weight_history_athlete_idx on public.athlete_weight_history (athlete_id, created_at desc);
alter table public.athlete_weight_history enable row level security;

create policy "athlete reads own weight history" on public.athlete_weight_history
  for select to authenticated
  using (athlete_id = public.fn_current_athlete_id() or public.is_admin((select auth.uid())) or public.is_trainer((select auth.uid())));

create or replace function public.trg_log_athlete_weight()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_src text; v_q text := lower(coalesce(current_query(), ''));
begin
  if new.peso_kg is distinct from old.peso_kg then
    v_src := case
      when v_q like '%fn_salvar_avaliacao_guiada%' then 'avaliacao_guiada'
      when v_q like '%fn_atualizar_perfil_completo%' then 'perfil'
      else 'atualizacao_direta' end;
    insert into public.athlete_weight_history (athlete_id, old_kg, new_kg, source, actor_user_id)
    values (new.id, old.peso_kg, new.peso_kg, v_src, (select auth.uid()));
  end if;
  return new;
end $$;

drop trigger if exists tg_log_athlete_weight on public.athletes;
create trigger tg_log_athlete_weight after update of peso_kg on public.athletes
  for each row execute function public.trg_log_athlete_weight();

-- baseline: registra o peso atual de cada atleta como ponto de partida
insert into public.athlete_weight_history (athlete_id, old_kg, new_kg, source, actor_user_id)
select id, null, peso_kg, 'baseline', null from public.athletes where peso_kg is not null
on conflict do nothing;;
