-- Skills use the selected student and real global/per-account activation.
CREATE OR REPLACE FUNCTION public.fn_professor_active_skills(p_athlete_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'slug',s.slug,'name',s.name,'description',s.description,'category',s.category,'version',s.version,'content',s.content) ORDER BY s.name),'[]'::jsonb)
 FROM public.skills s WHERE s.status='active' AND EXISTS(SELECT 1 FROM public.skill_activations a WHERE a.skill_id=s.id AND a.active AND (a.scope='global' OR (a.scope='user' AND a.target_id=auth.uid()) OR (a.scope='athlete' AND a.target_id=p_athlete_id))));
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_active_skills(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_active_skills(uuid) TO authenticated;

-- Every model delivery pins the original source and the reviewed day prescription.
CREATE TABLE public.student_model_deliveries (
 id uuid PRIMARY KEY,athlete_id uuid NOT NULL REFERENCES public.athletes(id),template_id uuid NOT NULL REFERENCES public.ninefit_template_library(id),
 author_id uuid NOT NULL,assignment_id uuid NOT NULL REFERENCES public.student_training_assignments(id),
 template_updated_at timestamptz NOT NULL,source_snapshot jsonb NOT NULL,pdi_snapshot jsonb NOT NULL,
 schedule jsonb NOT NULL,result jsonb NOT NULL,fingerprint text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_model_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY model_delivery_read ON public.student_model_deliveries FOR SELECT TO authenticated USING(
 NOT coalesce((auth.jwt()->>'is_anonymous')::boolean,false) AND private.fitpro_can_manage_athlete(athlete_id));
REVOKE ALL ON public.student_model_deliveries FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.student_model_deliveries TO authenticated;

CREATE FUNCTION public.fn_professor_assign_model(p_template_id uuid,p_athlete_id uuid,p_schedule jsonb,p_html text,p_expected_template_update timestamptz,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.ninefit_template_library;a public.athletes;r public.student_model_deliveries;d jsonb;v_assignment uuid;v_result jsonb;v_days jsonb:='[]';v_pdi jsonb;v_hash text;v_start date;v_end date;v_date date;v_expected timestamptz;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_request_id IS NULL OR p_schedule IS NULL OR jsonb_typeof(p_schedule)<>'array' OR jsonb_array_length(p_schedule) NOT BETWEEN 1 AND 31 OR p_html IS NULL OR length(p_html)>1000000 THEN RAISE EXCEPTION 'invalid_model_delivery';END IF;
 IF (SELECT count(DISTINCT value->>'date') FROM jsonb_array_elements(p_schedule)) <> jsonb_array_length(p_schedule) THEN RAISE EXCEPTION 'duplicate_model_date';END IF;
 v_hash:=md5(jsonb_build_array(p_template_id,p_athlete_id,p_schedule,p_html,p_expected_template_update)::text);
 PERFORM pg_advisory_xact_lock(hashtextextended('model_delivery:'||p_request_id::text,0));
 SELECT * INTO r FROM public.student_model_deliveries WHERE id=p_request_id;
 IF FOUND THEN IF r.author_id<>auth.uid() OR r.fingerprint<>v_hash THEN RAISE EXCEPTION 'request_conflict';END IF;RETURN r.result||jsonb_build_object('already_published',true);END IF;
 SELECT * INTO t FROM public.ninefit_template_library WHERE id=p_template_id AND status='approved' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'template_not_approved';END IF;
 IF t.updated_at IS DISTINCT FROM p_expected_template_update THEN RAISE EXCEPTION 'template_changed_reload' USING ERRCODE='40001';END IF;
 SELECT * INTO a FROM public.athletes WHERE id=p_athlete_id;
 SELECT coalesce(public.fn_coach_student_context(p_athlete_id)#>'{daily_context,profile}','{}'::jsonb) INTO v_pdi;
 FOR d IN SELECT * FROM jsonb_array_elements(p_schedule) LOOP
   v_date:=(d->>'date')::date;
   IF v_date IS NULL OR v_date<(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'model_delivery_requires_current_or_future_date';END IF;
   v_start:=least(coalesce(v_start,v_date),v_date);v_end:=greatest(coalesce(v_end,v_date),v_date);
   v_expected:=(d->>'expected_updated_at')::timestamptz;
   v_result:=public.fn_professor_publish_workout(p_athlete_id,v_date,left(coalesce(d->>'title',t.name)||' · '||a.name,120),d->'exercises',md5(p_request_id::text||v_date::text)::uuid,v_expected);
   UPDATE public.daily_workouts SET changes_json=coalesce(changes_json,'{}'::jsonb)||jsonb_build_object('template_id',t.id,'template_name',t.name,'template_updated_at',t.updated_at,'model_delivery_id',p_request_id) WHERE id=(v_result->>'daily_workout_id')::uuid;
   v_days:=v_days||jsonb_build_array(v_result);
 END LOOP;
 INSERT INTO public.student_training_assignments(student_id,training_name,training_type,content_type,training_data,periodization_html,start_date,end_date,is_active,created_by)
 VALUES(p_athlete_id,left(t.name||' · '||a.name,200),'html',t.template_type,
 jsonb_build_object('template_id',t.id,'template_name',t.name,'model_delivery_id',p_request_id,'template_updated_at',t.updated_at,'athlete_name',a.name,'pdi',v_pdi,'schedule',p_schedule),p_html,v_start,v_end,true,auth.uid()) RETURNING id INTO v_assignment;
 v_result:=jsonb_build_object('saved',true,'athlete_id',p_athlete_id,'assignment_id',v_assignment,'delivery_id',p_request_id,'days',v_days);
 INSERT INTO public.student_model_deliveries VALUES(p_request_id,p_athlete_id,t.id,auth.uid(),v_assignment,t.updated_at,to_jsonb(t),coalesce(v_pdi,'{}'),p_schedule,v_result,v_hash,now());
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_assign_model(uuid,uuid,jsonb,text,timestamptz,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_assign_model(uuid,uuid,jsonb,text,timestamptz,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';

-- Five reusable examples per library, bound to real catalog IDs. No student
-- assignments or completed workouts are created by these catalog seeds.
DO $$
DECLARE owner_id uuid; names text[]:=ARRAY['Agachamento goblet','Remada baixa','Supino com halteres','Ponte de glúteos','Prancha frontal']; ids uuid[]:=ARRAY[]::uuid[];eid uuid; i integer; supers jsonb; refs jsonb; label text; labels text[]:=ARRAY['Corpo inteiro','Ênfase em força','Base técnica','Rotina compacta','Consistência semanal'];
BEGIN
 SELECT c.coach_id INTO owner_id FROM private.ninefit_customer_entry_config c JOIN public.profiles p ON p.user_id=c.coach_id WHERE c.singleton AND c.enabled AND p.is_active=true LIMIT 1;
 IF owner_id IS NULL THEN RAISE EXCEPTION 'example_library_requires_configured_owner';END IF;
 FOR i IN 1..5 LOOP
   SELECT id INTO eid FROM public.exercises WHERE lower(name)=lower(names[i]) ORDER BY created_at LIMIT 1;
   IF eid IS NULL THEN INSERT INTO public.exercises(name,instructions,created_by) VALUES(names[i],'Exercício de referência. O professor define técnica, dose e adequação ao aluno antes de publicar.',owner_id) RETURNING id INTO eid;END IF;
   ids:=array_append(ids,eid);
 END LOOP;
 FOR i IN 1..5 LOOP
   label:='9FIT · '||labels[i];
   supers:=jsonb_build_array(jsonb_build_object('exercise_id',ids[i],'sets',3,'reps_range',CASE WHEN i=5 THEN '20 s' ELSE '8-12' END,'rest_seconds',60,'notes','A1 · alternar com A2 após revisão do professor'),jsonb_build_object('exercise_id',ids[(i%5)+1],'sets',3,'reps_range',CASE WHEN (i%5)+1=5 THEN '20 s' ELSE '8-12' END,'rest_seconds',60,'notes','A2 · alternar com A1 após revisão do professor'));
   refs:=supers||jsonb_build_array(jsonb_build_object('exercise_id',ids[((i+1)%5)+1],'sets',2,'reps_range',CASE WHEN ((i+1)%5)+1=5 THEN '20 s' ELSE '10' END,'rest_seconds',60,'notes','Dose de referência; revisar conforme PDI'));
   IF NOT EXISTS(SELECT 1 FROM public.super_sets WHERE name=label AND created_by=owner_id) THEN INSERT INTO public.super_sets(name,exercises,exercise_count,created_by) VALUES(label,supers,2,owner_id);END IF;
   IF NOT EXISTS(SELECT 1 FROM public.reference_series WHERE name=label AND created_by=owner_id) THEN INSERT INTO public.reference_series(name,exercises,created_by) VALUES(label,refs,owner_id);END IF;
   INSERT INTO public.ninefit_template_library(slug,name,template_type,status,source_html,prescription_schema,required_variables,metadata,created_by)
   VALUES('9fit-reference-'||i,label,'bundle','approved','<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>body{font-family:system-ui;background:#101010;color:white;padding:24px}h1{color:#ff7417}</style></head><body><h1>{{athlete_name}}</h1><h2>'||label||'</h2><p>Objetivo: {{goal}}</p><p>{{pdi}}</p><h3>Treino revisado pelo professor</h3><p>{{protocol_blocks}}</p></body></html>',jsonb_build_object('exercises',refs),jsonb_build_array('athlete_name','goal','pdi','protocol_blocks'),jsonb_build_object('example',true,'requires_professional_review',true),owner_id)
   ON CONFLICT(slug) DO NOTHING;
 END LOOP;
END $$;
