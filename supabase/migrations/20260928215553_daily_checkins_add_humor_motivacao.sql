alter table public.daily_checkins
  add column if not exists humor integer check (humor between 1 and 5),
  add column if not exists motivacao integer check (motivacao between 1 and 5);;
