drop policy if exists "Athletes manage own sets" on public.workout_exercise_sets;
create policy "Athletes and assigned coaches manage sets"
on public.workout_exercise_sets for all to authenticated
using (
  exists (
    select 1 from public.workout_executions we
    where we.id = workout_exercise_sets.execution_id
      and (
        we.athlete_id = fn_current_athlete_id()
        or exists (select 1 from public.athletes a where a.id = we.athlete_id and a.coach_id = auth.uid())
        or is_admin(auth.uid())
      )
  )
)
with check (
  exists (
    select 1 from public.workout_executions we
    where we.id = workout_exercise_sets.execution_id
      and (
        we.athlete_id = fn_current_athlete_id()
        or exists (select 1 from public.athletes a where a.id = we.athlete_id and a.coach_id = auth.uid())
        or is_admin(auth.uid())
      )
  )
);;
