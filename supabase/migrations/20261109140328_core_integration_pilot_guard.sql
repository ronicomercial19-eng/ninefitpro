-- Keep integration schedules paused until the five pilot checks pass.
select cron.alter_job((select jobid from cron.job where jobname='fitpro-core-integration'),active:=false);
drop policy core_actions_read_own on public.core_action_inbox;
create policy core_actions_read_own on public.core_action_inbox for select to authenticated
 using((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false'
 and (user_id=(select auth.uid()) or exists(select 1 from public.athletes a where a.id=athlete_id and a.coach_id=(select auth.uid())) or public.has_role((select auth.uid()),'admin')));


