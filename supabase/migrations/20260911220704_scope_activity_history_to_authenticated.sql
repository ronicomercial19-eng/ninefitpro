drop policy if exists "Professors manage athlete activity history" on public.student_activity_history;
create policy "Professors manage athlete activity history"
on public.student_activity_history for all to authenticated
using (
  athlete_id in (select id from public.athletes where coach_id = auth.uid())
  or athlete_id in (select id from public.athletes where user_id = auth.uid())
  or has_role(auth.uid(),'admin'::app_role)
)
with check (
  athlete_id in (select id from public.athletes where coach_id = auth.uid())
  or athlete_id in (select id from public.athletes where user_id = auth.uid())
  or has_role(auth.uid(),'admin'::app_role)
);;
