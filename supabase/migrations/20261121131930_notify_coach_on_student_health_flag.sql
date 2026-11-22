
create or replace function private.fitpro_notify_coach_health_flag(p_athlete_id uuid, p_detail text)
returns void language plpgsql security definer set search_path to '' as $f$
declare a record;
begin
 select id, name, coach_id into a from public.athletes where id=p_athlete_id;
 if not found or a.coach_id is null then return; end if;
 if exists (select 1 from public.notifications n where n.user_id=a.coach_id and n.event_type='student_health_flag' and n.related_id=a.id and n.is_read is not true and n.created_at>now()-interval '7 days') then return; end if;
 insert into public.notifications(user_id,title,message,type,event_type,action_url,related_table,related_id)
 values(a.coach_id,'Aluno informou dor ou lesão',coalesce(a.name,'Aluno')||' informou: '||p_detail||'. Revise o treino antes de prescrever.','warning','student_health_flag','/smart-treino-builder?athlete_id='||a.id::text,'athletes',a.id);
end $f$;

create or replace function private.trg_notify_coach_injury_zones()
returns trigger language plpgsql security definer set search_path to '' as $f$
declare aid uuid; zones text;
begin
 select a.id into aid from public.athletes a
  where a.user_id=new.user_id or exists(select 1 from public.athlete_auth_link l where l.athlete_id=a.id and l.user_id=new.user_id)
  order by case when a.user_id=new.user_id then 0 else 1 end, a.created_at desc limit 1;
 if aid is null then return new; end if;
 select string_agg(coalesce(m.l,z),', ') into zones
  from unnest(new.injury_zones::text[]) z
  left join (values ('knee','joelho'),('shoulder','ombro'),('back','costas'),('elbow','cotovelo'),('ankle','tornozelo'),('hip','quadril')) m(k,l) on m.k=z;
 perform private.fitpro_notify_coach_health_flag(aid,'lesão em '||coalesce(zones,'região não especificada'));
 return new;
end $f$;

create or replace function private.trg_notify_coach_current_pain()
returns trigger language plpgsql security definer set search_path to '' as $f$
begin
 perform private.fitpro_notify_coach_health_flag(new.athlete_id,'dor atual'||case when length(btrim(coalesce(new.answers->>'movement_limitations','')))>0 then ' (limitação: '||left(btrim(new.answers->>'movement_limitations'),120)||')' else '' end);
 return new;
end $f$;

drop trigger if exists trg_notify_coach_injury_ins on public.user_parameters;
drop trigger if exists trg_notify_coach_injury_upd on public.user_parameters;
create trigger trg_notify_coach_injury_ins after insert on public.user_parameters
 for each row when (cardinality(new.injury_zones)>0) execute function private.trg_notify_coach_injury_zones();
create trigger trg_notify_coach_injury_upd after update of injury_zones on public.user_parameters
 for each row when (cardinality(new.injury_zones)>0 and new.injury_zones is distinct from old.injury_zones) execute function private.trg_notify_coach_injury_zones();

drop trigger if exists trg_notify_coach_pain_ins on public.app_onboarding;
drop trigger if exists trg_notify_coach_pain_upd on public.app_onboarding;
create trigger trg_notify_coach_pain_ins after insert on public.app_onboarding
 for each row when (new.answers->'current_pain'='true'::jsonb) execute function private.trg_notify_coach_current_pain();
create trigger trg_notify_coach_pain_upd after update of answers on public.app_onboarding
 for each row when (new.answers->'current_pain'='true'::jsonb and (old.answers->'current_pain') is distinct from (new.answers->'current_pain')) execute function private.trg_notify_coach_current_pain();

revoke all on function private.fitpro_notify_coach_health_flag(uuid,text) from public, anon, authenticated;
revoke all on function private.trg_notify_coach_injury_zones() from public, anon, authenticated;
revoke all on function private.trg_notify_coach_current_pain() from public, anon, authenticated;
;
