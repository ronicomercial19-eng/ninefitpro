-- Server-owned durable integration. No credentials or signed bodies in logs.
create schema if not exists core_private;
revoke all on schema core_private from public, anon, authenticated;
create table public.core_event_queue (
 id uuid primary key default gen_random_uuid(), athlete_id uuid references public.athletes(id),
 event_type text not null, payload jsonb not null default '{}', idempotency_key text not null unique,
 state text not null default 'pending' check(state in ('pending','processing','retry','delivered','blocked')),
 attempts int not null default 0, available_at timestamptz not null default now(),
 locked_until timestamptz, http_status int, error_code text, created_at timestamptz not null default now()
);
create index core_event_queue_due on public.core_event_queue(state,available_at);
create table public.core_action_inbox (
 event_id uuid primary key, event_type text not null, payload jsonb not null,
 athlete_id uuid references public.athletes(id), user_id uuid references auth.users(id),
 state text not null default 'pending' check(state in ('pending','applied','needs_input','needs_review','unmatched')),
 result jsonb not null default '{}', attempts int not null default 0,
 next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now(),
 applied_at timestamptz
);
create index core_action_inbox_due on public.core_action_inbox(state,next_attempt_at);
create table public.core_integration_state (
 id boolean primary key default true check(id), after_at timestamptz not null default now(),
 after_id uuid, worker_locked_until timestamptz, worker_owner uuid,
 last_run_at timestamptz,last_status int,last_error text
);
insert into public.core_integration_state(id) values(true);
alter table public.core_event_queue enable row level security;
alter table public.core_action_inbox enable row level security;
alter table public.core_integration_state enable row level security;
revoke all on public.core_event_queue,public.core_action_inbox,public.core_integration_state from anon,authenticated;
grant all on public.core_event_queue,public.core_action_inbox,public.core_integration_state to service_role;
grant select on public.core_action_inbox to authenticated;
create policy core_actions_read_own on public.core_action_inbox for select to authenticated
 using(user_id=(select auth.uid()) or exists(select 1 from public.athletes a where a.id=athlete_id and a.coach_id=(select auth.uid())) or public.has_role((select auth.uid()),'admin'));
-- Internal worker token is generated and remains encrypted inside Vault.
do $$ begin
 if not exists(select 1 from vault.secrets where name='CORE_INTEGRATION_WORKER_TOKEN') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'CORE_INTEGRATION_WORKER_TOKEN','Core integration worker authentication');
 end if;
