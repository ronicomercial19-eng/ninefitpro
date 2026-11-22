create or replace function public.get_staff_directory()
returns table (user_id uuid, full_name text, role text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.full_name, p.role::text, p.avatar_url
  from public.profiles p
  where p.is_active = true and p.role in ('admin','professor')
  order by p.full_name;
$$;
revoke all on function public.get_staff_directory() from public, anon;
grant execute on function public.get_staff_directory() to authenticated;;
