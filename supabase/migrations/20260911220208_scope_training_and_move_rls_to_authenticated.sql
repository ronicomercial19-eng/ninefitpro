drop policy if exists "act_own" on public.bio_activity_logs;
create policy "act_own" on public.bio_activity_logs
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Athletes can view their own training assignments" on public.student_training_assignments;
create policy "Athletes can view their own training assignments"
on public.student_training_assignments for select to authenticated
using (
  student_id in (select athlete_id from public.athlete_auth_link where user_id = auth.uid())
  or student_id in (select id from public.athletes where user_id = auth.uid())
);

drop policy if exists "Athletes view own training assignments" on public.student_training_assignments;
create policy "Athletes view own training assignments"
on public.student_training_assignments for select to authenticated
using (student_id in (select id from public.athletes where user_id = auth.uid()));

drop policy if exists "Coach manages own athletes training assignments" on public.student_training_assignments;
create policy "Coach manages own athletes training assignments"
on public.student_training_assignments for all to authenticated
using (
  student_id in (select id from public.athletes where coach_id = auth.uid())
  or has_role(auth.uid(), 'admin'::app_role)
)
with check (
  student_id in (select id from public.athletes where coach_id = auth.uid())
  or has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Professors can manage training assignments" on public.student_training_assignments;
create policy "Professors can manage training assignments"
on public.student_training_assignments for all to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());;