end $$;
create function public.fn_core_worker_key() returns text language sql security definer set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where name='CORE_INTEGRATION_WORKER_TOKEN' limit 1
$$;
revoke all on function public.fn_core_worker_key() from public,anon,authenticated;
grant execute on function public.fn_core_worker_key() to service_role;
create function public.fn_core_worker_lock(p_owner uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.core_integration_state set worker_locked_until=now()+interval '90 seconds',worker_owner=p_owner
 where id and (worker_locked_until is null or worker_locked_until<now());
 return found;
end $$;
create function public.fn_core_worker_unlock(p_owner uuid) returns void language sql security definer set search_path='' as $$
 update public.core_integration_state set worker_locked_until=null,worker_owner=null,last_run_at=now()
 where id and worker_owner=p_owner
$$;
create function public.fn_core_claim_events(p_limit int default 10) returns setof public.core_event_queue language sql security definer set search_path='' as $$
 update public.core_event_queue q set state='processing',locked_until=now()+interval '90 seconds',attempts=q.attempts+1
 where id in(select id from public.core_event_queue where (state in ('pending','retry') or (state='processing' and locked_until<now()))
 and available_at<=now() order by created_at for update skip locked limit greatest(1,least(p_limit,20)))
 returning q.*
$$;
create function public.fn_core_ingest_page(p_events jsonb,p_after timestamptz,p_after_id uuid default null)
 returns int language plpgsql security definer set search_path='' as $$
declare n int; begin
 if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>200 then raise exception 'invalid_page'; end if;
 insert into public.core_action_inbox(event_id,event_type,payload,created_at)
 select (e->>'id')::uuid,e->>'type',e->'payload',(e->>'created_at')::timestamptz from jsonb_array_elements(p_events)e
 on conflict(event_id) do nothing;
 get diagnostics n=row_count;
 update public.core_integration_state set after_at=p_after,after_id=p_after_id where id and p_after>=after_at;
 return n;
end $$;
create function public.fn_core_enqueue(p_type text,p_athlete uuid,p_payload jsonb,p_key text)
 returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; begin
 if p_type !~ '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$' or length(p_type)>100 or length(p_key)>200 or p_key='' then raise exception 'invalid_event'; end if;
 if not exists(select 1 from public.athletes where id=p_athlete) then raise exception 'athlete_missing'; end if;
 insert into public.core_event_queue(athlete_id,event_type,payload,idempotency_key) values(p_athlete,p_type,coalesce(p_payload,'{}'),p_key)
 on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key returning id into v_id;
 return v_id;
end $$;
-- Match the outbox only against a server-created chat link, never a supplied user id.
create function public.fn_core_apply_action(p_event uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.core_action_inbox%rowtype; a public.athletes%rowtype; v_phone text; n int; v_result jsonb:='{}';
 v_user uuid; v_state text:='applied'; v_goal text; v_workout jsonb; v_date date:=(now() at time zone 'America/Sao_Paulo')::date;
 v_old_claims text:=current_setting('request.jwt.claims',true); v_old_sub text:=current_setting('request.jwt.claim.sub',true);
begin
 select * into e from public.core_action_inbox where event_id=p_event for update;
 if not found then raise exception 'event_missing'; end if;
 if e.state='applied' then return e.result; end if;
 v_phone:=regexp_replace(coalesce(e.payload->>'phone',''),'[^0-9]','','g');
 if length(v_phone) in(10,11) then v_phone:='55'||v_phone; end if;
 select count(*) into n from public.core_chat_threads where regexp_replace(phone,'[^0-9]','','g')=v_phone;
 if n<>1 then update public.core_action_inbox set state='unmatched',result='{"reason":"identity_missing_or_ambiguous"}',next_attempt_at=now()+interval '15 minutes',attempts=attempts+1 where event_id=p_event; return '{"state":"unmatched"}'; end if;
 select t.user_id into v_user from public.core_chat_threads t where regexp_replace(t.phone,'[^0-9]','','g')=v_phone;
 select x.* into a from public.core_chat_threads t join public.athletes x on x.id=t.athlete_id
 where regexp_replace(t.phone,'[^0-9]','','g')=v_phone;
 if coalesce(e.payload->>'fitpro_user_id',e.payload->>'user_id',v_user::text)<>v_user::text then raise exception 'identity_mismatch'; end if;
 -- Canonical workout functions use auth.uid() and their existing access/readiness checks.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_user,'role','authenticated')::text,true);
 perform set_config('request.jwt.claim.sub',v_user::text,true);
 if e.event_type='student.goal_set' then
  v_goal:=e.payload->>'goal';
  if v_goal not in('emagrecer','massa','habito') or v_goal is null then v_state:='needs_input';v_result:='{"reason":"invalid_goal"}';
  else
   update public.athletes set objetivo=v_goal,primary_goal=v_goal,updated_at=now() where id=a.id;
   v_result:=jsonb_build_object('goal_saved',true,'goal',v_goal);
  end if;
 end if;
 if e.event_type in('workout.short_requested','student.goal_set') and v_state='applied' then
  -- Do not guess available equipment or bypass calibration/pain gates.
  if a.training_environment is null or a.training_environment not in('gym','home','outdoor','home_basic') then
   v_state:='needs_input';v_result:=v_result||'{"reason":"training_environment_required","workout_prepared":false}';
  else
   begin
    -- A prepared quick session for today is reused; never replace a started workout.
    select jsonb_build_object('daily_workout_id',id,'reused',true) into v_workout from public.daily_workouts
     where athlete_id=a.id and workout_date=v_date and workout_type='quick' order by created_at desc limit 1;
    if v_workout is null then
     v_workout:=public.fn_treino_rapido(a.id,case when coalesce(v_goal,a.objetivo,a.primary_goal)='emagrecer' then 'cardio' else 'strength' end,20,
       'resources:'||case a.training_environment when 'gym' then 'gym' when 'home_basic' then 'bodyweight,dumbbells,bands' else 'bodyweight' end)::jsonb;
     perform public.fn_apply_readiness_to_workout((v_workout->>'daily_workout_id')::uuid);
    end if;
    v_result:=v_result||jsonb_build_object('workout_prepared',true,'daily_workout_id',v_workout->>'daily_workout_id');
   exception when others then
    v_state:='needs_input';v_result:=v_result||'{"reason":"canonical_workout_precondition","workout_prepared":false}';
   end;
  end if;
 elsif e.event_type='checkin.recorded' then
  -- Preserve the actual guided check-in; do not fabricate daily calibration fields.
  insert into public.master_registry(user_id,event_type,source,payload) values(v_user,'weekly_checkin','core_outbox',jsonb_build_object('core_event_id',p_event,'athlete_id',a.id,'response',e.payload));
  if coalesce(e.payload->>'pain',e.payload->>'dor','') ~* '(sim|yes|dor|^[3-9]$)' then v_state:='needs_review'; end if;
  v_result:='{"checkin_saved":true}';
 elsif e.event_type='renewal.requested' then
  v_state:='needs_review';v_result:='{"renewal_requested":true,"access_changed":false}';
 elsif e.event_type='payment.recovery_claimed' then
  -- A recovery claim cannot grant access or mark a payment as paid.
  if e.payload->>'payment_id' ~ '^[0-9a-f-]{36}$' and exists(select 1 from public.payments p where p.id=(e.payload->>'payment_id')::uuid and p.student_id=a.aluno_id and p.status='paid') then
   v_result:='{"payment_verified":true}';
  else v_state:='needs_review';v_result:='{"payment_verified":false,"reason":"provider_verification_required"}'; end if;
 elsif e.event_type='conversation.handoff' then
  v_state:='needs_review';v_result:='{"handoff_recorded":true}';
 elsif e.event_type not in('student.goal_set','workout.short_requested') then
  v_state:='needs_review';v_result:='{"reason":"unsupported_action_review"}';
 end if;
 -- Transactionally notify once; retries cannot duplicate the coach notification.
 if not(e.result ? 'notification_id') then
  if a.coach_id is not null then
   insert into public.notifications(user_id,title,message,type,action_url,event_type)
    values(a.coach_id,'Solicitação do Core','Há uma atualização do aluno para acompanhar: '||e.event_type,'info','/app/alunos-assinaturas',e.event_type)
    returning jsonb_build_object('notification_id',id) into v_workout;
   v_result:=v_result||v_workout;
  end if;
 else v_result:=v_result||jsonb_build_object('notification_id',e.result->>'notification_id'); end if;
 update public.core_action_inbox set athlete_id=a.id,user_id=v_user,state=v_state,result=v_result,
  attempts=attempts+1,next_attempt_at=now()+interval '15 minutes',applied_at=case when v_state='applied' then now() end where event_id=p_event;
 perform set_config('request.jwt.claims',coalesce(v_old_claims,''),true);
 perform set_config('request.jwt.claim.sub',coalesce(v_old_sub,''),true);
 return jsonb_build_object('state',v_state,'result',v_result);
