
alter table private.fitpro_access_blocks add column if not exists release_source text;

create or replace function private.fn_release_block_on_paid_subscription()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
 if new.status in ('active','trialing')
    and new.activated_at <= now()
    and (new.expires_at is null or new.expires_at > now()) then
  update private.fitpro_access_blocks
     set released_at = now(), release_source = 'payment'
   where user_id = new.user_id and released_at is null;
 end if;
 return new;
end $function$;

drop trigger if exists trg_release_block_on_paid_subscription_ins on public.user_subscriptions;
drop trigger if exists trg_release_block_on_paid_subscription_upd on public.user_subscriptions;

create trigger trg_release_block_on_paid_subscription_ins
after insert on public.user_subscriptions
for each row
when (new.status in ('active','trialing'))
execute function private.fn_release_block_on_paid_subscription();

create trigger trg_release_block_on_paid_subscription_upd
after update of status, activated_at, expires_at on public.user_subscriptions
for each row
when (
  new.status in ('active','trialing') and (
    old.status is distinct from new.status
    or old.activated_at is distinct from new.activated_at
    or (new.expires_at is distinct from old.expires_at and (new.expires_at is null or old.expires_at is null or new.expires_at > old.expires_at))
  )
)
execute function private.fn_release_block_on_paid_subscription();

create or replace function public.fn_professor_release_access(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare r text;
begin
 select role::text into r from public.profiles where user_id=auth.uid();
 if r is null or r not in('admin','super_admin','professor','trainer') then raise exception 'forbidden' using errcode='42501'; end if;
 update private.fitpro_access_blocks set released_at=now(), release_source='professor' where user_id=p_user_id and released_at is null;
 return jsonb_build_object('ok',true,'blocked',false);
end $function$;
;
