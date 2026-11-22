
create or replace function private.fitpro_stage(p_key text, p_title text, p_steps jsonb)
returns jsonb language sql immutable set search_path to '' as $f$
 select jsonb_build_object('key',p_key,'title',p_title,'steps',p_steps,'done',x.d,'total',x.t,'completed',(x.t>0 and x.d=x.t))
 from (select count(*) filter (where (s->>'done')::boolean) as d, count(*) as t from jsonb_array_elements(p_steps) s) x
$f$;

create or replace function private.fitpro_onboardings_for(p_athlete_id uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare a record; up record; cs record; act record; evs text[]; w int; stages jsonb; cur text;
begin
 select * into a from public.athletes where id=p_athlete_id;
 if not found then raise exception 'athlete_not_found'; end if;
 select * into up from public.user_parameters where user_id=a.user_id order by updated_at desc limit 1;
 select * into cs from public.user_context_settings where user_id=a.user_id;
 select * into act from public.athlete_activation where athlete_id=p_athlete_id order by created_at desc limit 1;
 select coalesce(array_agg(distinct event_key),'{}') into evs from public.activation_events where user_id=a.user_id;
 select count(*) into w from public.athlete_profile_snapshots where athlete_id=p_athlete_id and source='workout_complete';

 stages:=jsonb_build_array(
  private.fitpro_stage('ativacao_rapida','Ativação rápida',jsonb_build_array(
   jsonb_build_object('key','foto','label','Foto de perfil','done',coalesce(btrim(a.avatar_url),'')<>''),
   jsonb_build_object('key','nome','label','Nome','done',coalesce(btrim(a.name),'')<>''),
   jsonb_build_object('key','objetivo','label','Objetivo','done',up.goal is not null),
   jsonb_build_object('key','lesao','label','Dor ou lesão','done',coalesce(cs.declared_keys,'{}') @> array['injury_zones']),
   jsonb_build_object('key','frequencia','label','Dias por semana','done',a.weekly_frequency is not null))),
  private.fitpro_stage('conhecer_app','Conhecer o app',jsonb_build_array(
   jsonb_build_object('key','tour_treino','label','Treinos','done','tour_treino'=any(evs)),
   jsonb_build_object('key','tour_progresso','label','Progresso','done','tour_progresso'=any(evs)),
   jsonb_build_object('key','tour_professor','label','Falar com o professor','done','tour_professor'=any(evs)))),
  private.fitpro_stage('usar_app','Usar o app',jsonb_build_array(
   jsonb_build_object('key','avaliacao','label','Primeira avaliação','done',act.assessment_done_at is not null),
   jsonb_build_object('key','plano','label','Plano gerado','done',act.plan_generated_at is not null),
   jsonb_build_object('key','primeiro_treino','label','Primeiro treino','done',act.first_workout_at is not null or w>=1),
   jsonb_build_object('key','tres_treinos','label','3 treinos concluídos','done',w>=3)))
 );
 select s->>'key' into cur from jsonb_array_elements(stages) s where not (s->>'completed')::boolean limit 1;
 return jsonb_build_object('athlete_id',p_athlete_id,'current',cur,'stages',stages,'generated_at',now());
end $f$;

create or replace function public.fn_my_onboardings()
returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare a uuid;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'account_required' using errcode='42501'; end if;
 a:=public.fn_current_athlete_id();
 if a is null then raise exception 'athlete_profile_required'; end if;
 return private.fitpro_onboardings_for(a);
end $f$;

create or replace function public.fn_student_onboardings(p_athlete_id uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $f$
begin
 if auth.uid() is null or not private.fitpro_can_manage_athlete(p_athlete_id) then raise exception 'forbidden' using errcode='42501'; end if;
 return private.fitpro_onboardings_for(p_athlete_id);
end $f$;

revoke all on function private.fitpro_onboardings_for(uuid) from public, anon, authenticated;
revoke all on function public.fn_my_onboardings() from public, anon;
revoke all on function public.fn_student_onboardings(uuid) from public, anon;
grant execute on function public.fn_my_onboardings() to authenticated;
grant execute on function public.fn_student_onboardings(uuid) to authenticated;
;
