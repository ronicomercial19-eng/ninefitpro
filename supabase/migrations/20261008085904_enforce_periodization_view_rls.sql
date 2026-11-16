-- The view is exposed to the browser. Run it with the caller's RLS policies,
-- including the athlete ownership rules on each underlying plan table.
-- An older migration contains this setting, but the published view currently
-- has reloptions = NULL; this migration makes the desired state explicit.
alter view public.vw_athlete_periodizacao_ativa
  set (security_invoker = true);

revoke all on public.vw_athlete_periodizacao_ativa from anon;
grant select on public.vw_athlete_periodizacao_ativa to authenticated, service_role;

-- Keep the existing policies and their names, while removing the old rule
-- that allowed every trainer/professor to manage every athlete's plan.
alter policy "Professors and admins can manage annual plans"
  on public.periodization_annual_plans
  using (
    auth.uid() is not null and (
      public.is_admin(auth.uid())
      or (coach_id = auth.uid() and (
        exists (select 1 from public.athletes a where a.id = athlete_id and (a.coach_id = auth.uid() or a.user_id = auth.uid()))
        or exists (select 1 from public.athlete_auth_link l where l.athlete_id = periodization_annual_plans.athlete_id and l.user_id = auth.uid())
      ))
    )
  )
  with check (
    auth.uid() is not null and (
      public.is_admin(auth.uid())
      or (coach_id = auth.uid() and (
        exists (select 1 from public.athletes a where a.id = athlete_id and (a.coach_id = auth.uid() or a.user_id = auth.uid()))
        or exists (select 1 from public.athlete_auth_link l where l.athlete_id = periodization_annual_plans.athlete_id and l.user_id = auth.uid())
      ))
    )
  );

alter policy "Professors and admins can manage athlete periodizations"
  on public.athlete_periodizations
  using (
    auth.uid() is not null and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.athletes a
        where a.id = athlete_id and (a.coach_id = auth.uid() or a.user_id = auth.uid())
      )
      or exists (select 1 from public.athlete_auth_link l where l.athlete_id = athlete_periodizations.athlete_id and l.user_id = auth.uid())
    )
  )
  with check (
    auth.uid() is not null and (
      public.is_admin(auth.uid())
      or (assigned_by = auth.uid() and (
        exists (select 1 from public.athletes a where a.id = athlete_id and (a.coach_id = auth.uid() or a.user_id = auth.uid()))
        or exists (select 1 from public.athlete_auth_link l where l.athlete_id = athlete_periodizations.athlete_id and l.user_id = auth.uid())
      ))
    )
  );

alter policy "athlete read own plan"
  on public.periodization_plans_remote
  using (
    auth.uid() is not null and (
      exists (
        select 1 from public.athletes a
        where a.id = athlete_id and a.user_id = auth.uid()
      )
      or exists (
        select 1 from public.athlete_auth_link l
        where l.athlete_id = periodization_plans_remote.athlete_id and l.user_id = auth.uid()
      )
    )
  );

alter policy "trainer manage plans"
  on public.periodization_plans_remote
  using (
    auth.uid() is not null and (
      public.is_admin(auth.uid())
      or (public.is_trainer(auth.uid()) and exists (
        select 1 from public.athletes a
        where a.id = athlete_id and a.coach_id = auth.uid()
      ))
    )
  )
  with check (
    auth.uid() is not null and (
      public.is_admin(auth.uid())
      or (public.is_trainer(auth.uid()) and exists (
        select 1 from public.athletes a
        where a.id = athlete_id and a.coach_id = auth.uid()
      ))
    )
  );

alter policy "Coach manages fitpro snapshot"
  on public.fitpro_smartperiodizer_periodizations
  using (
    auth.uid() is not null and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.athletes a
        where a.id = fitpro_student_id and a.coach_id = auth.uid()
      )
    )
  )
  with check (
    auth.uid() is not null and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.athletes a
        where a.id = fitpro_student_id and a.coach_id = auth.uid()
      )
    )
  );