end $$;
-- All privileged RPCs are service-only, including worker-token retrieval.
do $$ declare p record; begin
 for p in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname in
 ('fn_core_worker_lock','fn_core_worker_unlock','fn_core_claim_events','fn_core_ingest_page','fn_core_enqueue','fn_core_apply_action')
 loop execute format('revoke all on function %s from public,anon,authenticated',p.signature);
 execute format('grant execute on function %s to service_role',p.signature); end loop;
end $$;
-- Replace unauthenticated, nondurable HTTP triggers. No historical rows are replayed.
create or replace function public.fn_core_os_user_created() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform public.fn_core_enqueue('fitpro.signup',new.id,jsonb_build_object('created_at',new.created_at),'signup:'||new.id);
 return new;
end $$;
create or replace function public.fn_core_os_payment_status() returns trigger language plpgsql security definer set search_path='' as $$
declare aid uuid; begin
 if new.status is distinct from old.status and new.status='paid' then
  select id into aid from public.athletes where aluno_id=new.student_id;
  if aid is not null then perform public.fn_core_enqueue('payment.approved',aid,jsonb_build_object('payment_id',new.id,'status','paid'),'paid:'||new.id); end if;
 end if;
 -- overdue/cancelled are not a confirmed processor decline.
 return new;
end $$;
create or replace function public.fn_core_os_workout_completed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='completed' and new.completion_valid is true and (tg_op='INSERT' or old.status is distinct from new.status) then
  perform public.fn_core_enqueue('workout.completed',new.athlete_id,jsonb_build_object('workout_id',new.id),'completed:'||new.id);
 end if;return new;
