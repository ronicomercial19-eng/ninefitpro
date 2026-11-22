
create or replace function public.fn_student_curriculum(p_athlete_id uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $f$
declare
 a record; up record; cs record; ob record; act record;
 has_up boolean:=false; has_ob boolean:=false; has_act boolean:=false;
 pages jsonb:='[]'::jsonb; alerts jsonb:='[]'::jsonb; f jsonb;
 w_count int; w_last timestamptz; w_rpe numeric;
begin
 if auth.uid() is null or not private.fitpro_can_manage_athlete(p_athlete_id) then
  raise exception 'forbidden' using errcode='42501';
 end if;
 select id,user_id,name into a from public.athletes where id=p_athlete_id;
 if not found then raise exception 'athlete_not_found'; end if;

 select * into up from public.user_parameters where user_id=a.user_id order by updated_at desc limit 1;
 has_up:=found;
 select * into cs from public.user_context_settings where user_id=a.user_id;
 select * into ob from public.app_onboarding where athlete_id=p_athlete_id;
 has_ob:=found;
 select * into act from public.athlete_activation where athlete_id=p_athlete_id order by created_at desc limit 1;
 has_act:=found;

 -- Pagina 1: ativacao inicial (PDI)
 if has_up then
  pages:=pages||jsonb_build_array(jsonb_build_object(
   'key','ativacao','title','Ativação','completed_at',cs.pdi_completed_at,
   'fields',jsonb_build_array(
    jsonb_build_object('key','goal','label','Objetivo','value',to_jsonb(up.goal::text)),
    jsonb_build_object('key','time_horizon','label','Horizonte (semanas)','value',to_jsonb(up.time_horizon)),
    jsonb_build_object('key','recovery_rate','label','Recuperação','value',to_jsonb(up.recovery_rate::text)),
    jsonb_build_object('key','volume_tolerance','label','Tolerância a volume','value',to_jsonb(up.volume_tolerance)),
    jsonb_build_object('key','peak_window','label','Melhor horário','value',to_jsonb(up.peak_window::text)),
    jsonb_build_object('key','stress_sensitivity','label','Sensibilidade ao estresse','value',to_jsonb(up.stress_sensitivity)),
    jsonb_build_object('key','discomfort_tolerance','label','Tolerância a desconforto','value',to_jsonb(up.discomfort_tolerance::text)),
    jsonb_build_object('key','injury_zones','label','Zonas de lesão','value',to_jsonb(up.injury_zones)),
    jsonb_build_object('key','dietary_restrictions','label','Restrições alimentares','value',to_jsonb(up.dietary_restrictions))
   )));
  if coalesce(array_length(up.injury_zones,1),0)>0 then
   alerts:=alerts||jsonb_build_array(jsonb_build_object('level','atencao','text','Zonas de lesão declaradas na ativação: '||array_to_string(up.injury_zones,', ')||'.'));
  end if;
  if coalesce(array_length(up.dietary_restrictions,1),0)>0 then
   alerts:=alerts||jsonb_build_array(jsonb_build_object('level','info','text','Restrições alimentares: '||array_to_string(up.dietary_restrictions,', ')||'.'));
  end if;
 end if;

 -- Pagina 2: perfil do app (onboarding)
 if has_ob then
  select coalesce(jsonb_agg(jsonb_build_object('key',t.k,'label',t.l,'value',ob.answers->t.k) order by t.o),'[]'::jsonb) into f
  from (values ('full_name','Nome',1),('gender','Sexo',2),('birthdate','Nascimento',3),('weight_kg','Peso (kg)',4),('height_cm','Altura (cm)',5),
   ('experience','Experiência',6),('training_days','Dias de treino',7),('session_minutes','Minutos por sessão',8),
   ('training_environment','Local de treino',9),('equipment','Equipamentos',10),('current_pain','Dor atual',11),
   ('movement_limitations','Limitações de movimento',12)) t(k,l,o)
  where ob.answers ? t.k;
  pages:=pages||jsonb_build_array(jsonb_build_object('key','perfil_app','title','Perfil do app','completed_at',ob.completed_at,'fields',f));
  if ob.answers->'current_pain'='true'::jsonb then
   alerts:=alerts||jsonb_build_array(jsonb_build_object('level','atencao','text','Aluno relatou dor atual no onboarding.'));
  end if;
  if length(btrim(coalesce(ob.answers->>'movement_limitations','')))>0 then
   alerts:=alerts||jsonb_build_array(jsonb_build_object('level','atencao','text','Limitação de movimento: '||btrim(ob.answers->>'movement_limitations')));
  end if;
 end if;

 -- Pagina 3: jornada de ativacao
 if has_act then
  pages:=pages||jsonb_build_array(jsonb_build_object('key','jornada','title','Jornada','completed_at',act.finished_at,'fields',jsonb_build_array(
   jsonb_build_object('key','assessment_done_at','label','Avaliação feita em','value',to_jsonb(act.assessment_done_at)),
   jsonb_build_object('key','plan_generated_at','label','Plano gerado em','value',to_jsonb(act.plan_generated_at)),
   jsonb_build_object('key','first_workout_at','label','Primeiro treino em','value',to_jsonb(act.first_workout_at)),
   jsonb_build_object('key','consistency_days','label','Dias de consistência','value',to_jsonb(act.consistency_days)))));
 end if;

 -- Pagina 4: treinos
 select count(*), max(created_at),
        avg(case when s.snapshot_data->>'avg_rpe' ~ '^[0-9]+(\.[0-9]+)?$' then (s.snapshot_data->>'avg_rpe')::numeric end)
   into w_count, w_last, w_rpe
   from public.athlete_profile_snapshots s where s.athlete_id=p_athlete_id and s.source='workout_complete';
 if w_count>0 then
  pages:=pages||jsonb_build_array(jsonb_build_object('key','treinos','title','Treinos','completed_at',null,'fields',jsonb_build_array(
   jsonb_build_object('key','total','label','Treinos concluídos','value',to_jsonb(w_count)),
   jsonb_build_object('key','last','label','Último treino','value',to_jsonb(w_last)),
   jsonb_build_object('key','avg_rpe','label','RPE médio','value',to_jsonb(round(w_rpe,1))))));
 end if;

 if not has_up and not has_ob then
  alerts:=alerts||jsonb_build_array(jsonb_build_object('level','info','text','Aluno ainda não respondeu nenhuma ativação.'));
 end if;

 return jsonb_build_object('athlete_id',a.id,'name',a.name,'pages',pages,'alerts',alerts,'generated_at',now());
end $f$;

revoke all on function public.fn_student_curriculum(uuid) from public, anon;
grant execute on function public.fn_student_curriculum(uuid) to authenticated;
;
