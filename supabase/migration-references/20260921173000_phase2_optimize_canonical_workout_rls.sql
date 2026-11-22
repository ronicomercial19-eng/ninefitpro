-- Phase 2: avoid per-row auth function re-evaluation in canonical workout policies.
drop policy if exists "Coaches can view their athletes links" on public.athlete_auth_link;
create policy "Coaches can view their athletes links" on public.athlete_auth_link
  for select to authenticated
  using (exists (
    select 1 from public.athletes a
    where a.id = athlete_auth_link.athlete_id
      and a.coach_id = (select auth.uid())
  ));

drop policy if exists "Users can view their own link" on public.athlete_auth_link;
create policy "Users can view their own link" on public.athlete_auth_link
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "admin_all" on public.athletes;
create policy "admin_all" on public.athletes
  for all to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.role = 'admin'::user_role
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.role = 'admin'::user_role
  ));

drop policy if exists "athlete_own_record" on public.athletes;
create policy "athlete_own_record" on public.athletes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "coach_manage_own" on public.athletes;
create policy "coach_manage_own" on public.athletes
  for all to authenticated
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

drop policy if exists "Athletes and assigned coaches manage executions" on public.workout_executions;
create policy "Athletes and assigned coaches manage executions" on public.workout_executions
  for all to authenticated
  using (
    athlete_id = (select public.fn_current_athlete_id())
    or exists (
      select 1 from public.athletes a
      where a.id = workout_executions.athlete_id
        and a.coach_id = (select auth.uid())
    )
    or (select public.is_admin((select auth.uid())))
  )
  with check (
    athlete_id = (select public.fn_current_athlete_id())
    or exists (
      select 1 from public.athletes a
      where a.id = workout_executions.athlete_id
        and a.coach_id = (select auth.uid())
    )
    or (select public.is_admin((select auth.uid())))
  );

drop policy if exists "Athletes and assigned coaches manage sets" on public.workout_exercise_sets;
create policy "Athletes and assigned coaches manage sets" on public.workout_exercise_sets
  for all to authenticated
  using (exists (
    select 1 from public.workout_executions we
    where we.id = workout_exercise_sets.execution_id
      and (
        we.athlete_id = (select public.fn_current_athlete_id())
        or exists (
          select 1 from public.athletes a
          where a.id = we.athlete_id
            and a.coach_id = (select auth.uid())
        )
        or (select public.is_admin((select auth.uid())))
      )
  ))
  with check (exists (
    select 1 from public.workout_executions we
    where we.id = workout_exercise_sets.execution_id
      and (
        we.athlete_id = (select public.fn_current_athlete_id())
        or exists (
          select 1 from public.athletes a
          where a.id = we.athlete_id
            and a.coach_id = (select auth.uid())
        )
        or (select public.is_admin((select auth.uid())))
      )
  ));