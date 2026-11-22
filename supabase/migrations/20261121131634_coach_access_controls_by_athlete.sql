
create or replace function private.fitpro_athlete_user_ids(p_athlete_id uuid)
returns uuid[] language sql stable security definer set search_path to '' as $f$
 select coalesce(array_agg(distinct u),'{}') from (
  select user_id as u from public.athletes where id=p_athlete_id
  union select user_id from public.athlete_auth_link where athlete_id=p_athlete_id
 ) x where u is not null
$f$;

create or replace function public.fn_coach_block_athlete(p_athlete_id uuid, p_reason_code text, p_reason_text text default null, p_payment_url text default '/9fit/planos')
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare ids uuid[]; u uuid;
begin
 if auth.uid() is null or not private.fitpro_can_manage_athlete(p_athlete_id) then raise exception 'forbidden' using errcode='42501'; end if;
 ids:=private.fitpro_athlete_user_ids(p_athlete_id);
 if coalesce(array_length(ids,1),0)=0 then raise exception 'athlete_without_login'; end if;
 foreach u in array ids loop
  insert into private.fitpro_access_blocks(user_id,reason_code,reason_text,payment_url,blocked_by,blocked_at,released_at,release_source)
  values(u,p_reason_code,nullif(btrim(p_reason_text),''),nullif(btrim(p_payment_url),''),auth.uid(),now(),null,null)
  on conflict(user_id) do update set reason_code=excluded.reason_code,reason_text=excluded.reason_text,payment_url=excluded.payment_url,blocked_by=excluded.blocked_by,blocked_at=now(),released_at=null,release_source=null;
 end loop;
 return jsonb_build_object('ok',true,'blocked',true,'logins',array_length(ids,1));
end $f$;

create or replace function public.fn_coach_release_athlete(p_athlete_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare ids uuid[];
begin
 if auth.uid() is null or not private.fitpro_can_manage_athlete(p_athlete_id) then raise exception 'forbidden' using errcode='42501'; end if;
 ids:=private.fitpro_athlete_user_ids(p_athlete_id);
 update private.fitpro_access_blocks set released_at=now(), release_source='professor' where user_id=any(ids) and released_at is null;
 return jsonb_build_object('ok',true,'blocked',false);
end $f$;

create or replace function public.fn_student_access_state(p_athlete_id uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare ids uuid[]; b record;
begin
 if auth.uid() is null or not private.fitpro_can_manage_athlete(p_athlete_id) then raise exception 'forbidden' using errcode='42501'; end if;
 ids:=private.fitpro_athlete_user_ids(p_athlete_id);
 select * into b from private.fitpro_access_blocks where user_id=any(ids) and released_at is null order by blocked_at desc limit 1;
 return jsonb_build_object(
  'blocked',found,
  'reason_code',case when found then b.reason_code end,
  'reason_text',case when found then b.reason_text end,
  'blocked_at',case when found then b.blocked_at end,
  'logins',coalesce(array_length(ids,1),0),
  'access',case when coalesce(array_length(ids,1),0)>0 then private.fitpro_access_for_user(ids[1]) end);
end $f$;

revoke all on function private.fitpro_athlete_user_ids(uuid) from public, anon, authenticated;
revoke all on function public.fn_coach_block_athlete(uuid,text,text,text) from public, anon;
revoke all on function public.fn_coach_release_athlete(uuid) from public, anon;
revoke all on function public.fn_student_access_state(uuid) from public, anon;
grant execute on function public.fn_coach_block_athlete(uuid,text,text,text) to authenticated;
grant execute on function public.fn_coach_release_athlete(uuid) to authenticated;
grant execute on function public.fn_student_access_state(uuid) to authenticated;
;
