create or replace function public.get_athlete_by_email(p_email text)
returns table (
  athlete_id uuid,
  name text,
  xp_total int,
  level int,
  is_public_profile boolean,
  bio text,
  plan_id text,
  plan_name text,
  current_phase text,
  current_week_index int
) as $$
  select
    a.id,
    a.name,
    coalesce(a.xp_total,0),
    coalesce(a.level,1),
    coalesce(a.is_public_profile,true),
    a.bio,
    v.plan_id::text,
    v.plan_name,
    v.current_phase,
    v.current_week_index
  from athletes a
  join auth.users u on u.id = a.user_id
  left join vw_athlete_periodizacao_ativa v on v.athlete_id = a.id
  where lower(u.email) = lower(p_email)
  limit 1;
$$ language sql security definer set search_path = public, auth;

revoke all on function public.get_athlete_by_email(text) from public, anon, authenticated;
grant execute on function public.get_athlete_by_email(text) to service_role;;
