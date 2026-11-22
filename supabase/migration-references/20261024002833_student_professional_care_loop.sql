-- Shared care loop: explicit requests, accountable responses and separate read receipts.
CREATE OR REPLACE FUNCTION private.care_module_route(p_module text,p_professional boolean) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$ SELECT CASE WHEN p_professional THEN professional ELSE student END FROM(VALUES ('onboarding','/9fit/first-access','/app/alunos'),('daily','/9fit/os','/app/acompanhamento'),('training','/9fit/train','/app/treino-ia'),('planning','/9fit/planejamento','/app/smart-periodizer'),('feedback','/9fit/pos-treino','/app/acompanhamento'),('assessment','/9fit/progresso','/app/alunos'),('profile','/9fit/profile','/app/alunos'),('nutrition','/9fit/dieta','/app/alunos'),('foods','/9fit/foods','/app/acompanhamento'),('hydration','/9fit/acompanhamento','/app/acompanhamento'),('schedule','/9fit/aulas-creditos','/app/agenda'),('ron','/9fit/ron','/app/ron'),('community','/9fit/community','/app/community'),('library','/9fit/biblioteca','/app/exercicios'),('healthflix','/9fit/healthflix','/app/healthflix'),('habits','/9fit/habit-flow','/app/acompanhamento'),('posture','/9fit/postura-pro','/app/postura-pro'),('bio','/9fit/elite-bio','/app/acompanhamento'),('kitchen','/9fit/kitchen','/app/alunos'),('recovery','/9fit/recovery','/app/alunos'),('collections','/9fit/collections','/app/smart-periodizer'),('move','/9fit/move','/app/acompanhamento'),('messages','/9fit/mensagens','/app/mensagens'),('staff','/9fit/staff','/app/alunos'),('weekly','/9fit/acompanhamento','/app/acompanhamento'),('general','/9fit/acompanhamento','/app/acompanhamento')) AS m(key,student,professional) WHERE key=p_module $$;
REVOKE ALL ON FUNCTION private.care_module_route(text,boolean) FROM PUBLIC;
CREATE TABLE public.student_care_threads(
 id uuid PRIMARY KEY,athlete_id uuid NOT NULL REFERENCES public.athletes(id),module text NOT NULL,
 subject text NOT NULL CHECK(length(btrim(subject)) BETWEEN 1 AND 160),created_by uuid NOT NULL REFERENCES auth.users(id),
 status text NOT NULL CHECK(status IN('awaiting_professional','awaiting_student','closed')),
 resolution_requested boolean NOT NULL DEFAULT false,revision integer NOT NULL DEFAULT 1,
 student_seen_revision integer NOT NULL DEFAULT 0,professional_seen_revision integer NOT NULL DEFAULT 0,
 professional_seen_by uuid,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX care_threads_inbox ON public.student_care_threads(athlete_id,status,updated_at DESC,id);
CREATE TABLE public.student_care_events(
 id uuid PRIMARY KEY,thread_id uuid NOT NULL REFERENCES public.student_care_threads(id),actor_id uuid NOT NULL REFERENCES auth.users(id),
 actor_role text NOT NULL CHECK(actor_role IN('student','professional')),action text NOT NULL,
 body text NOT NULL CHECK(length(body)<=4000),fingerprint jsonb NOT NULL,revision integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(thread_id,revision));
CREATE INDEX care_events_history ON public.student_care_events(thread_id,revision DESC);
ALTER TABLE public.student_care_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_care_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY care_threads_read ON public.student_care_threads FOR SELECT TO authenticated USING(private.fitpro_can_read_student(athlete_id));
CREATE POLICY care_events_read ON public.student_care_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.student_care_threads t WHERE t.id=thread_id AND private.fitpro_can_read_student(t.athlete_id)));
REVOKE ALL ON public.student_care_threads,public.student_care_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.student_care_threads TO authenticated;
-- The request fingerprint is internal; never expose a second copy of the submitted payload.
GRANT SELECT(id,thread_id,actor_id,actor_role,action,body,revision,created_at) ON public.student_care_events TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_care_write(p_id uuid,p_module text,p_subject text,p_body text,p_event_id uuid,p_action text DEFAULT 'reply',p_expected_revision integer DEFAULT NULL,p_athlete_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.student_care_threads;e public.student_care_events;a uuid;v_role text;v_receiver uuid;v_coach uuid;v_fingerprint jsonb;v_new boolean;
BEGIN
 IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM false OR private.fitpro_actor_role() IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='42501';END IF;
 IF p_id IS NULL OR p_event_id IS NULL OR p_action IS NULL OR p_action NOT IN('open','reply','request_info','resolve','acknowledge') OR length(coalesce(p_body,''))>4000 THEN RAISE EXCEPTION 'invalid_care_request';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('care-event:'||p_event_id::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('care-thread:'||p_id::text,0));
 SELECT * INTO t FROM public.student_care_threads WHERE id=p_id FOR UPDATE;v_new:=NOT FOUND;
 IF v_new THEN
  a:=CASE WHEN private.fitpro_actor_role() IN('professor','trainer','admin','super_admin') THEN p_athlete_id ELSE public.fn_current_athlete_id() END;
 ELSE a:=t.athlete_id;END IF;
 IF NOT coalesce(private.fitpro_can_read_student(a),false) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_athlete_id IS NOT NULL AND p_athlete_id<>a THEN RAISE EXCEPTION 'athlete_mismatch' USING ERRCODE='42501';END IF;
 v_role:=CASE WHEN private.fitpro_can_manage_athlete(a) THEN 'professional' ELSE 'student' END;
 v_fingerprint:=jsonb_build_object('thread',p_id,'module',p_module,'subject',p_subject,'body',btrim(coalesce(p_body,'')),'action',p_action,'expected',p_expected_revision,'athlete',a);
 SELECT * INTO e FROM public.student_care_events WHERE id=p_event_id;
 IF FOUND THEN
  IF e.actor_id<>auth.uid() OR e.fingerprint<>v_fingerprint THEN RAISE EXCEPTION 'request_conflict';END IF;
  RETURN jsonb_build_object('saved',true,'thread_id',p_id,'revision',e.revision,'already_saved',true);
 END IF;
 SELECT coach_id INTO v_coach FROM public.athletes WHERE id=a;
 IF v_coach IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=v_coach AND is_active IS NOT FALSE AND role::text IN('professor','trainer','admin','super_admin')) THEN RAISE EXCEPTION 'professional_unavailable';END IF;
 IF v_new THEN
  IF p_action<>'open' OR private.care_module_route(p_module,false) IS NULL OR length(btrim(coalesce(p_subject,''))) NOT BETWEEN 1 AND 160 OR length(btrim(coalesce(p_body,'')))<1 THEN RAISE EXCEPTION 'invalid_care_open';END IF;
  INSERT INTO public.student_care_threads(id,athlete_id,module,subject,created_by,status) VALUES(p_id,a,p_module,btrim(p_subject),auth.uid(),CASE WHEN v_role='professional' THEN 'awaiting_student' ELSE 'awaiting_professional' END) RETURNING * INTO t;
 ELSE
  IF p_expected_revision IS DISTINCT FROM t.revision THEN RAISE EXCEPTION 'care_changed_reload' USING ERRCODE='40001';END IF;
  IF p_action='open' OR p_module IS DISTINCT FROM t.module OR p_subject IS DISTINCT FROM t.subject THEN RAISE EXCEPTION 'invalid_care_action';END IF;
  IF v_role='professional' AND p_action NOT IN('reply','request_info','resolve') THEN RAISE EXCEPTION 'action_not_allowed' USING ERRCODE='42501';END IF;
  IF v_role='student' AND p_action NOT IN('reply','acknowledge') THEN RAISE EXCEPTION 'action_not_allowed' USING ERRCODE='42501';END IF;
  IF p_action='acknowledge' AND t.status<>'awaiting_student' THEN RAISE EXCEPTION 'no_orientation_to_confirm';END IF;
  IF p_action<>'acknowledge' AND length(btrim(coalesce(p_body,'')))<1 THEN RAISE EXCEPTION 'reply_required';END IF;
  UPDATE public.student_care_threads SET revision=revision+1,updated_at=now(),
   status=CASE WHEN p_action='acknowledge' THEN 'closed' WHEN v_role='professional' THEN 'awaiting_student' ELSE 'awaiting_professional' END,
   resolution_requested=(p_action='resolve') WHERE id=t.id RETURNING * INTO t;
 END IF;
 INSERT INTO public.student_care_events(id,thread_id,actor_id,actor_role,action,body,fingerprint,revision)
 VALUES(p_event_id,t.id,auth.uid(),v_role,p_action,CASE WHEN p_action='acknowledge' THEN 'Orientação recebida e confirmada pelo aluno.' ELSE btrim(p_body) END,v_fingerprint,t.revision);
 UPDATE public.student_care_threads SET student_seen_revision=CASE WHEN v_role='student' THEN revision ELSE student_seen_revision END,
 professional_seen_revision=CASE WHEN v_role='professional' THEN revision ELSE professional_seen_revision END,
 professional_seen_by=CASE WHEN v_role='professional' THEN auth.uid() ELSE professional_seen_by END WHERE id=t.id;
 IF v_role='student' THEN v_receiver:=v_coach;
 ELSE SELECT coalesce(user_id,(SELECT l.user_id FROM public.athlete_auth_link l WHERE l.athlete_id=a ORDER BY l.created_at LIMIT 1)) INTO v_receiver FROM public.athletes WHERE id=a;END IF;
 IF v_receiver IS NOT NULL THEN
 INSERT INTO public.notifications(user_id,title,message,type,action_url,related_id,related_table)
 VALUES(v_receiver,CASE WHEN v_role='student' THEN 'Acompanhamento do aluno' ELSE 'Devolutiva do profissional' END,'Há uma atualização no seu acompanhamento.','info',CASE WHEN v_role='student' THEN '/app/acompanhamento?athlete='||a::text||'&care='||t.id::text ELSE '/9fit/acompanhamento?care='||t.id::text END,p_event_id,'student_care_events');END IF;
 RETURN jsonb_build_object('saved',true,'thread_id',t.id,'revision',t.revision,'status',t.status,'already_saved',false);
