create or replace function public.fn_core_apply_action(p_event uuid) returns jsonb language plpgsql security definer set search_path='' as $$
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
   update public.athletes set objetivo=case v_goal when 'emagrecer' then 'Emagrecimento' when 'massa' then 'Hipertrofia' else 'Saúde e Bem-estar' end,primary_goal=case v_goal when 'emagrecer' then 'Emagrecimento' when 'massa' then 'Hipertrofia' else 'Saúde e Bem-estar' end,updated_at=now() where id=a.id;
   v_result:=jsonb_build_object('goal_saved',true,'goal',v_goal);
  end if;
 end if;
 if e.event_type in('workout.short_requested','student.goal_set') and v_state='applied' then
  -- Do not guess available equipment or bypass calibration/pain gates.
  a.training_environment:=case a.training_environment when 'academia' then 'gym' when 'casa' then 'home' when 'ar_livre' then 'outdoor' when 'casa_com_equipamentos' then 'home_basic' else a.training_environment end;
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
    v_state:=case when sqlerrm like 'Revise suas restrições%' then 'needs_review' else 'needs_input' end;
    v_result:=v_result||jsonb_build_object('reason',case when sqlerrm like 'Revise suas restrições%' then 'training_restrictions_review' when sqlerrm like 'Faça a calibração%' then 'calibration_required' when sqlstate='42501' then 'access_or_identity_required' else 'canonical_workout_precondition' end,'workout_prepared',false);
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
    values(a.coach_id,
      case e.event_type when 'conversation.handoff' then 'Aluno pediu atendimento' when 'renewal.requested' then 'Renovação solicitada' when 'payment.recovery_claimed' then 'Conferir pagamento' when 'checkin.recorded' then 'Check-in recebido' when 'student.goal_set' then 'Objetivo do aluno recebido' else 'Pedido de treino recebido' end,
      case when v_state='needs_input' then 'O aluno precisa completar informações antes de preparar o treino.' else 'Abra o acompanhamento para revisar a solicitação de '||coalesce(a.name,'seu aluno')||'.' end,
      'info',case when e.event_type in('renewal.requested','payment.recovery_claimed') then '/app/alunos-assinaturas' else '/app/acompanhamento' end,e.event_type)
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

create function public.fn_core_retry_action(p_event uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare e public.core_action_inbox%rowtype; begin
 if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')<>'false' then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into e from public.core_action_inbox where event_id=p_event for update;
 if e.event_type not in('student.goal_set','workout.short_requested') or e.state not in('needs_input','needs_review') then return false; end if;
 if not(e.user_id=auth.uid() or exists(select 1 from public.athletes a where a.id=e.athlete_id and a.coach_id=auth.uid()) or public.has_role(auth.uid(),'admin')) then raise exception 'not_allowed' using errcode='42501'; end if;
 update public.core_action_inbox set state='pending',next_attempt_at=now() where event_id=p_event;
 return true;
end $$;
revoke all on function public.fn_core_retry_action(uuid) from public,anon;
grant execute on function public.fn_core_retry_action(uuid) to authenticated;

create function public.fn_core_profile_changed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.phone is distinct from old.phone or new.user_id is distinct from old.user_id then
  update public.core_event_queue set state='pending',attempts=0,available_at=now(),error_code=null
  where athlete_id=new.id and state='blocked' and error_code='student_identity_or_phone_required';
 end if;
 return new;
end $$;
revoke all on function public.fn_core_profile_changed() from public,anon,authenticated;
create trigger core_profile_integration_retry after update of phone,user_id on public.athletes
 for each row execute function public.fn_core_profile_changed();
