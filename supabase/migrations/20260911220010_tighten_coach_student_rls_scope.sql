-- Restrict coach visibility to athletes explicitly linked by coach_id.
drop policy if exists "Athletes manage own executions" on public.workout_executions;
create policy "Athletes and assigned coaches manage executions"
on public.workout_executions
for all
using (
  athlete_id = fn_current_athlete_id()
  or exists (
    select 1 from public.athletes a
    where a.id = workout_executions.athlete_id
      and a.coach_id = auth.uid()
  )
  or is_admin(auth.uid())
)
with check (
  athlete_id = fn_current_athlete_id()
  or exists (
    select 1 from public.athletes a
    where a.id = workout_executions.athlete_id
      and a.coach_id = auth.uid()
  )
  or is_admin(auth.uid())
);

drop policy if exists "Athletes see own library assignments" on public.student_library_assignments;
create policy "Athletes and assigned coaches read library assignments"
on public.student_library_assignments
for select
using (
  athlete_id in (
    select a.id from public.athletes a
    where a.user_id = auth.uid() or a.email = current_user_email()
  )
  or exists (
    select 1 from public.athletes a
    where a.id = student_library_assignments.athlete_id
      and a.coach_id = auth.uid()
  )
  or is_admin(auth.uid())
);

drop policy if exists "Trainers manage library assignments" on public.student_library_assignments;
create policy "Assigned coaches manage library assignments"
on public.student_library_assignments
for all
using (
  exists (
    select 1 from public.athletes a
    where a.id = student_library_assignments.athlete_id
      and a.coach_id = auth.uid()
  )
  or is_admin(auth.uid())
)
with check (
  exists (
    select 1 from public.athletes a
    where a.id = student_library_assignments.athlete_id
      and a.coach_id = auth.uid()
  )
  or is_admin(auth.uid())
);;
