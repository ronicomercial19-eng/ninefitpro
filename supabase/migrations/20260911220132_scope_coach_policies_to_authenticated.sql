drop policy if exists "Athletes and assigned coaches manage executions" on public.workout_executions;
create policy "Athletes and assigned coaches manage executions"
on public.workout_executions
for all
to authenticated
using (
  athlete_id = fn_current_athlete_id()
  or exists (select 1 from public.athletes a where a.id = workout_executions.athlete_id and a.coach_id = auth.uid())
  or is_admin(auth.uid())
)
with check (
  athlete_id = fn_current_athlete_id()
  or exists (select 1 from public.athletes a where a.id = workout_executions.athlete_id and a.coach_id = auth.uid())
  or is_admin(auth.uid())
);

drop policy if exists "Athletes and assigned coaches read library assignments" on public.student_library_assignments;
create policy "Athletes and assigned coaches read library assignments"
on public.student_library_assignments
for select
to authenticated
using (
  athlete_id in (select a.id from public.athletes a where a.user_id = auth.uid() or a.email = current_user_email())
  or exists (select 1 from public.athletes a where a.id = student_library_assignments.athlete_id and a.coach_id = auth.uid())
  or is_admin(auth.uid())
);

drop policy if exists "Assigned coaches manage library assignments" on public.student_library_assignments;
create policy "Assigned coaches manage library assignments"
on public.student_library_assignments
for all
to authenticated
using (
  exists (select 1 from public.athletes a where a.id = student_library_assignments.athlete_id and a.coach_id = auth.uid())
  or is_admin(auth.uid())
)
with check (
  exists (select 1 from public.athletes a where a.id = student_library_assignments.athlete_id and a.coach_id = auth.uid())
  or is_admin(auth.uid())
);;