end $$;
create or replace function public.fn_core_os_workout_skipped() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='skipped' and (tg_op='INSERT' or old.status is distinct from new.status) then
  perform public.fn_core_enqueue('workout.skipped',new.athlete_id,jsonb_build_object('workout_id',new.id),'skipped:'||new.id);
 end if;return new;
end $$;
create or replace function public.fn_core_os_message_received() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- AI assistant history is not the team chat. zap-proxy already forwards real 9ZAP messages.
 return new;
end $$;
create or replace function public.fn_core_os_check_inactive_athletes() returns void language plpgsql security definer set search_path='' as $$
begin
 -- Disabled until an explicit inactivity policy is configured. No retroactive campaigns.
 return;
end $$;
-- Future weekly check-in prompts: only accounts with an established chat and recent activity.
create function public.fn_core_weekly_checkins() returns void language plpgsql security definer set search_path='' as $$
declare r record; begin
 for r in select distinct a.id from public.athletes a join public.core_chat_threads t on t.athlete_id=a.id
 where a.activated and exists(select 1 from public.workout_executions w where w.athlete_id=a.id and w.completed_at>now()-interval '14 days')
 loop perform public.fn_core_enqueue('fit360.weekly_checkin',r.id,'{}','weekly:'||r.id||':'||date_trunc('week',now())::date); end loop;
end $$;
revoke all on function public.fn_core_weekly_checkins() from public,anon,authenticated;
grant execute on function public.fn_core_weekly_checkins() to service_role;
-- Cron calls only the authenticated integration worker; it never invokes core-os/tick.
select cron.schedule('fitpro-core-integration','* * * * *',$job$
 select net.http_post(url:='https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/core-os-dispatch?action=run',
 headers:=jsonb_build_object('Content-Type','application/json','x-core-worker-token',(select decrypted_secret from vault.decrypted_secrets where name='CORE_INTEGRATION_WORKER_TOKEN' limit 1)),
 body:='{}'::jsonb,timeout_milliseconds:=60000);
$job$);
-- Weekly trigger is installed but inactive until the signed health check and pilot pass.
select cron.schedule('fitpro-core-weekly-checkin','0 12 * * 1',$job$select public.fn_core_weekly_checkins();$job$);
select cron.alter_job((select jobid from cron.job where jobname='fitpro-core-weekly-checkin'),active:=false);