END $$;
REVOKE ALL ON FUNCTION public.fn_care_write(uuid,text,text,text,uuid,text,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_care_write(uuid,text,text,text,uuid,text,integer,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_care_seen(p_id uuid,p_revision integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.student_care_threads;v_prof boolean;
BEGIN
 SELECT * INTO t FROM public.student_care_threads WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT coalesce(private.fitpro_can_read_student(t.athlete_id),false) THEN RAISE EXCEPTION 'care_access_denied' USING ERRCODE='42501';END IF;
 IF p_revision IS NULL OR p_revision<1 OR p_revision>t.revision THEN RAISE EXCEPTION 'invalid_seen_revision';END IF;
 v_prof:=private.fitpro_can_manage_athlete(t.athlete_id);
 UPDATE public.student_care_threads SET student_seen_revision=CASE WHEN NOT v_prof THEN greatest(student_seen_revision,p_revision) ELSE student_seen_revision END,
 professional_seen_revision=CASE WHEN v_prof THEN greatest(professional_seen_revision,p_revision) ELSE professional_seen_revision END,
 professional_seen_by=CASE WHEN v_prof THEN auth.uid() ELSE professional_seen_by END WHERE id=t.id;
 RETURN jsonb_build_object('saved',true,'revision',p_revision);
END $$;
REVOKE ALL ON FUNCTION public.fn_care_seen(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_care_seen(uuid,integer) TO authenticated;
