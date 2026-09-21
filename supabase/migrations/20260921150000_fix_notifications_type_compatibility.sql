-- Keep notification severity values constrained while allowing legacy trigger functions
-- to write text literals without aborting unrelated transactions.
alter table public.notifications
  alter column type type text
  using type::text;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('info','success','warning','error'));