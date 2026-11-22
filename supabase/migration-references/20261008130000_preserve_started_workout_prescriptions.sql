-- A started execution is an immutable prescription boundary. Actual sets and
-- feedback remain writable in their own tables; future days can still adapt.
alter table public.daily_workouts
  add column if not exists periodization_plan_id uuid references public.periodization_annual_plans(id),
  add column if not exists periodization_assignment_id uuid references public.athlete_periodizations(id),
  add column if not exists periodization_phase text,
  add column if not exists periodization_week_index integer,
  add column if not exists prescription_origin text,
  add column if not exists plan_snapshot jsonb,
  add column if not exists prescription_segments jsonb not null default '[]'::jsonb;

create or replace function public.fn_guard_started_workout_prescription()
returns trigger language plpgsql security invoker set search_path = '' as $function$
declare
  v_daily_id uuid;
begin
  v_daily_id := case when TG_OP = 'INSERT' then new.daily_workout_id when TG_TABLE_NAME = 'daily_workouts' then old.id else old.daily_workout_id end;
  if exists (
    select 1 from public.workout_executions e
    join public.daily_workouts dw on dw.id = v_daily_id
    where e.athlete_id = dw.athlete_id
      and (e.daily_workout_id = v_daily_id or (e.daily_workout_id is null and e.workout_date = dw.workout_date))
      and (e.started_at is not null or e.status not in ('pending', 'prescribed'))
  ) then
    raise exception 'started_workout_prescription_locked' using errcode = '55000';
  end if;
  if TG_OP = 'INSERT' then return new; end if;
  return old;
end;
$function$;

create or replace trigger guard_started_workout_exercise before insert or update or delete on public.workout_exercises
for each row execute function public.fn_guard_started_workout_prescription();

create or replace trigger guard_started_daily_workout before delete or update of
  day_number, day_name, focus_muscles, workout_type, workout_date,
  changes_json, prescription_issue, periodization_plan_id, periodization_assignment_id,
  prescription_origin, periodization_phase,
  periodization_week_index, plan_snapshot, prescription_segments on public.daily_workouts
for each row execute function public.fn_guard_started_workout_prescription();
