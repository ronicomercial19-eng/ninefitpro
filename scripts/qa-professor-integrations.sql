-- Run only as a database operator. Every fixture is rolled back.
begin;
do $$
declare actor uuid; target uuid;
begin
  select p.user_id,a.id into actor,target
  from public.profiles p join public.athletes a on a.coach_id=p.user_id
  where p.role::text in ('professor','trainer','admin','super_admin') and p.is_active is not false
  order by case when p.role::text='professor' then 0 else 1 end limit 1;
  if actor is null then raise exception 'No active staff roster available'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('fitpro.qa_target',target::text,true);
end $$;
set local role authenticated;
do $$
declare target uuid:=current_setting('fitpro.qa_target')::uuid;
  model uuid; exercise uuid; prescription jsonb; receipt jsonb; affected integer;
begin
  if public.fn_coach_student_context(target) is null then raise exception 'Context missing'; end if;
  select id into exercise from public.exercises limit 1;
  if exercise is null then raise exception 'Exercise catalog missing'; end if;
  prescription:=jsonb_build_array(jsonb_build_object('exercise_id',exercise,'sets',2,'reps_range','8-10','rest_seconds',60));
  insert into public.reference_series(name,exercises,created_by) values ('QA transacional',prescription,auth.uid()) returning id into model;
  update public.reference_series set name='QA revisado' where id=model;
  get diagnostics affected = row_count;
  if affected<>1 then raise exception 'Reference model update denied'; end if;
  delete from public.reference_series where id=model;
  insert into public.super_sets(name,exercises,exercise_count,created_by) values ('QA transacional',prescription || prescription,2,auth.uid()) returning id into model;
  delete from public.super_sets where id=model;
  receipt:=public.fn_save_professional_ai_turn(target,gen_random_uuid(),'QA transacional','Resposta de teste revertida ao final.','chat');
  if coalesce((receipt->>'saved')::boolean,false) is not true then raise exception 'History storage not confirmed'; end if;
  perform id from public.student_workout_drafts where athlete_id=target limit 1;
  perform id from public.student_library_assignments where athlete_id=target limit 1;
  perform key from public.api_connectors limit 1;
end $$;
rollback;
