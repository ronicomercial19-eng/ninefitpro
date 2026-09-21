create or replace function public.fn_award_xp_on_workout_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  xp_ganho int;
  v_old_status text := case when tg_op = 'INSERT' then null else old.status end;
begin
  if new.status = 'completed' and v_old_status is distinct from 'completed' then
    xp_ganho := 20
      + coalesce((new.duration_minutes / 10)::int, 0)
      + case when new.rating >= 4 then 10 else 0 end;

    update public.athletes
      set xp_total = coalesce(xp_total,0) + xp_ganho,
          level = greatest(1, floor(sqrt(coalesce(xp_total,0) + xp_ganho) / 10)::int + 1)
      where id = new.athlete_id;
  end if;
  return new;
end;
$$;