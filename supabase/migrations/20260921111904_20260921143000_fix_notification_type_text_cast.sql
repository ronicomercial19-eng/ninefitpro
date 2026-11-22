create or replace function public.notification_type_from_text(value text)
returns public.notification_type
language sql
immutable
strict
set search_path = public
as $$
  select value::public.notification_type
$$;

drop cast if exists (text as public.notification_type);
create cast (text as public.notification_type)
with function public.notification_type_from_text(text)
as assignment;;
