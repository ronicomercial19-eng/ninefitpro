
create table if not exists private.fitpro_access_blocks (
  user_id uuid primary key,
  reason_code text not null check (reason_code in ('payment_overdue','inactivity','contract_ended','other')),
  reason_text text,
  payment_url text,
  blocked_by uuid,
  blocked_at timestamptz not null default now(),
  released_at timestamptz
);
alter table private.fitpro_access_blocks enable row level security;

create or replace function private.fitpro_access_for_user(p_user_id uuid, p_now timestamp with time zone default now())
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare p record; s record; g record; b record;
begin
 if p_user_id is null then return jsonb_build_object('allowed',false,'reason','account_required','source','none','server_now',p_now); end if;
 select role::text,is_active into p from public.profiles where user_id=p_user_id;
 if found and p.is_active is false then return jsonb_build_object('allowed',false,'reason','account_disabled','source','account','server_now',p_now); end if;
 if p.role in('admin','super_admin','professor','trainer') then return jsonb_build_object('allowed',true,'reason','professional','source','professional','server_now',p_now); end if;
 select * into b from private.fitpro_access_blocks where user_id=p_user_id and released_at is null;
 if found then return jsonb_build_object('allowed',false,'reason','manual_block','source','manual','block_reason',b.reason_code,'block_text',b.reason_text,'payment_url',b.payment_url,'server_now',p_now); end if;
 select * into s from public.user_subscriptions where user_id=p_user_id and status in('active','trialing') and activated_at<=p_now and(expires_at is null or expires_at>p_now) order by expires_at desc nulls first,activated_at desc limit 1;
 if found then return jsonb_build_object('allowed',true,'reason','active','source','subscription','expires_at',s.expires_at,'subscription_id',s.id,'server_now',p_now); end if;
 select * into g from private.fitpro_access_grants where user_id=p_user_id and active and(valid_until is null or valid_until>p_now);
 if found then return jsonb_build_object('allowed',true,'reason',g.source,'source',g.source,'expires_at',g.valid_until,'server_now',p_now); end if;
 select * into s from public.user_subscriptions where user_id=p_user_id order by activated_at desc limit 1;
 return jsonb_build_object('allowed',false,'reason',case when s.status='suspended' then 'payment_unconfirmed' when s.expires_at<=p_now then 'expired' else 'payment_required' end,'source','subscription','expires_at',s.expires_at,'server_now',p_now);
end $function$;

create or replace function public.fn_professor_block_access(p_user_id uuid, p_reason_code text, p_reason_text text default null, p_payment_url text default null)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare r text;
begin
 select role::text into r from public.profiles where user_id=auth.uid();
 if r is null or r not in('admin','super_admin','professor','trainer') then raise exception 'forbidden' using errcode='42501'; end if;
 insert into private.fitpro_access_blocks(user_id,reason_code,reason_text,payment_url,blocked_by,blocked_at,released_at)
 values(p_user_id,p_reason_code,p_reason_text,p_payment_url,auth.uid(),now(),null)
 on conflict(user_id) do update set reason_code=excluded.reason_code,reason_text=excluded.reason_text,payment_url=excluded.payment_url,blocked_by=excluded.blocked_by,blocked_at=now(),released_at=null;
 return jsonb_build_object('ok',true,'blocked',true);
end $function$;

create or replace function public.fn_professor_release_access(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare r text;
begin
 select role::text into r from public.profiles where user_id=auth.uid();
 if r is null or r not in('admin','super_admin','professor','trainer') then raise exception 'forbidden' using errcode='42501'; end if;
 update private.fitpro_access_blocks set released_at=now() where user_id=p_user_id and released_at is null;
 return jsonb_build_object('ok',true,'blocked',false);
end $function$;

revoke all on function public.fn_professor_block_access(uuid,text,text,text) from public, anon;
revoke all on function public.fn_professor_release_access(uuid) from public, anon;
grant execute on function public.fn_professor_block_access(uuid,text,text,text) to authenticated;
grant execute on function public.fn_professor_release_access(uuid) to authenticated;
;
