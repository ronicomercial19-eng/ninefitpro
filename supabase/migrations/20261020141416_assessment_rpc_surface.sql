-- These collections are returned only through the source-aware authenticated RPC.
revoke all on public.athlete_data_sources,public.athlete_reassessment_settings,public.avaliacao_tentativas from anon,authenticated;
-- A VO2 estimate must not suppress an independently measured strength record.
create or replace function public.trg_fn_create_pr_from_assessment()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if coalesce(new.origem,'') not in ('avaliacao_guiada','peso_avulso','autoavaliacao') then perform public.check_and_create_pr_from_assessment(new.id); end if;
 return new;
end; $$;
