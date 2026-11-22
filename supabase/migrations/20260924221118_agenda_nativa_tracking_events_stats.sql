
-- 1) Colunas de rastreio
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_by_role text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS reschedule_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS makeup_status text,
  ADD COLUMN IF NOT EXISTS makeup_for_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_makeup_status_chk CHECK (makeup_status IS NULL OR makeup_status IN ('owed','not_owed','undecided','done')),
  ADD CONSTRAINT appointments_cancelled_by_role_chk CHECK (cancelled_by_role IS NULL OR cancelled_by_role IN ('student','teacher','system'));

UPDATE public.appointments SET makeup_status='undecided' WHERE status='cancelled' AND makeup_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_teacher_sched ON public.appointments (teacher_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_makeup ON public.appointments (student_id) WHERE makeup_status IN ('owed','undecided');

-- 2) Log de eventos
CREATE TABLE IF NOT EXISTS public.appointment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL,
  teacher_id uuid,
  event_type text NOT NULL,
  actor_id uuid,
  actor_role text,
  old_scheduled_at timestamptz,
  new_scheduled_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appt_events_teacher ON public.appointment_events (teacher_id, created_at);
CREATE INDEX IF NOT EXISTS idx_appt_events_athlete ON public.appointment_events (athlete_id, created_at);
ALTER TABLE public.appointment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appt_events_select" ON public.appointment_events FOR SELECT TO authenticated USING (
  teacher_id = auth.uid() OR public.is_trainer(auth.uid())
  OR athlete_id IN (SELECT a.id FROM public.athletes a WHERE a.user_id = auth.uid()
                    UNION SELECT aal.athlete_id FROM public.athlete_auth_link aal WHERE aal.user_id = auth.uid())
);

-- 3) Papel do ator
CREATE OR REPLACE FUNCTION public.fn_appt_actor_role(p_student uuid, p_actor uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN p_actor IS NULL THEN 'system'
              WHEN p_actor = public.fn_get_user_id_for_athlete(p_student) THEN 'student'
              ELSE 'teacher' END;
$$;
REVOKE ALL ON FUNCTION public.fn_appt_actor_role(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- 4) BEFORE: guarda + rastreio
CREATE OR REPLACE FUNCTION public.fn_appointments_guard_and_track()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_actor uuid := auth.uid(); v_role text; v_src public.appointments%ROWTYPE;
BEGIN
  v_role := public.fn_appt_actor_role(NEW.student_id, v_actor);
  IF current_setting('app.appt_internal', true) = '1' THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_role = 'student' THEN
      NEW.makeup_status := NULL; NEW.cancelled_at := NULL; NEW.cancelled_by := NULL; NEW.cancelled_by_role := NULL;
    END IF;
    IF NEW.makeup_for_id IS NOT NULL THEN
      SELECT * INTO v_src FROM public.appointments WHERE id = NEW.makeup_for_id;
      IF v_src.id IS NULL OR v_src.student_id <> NEW.student_id OR v_src.status <> 'cancelled' OR v_src.makeup_status IS DISTINCT FROM 'owed' THEN
        RAISE EXCEPTION 'makeup_not_owed' USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF v_role = 'student' THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
       OR NEW.integration_status IS DISTINCT FROM OLD.integration_status
       OR NEW.staff_professional_id IS DISTINCT FROM OLD.staff_professional_id
       OR NEW.staff_method_id IS DISTINCT FROM OLD.staff_method_id
       OR NEW.staff_booking_id IS DISTINCT FROM OLD.staff_booking_id
       OR NEW.makeup_status IS DISTINCT FROM OLD.makeup_status
       OR NEW.makeup_for_id IS DISTINCT FROM OLD.makeup_for_id
       OR NEW.gym_class_id IS DISTINCT FROM OLD.gym_class_id THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('cancelled','confirmed') THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    NEW.cancelled_at := now(); NEW.cancelled_by := v_actor; NEW.cancelled_by_role := v_role;
    IF NEW.makeup_status IS NULL THEN
      NEW.makeup_status := CASE WHEN v_role = 'teacher' THEN 'owed' ELSE 'undecided' END;
    END IF;
  END IF;

  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at AND NEW.status IN ('scheduled','confirmed') THEN
    NEW.reschedule_count := COALESCE(OLD.reschedule_count,0) + 1;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_appointments_guard_and_track ON public.appointments;
CREATE TRIGGER trg_appointments_guard_and_track BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_appointments_guard_and_track();

-- 5) AFTER: log de eventos + baixa da reposição
CREATE OR REPLACE FUNCTION public.fn_appointments_log_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_actor uuid := auth.uid(); v_role text := public.fn_appt_actor_role(NEW.student_id, auth.uid());
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.appointment_events (appointment_id, athlete_id, teacher_id, event_type, actor_id, actor_role, new_scheduled_at)
    VALUES (NEW.id, NEW.student_id, NEW.teacher_id, CASE WHEN NEW.makeup_for_id IS NOT NULL THEN 'makeup_created' ELSE 'created' END, v_actor, v_role, NEW.scheduled_at);
    IF NEW.makeup_for_id IS NOT NULL THEN
      PERFORM set_config('app.appt_internal','1',true);
      UPDATE public.appointments SET makeup_status='done' WHERE id = NEW.makeup_for_id;
      PERFORM set_config('app.appt_internal','0',true);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.appointment_events (appointment_id, athlete_id, teacher_id, event_type, actor_id, actor_role, reason)
    VALUES (NEW.id, NEW.student_id, NEW.teacher_id, NEW.status::text, v_actor, v_role, CASE WHEN NEW.status='cancelled' THEN NEW.cancel_reason END);
  END IF;
  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
    INSERT INTO public.appointment_events (appointment_id, athlete_id, teacher_id, event_type, actor_id, actor_role, old_scheduled_at, new_scheduled_at)
    VALUES (NEW.id, NEW.student_id, NEW.teacher_id, 'rescheduled', v_actor, v_role, OLD.scheduled_at, NEW.scheduled_at);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_appointments_log_event ON public.appointments;
CREATE TRIGGER trg_appointments_log_event AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_appointments_log_event();

-- 6) Notificações (corrige enum 'confirmed', null-safety, remarcação e confirmação do professor)
CREATE OR REPLACE FUNCTION public.fn_notify_appointment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_student_uid uuid; v_actor uuid := auth.uid(); v_by_student boolean;
BEGIN
  v_student_uid := public.fn_get_user_id_for_athlete(NEW.student_id);
  v_by_student := v_actor IS NOT NULL AND v_actor = v_student_uid;
  IF TG_OP = 'INSERT' THEN
    IF v_by_student THEN
      IF NEW.teacher_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id,'info','appointment_created','Novo agendamento de aluno',
          COALESCE(NEW.title,'Sessão')||' em '||to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM às HH24:MI'),'appointments',NEW.id);
      END IF;
    ELSIF v_student_uid IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_student_uid,'info','appointment_created','Novo agendamento',
        COALESCE(NEW.title,'Sessão')||' em '||to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM às HH24:MI'),'appointments',NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      IF v_by_student AND NEW.teacher_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id,'success','appointment_confirmed','Presença confirmada',COALESCE(NEW.title,'Agendamento')||' confirmado pelo aluno','appointments',NEW.id);
      ELSIF NOT v_by_student AND v_student_uid IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (v_student_uid,'success','appointment_confirmed','Aula confirmada',COALESCE(NEW.title,'Sua sessão')||' foi confirmada','appointments',NEW.id);
      END IF;
    ELSIF NEW.status = 'completed' AND NEW.teacher_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (NEW.teacher_id,'success','workout_completed','Sessão concluída',COALESCE(NEW.title,'Agendamento')||' marcado como concluído','appointments',NEW.id);
    ELSIF NEW.status = 'no_show' AND NEW.teacher_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (NEW.teacher_id,'warning','appointment_no_show','Aluno faltou',COALESCE(NEW.title,'Sessão')||' sem confirmação de presença','appointments',NEW.id);
    ELSIF NEW.status = 'cancelled' THEN
      IF v_student_uid IS NOT NULL AND NOT v_by_student THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (v_student_uid,'warning','appointment_cancelled','Agendamento cancelado',COALESCE(NEW.title,'Sua sessão')||' foi cancelada','appointments',NEW.id);
      END IF;
      IF NEW.teacher_id IS NOT NULL AND v_actor IS DISTINCT FROM NEW.teacher_id THEN
        INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
        VALUES (NEW.teacher_id,'warning','appointment_cancelled','Agendamento cancelado',COALESCE(NEW.title,'Sessão')||' foi cancelada','appointments',NEW.id);
      END IF;
    END IF;
  ELSIF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at AND NEW.status IN ('scheduled','confirmed') THEN
    IF v_by_student AND NEW.teacher_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (NEW.teacher_id,'info','appointment_rescheduled','Aluno remarcou',COALESCE(NEW.title,'Sessão')||' para '||to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM às HH24:MI'),'appointments',NEW.id);
    ELSIF NOT v_by_student AND v_student_uid IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, event_type, title, message, related_table, related_id)
      VALUES (v_student_uid,'info','appointment_rescheduled','Aula remarcada',COALESCE(NEW.title,'Sua sessão')||' agora é '||to_char(NEW.scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM às HH24:MI'),'appointments',NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 7) Painel de números do professor
CREATE OR REPLACE FUNCTION public.fn_professor_agenda_stats(p_year integer DEFAULT NULL, p_month integer DEFAULT NULL, p_teacher uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_teacher uuid := COALESCE(p_teacher, auth.uid());
  v_now timestamptz := now() AT TIME ZONE 'America/Sao_Paulo';
  v_y int := COALESCE(p_year, EXTRACT(year FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int);
  v_m int := COALESCE(p_month, EXTRACT(month FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int);
  v_from timestamptz; v_to timestamptz; v_res jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='42501'; END IF;
  IF v_teacher <> v_uid AND NOT public.is_trainer(v_uid) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  v_from := make_timestamptz(v_y, v_m, 1, 0, 0, 0, 'America/Sao_Paulo');
  v_to := v_from + interval '1 month';

  WITH a AS (
    SELECT ap.*, ath.name AS aluno
    FROM public.appointments ap JOIN public.athletes ath ON ath.id = ap.student_id
    WHERE ap.teacher_id = v_teacher AND ap.scheduled_at >= v_from AND ap.scheduled_at < v_to
      AND COALESCE(ath.is_test_account,false) = false
  ), ev AS (
    SELECT e.* FROM public.appointment_events e JOIN public.athletes ath ON ath.id = e.athlete_id
    WHERE e.teacher_id = v_teacher AND e.created_at >= v_from AND e.created_at < v_to AND COALESCE(ath.is_test_account,false)=false
  ), pend AS (
    SELECT ap.student_id, ath.name AS aluno, count(*) FILTER (WHERE ap.makeup_status IN ('owed','undecided')) AS abertas,
           count(*) FILTER (WHERE ap.makeup_status='owed') AS devidas,
           count(*) FILTER (WHERE ap.makeup_status='undecided') AS a_decidir
    FROM public.appointments ap JOIN public.athletes ath ON ath.id = ap.student_id
    WHERE ap.teacher_id = v_teacher AND ap.makeup_status IN ('owed','undecided') AND COALESCE(ath.is_test_account,false)=false
    GROUP BY ap.student_id, ath.name
  )
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object('ano', v_y, 'mes', v_m),
    'totais', jsonb_build_object(
      'agendadas', (SELECT count(*) FROM a),
      'realizadas', (SELECT count(*) FROM a WHERE status='completed'),
      'canceladas', (SELECT count(*) FROM a WHERE status='cancelled'),
      'canceladas_pelo_aluno', (SELECT count(*) FROM a WHERE status='cancelled' AND cancelled_by_role='student'),
      'canceladas_pelo_professor', (SELECT count(*) FROM a WHERE status='cancelled' AND cancelled_by_role='teacher'),
      'canceladas_sem_origem', (SELECT count(*) FROM a WHERE status='cancelled' AND cancelled_by_role IS NULL),
      'faltas', (SELECT count(*) FROM a WHERE status='no_show'),
      'remarcacoes', (SELECT count(*) FROM ev WHERE event_type='rescheduled'),
      'remarcacoes_pelo_aluno', (SELECT count(*) FROM ev WHERE event_type='rescheduled' AND actor_role='student'),
      'remarcacoes_pelo_professor', (SELECT count(*) FROM ev WHERE event_type='rescheduled' AND actor_role='teacher'),
      'alunos_que_cancelaram', (SELECT count(DISTINCT student_id) FROM a WHERE status='cancelled' AND cancelled_by_role='student'),
      'pendentes_de_baixa', (SELECT count(*) FROM a WHERE status IN ('scheduled','confirmed') AND scheduled_at < now()),
      'proximas', (SELECT count(*) FROM a WHERE status IN ('scheduled','confirmed') AND scheduled_at >= now()),
      'reposicoes_devidas', (SELECT COALESCE(sum(devidas),0) FROM pend),
      'reposicoes_a_decidir', (SELECT COALESCE(sum(a_decidir),0) FROM pend),
      'reposicoes_feitas_no_mes', (SELECT count(*) FROM a WHERE makeup_for_id IS NOT NULL AND status IN ('completed','scheduled','confirmed'))
    ),
    'por_aluno', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'aluno')) FROM (
      SELECT jsonb_build_object(
        'athlete_id', student_id, 'aluno', aluno,
        'realizadas', count(*) FILTER (WHERE status='completed'),
        'canceladas', count(*) FILTER (WHERE status='cancelled'),
        'canceladas_pelo_aluno', count(*) FILTER (WHERE status='cancelled' AND cancelled_by_role='student'),
        'faltas', count(*) FILTER (WHERE status='no_show'),
        'remarcacoes', COALESCE((SELECT count(*) FROM ev WHERE ev.athlete_id=a.student_id AND ev.event_type='rescheduled'),0),
        'pendentes_de_baixa', count(*) FILTER (WHERE status IN ('scheduled','confirmed') AND scheduled_at < now()),
        'reposicoes_abertas', COALESCE((SELECT abertas FROM pend WHERE pend.student_id=a.student_id),0)
      ) AS x FROM a GROUP BY student_id, aluno) s), '[]'::jsonb),
    'reposicoes_abertas', COALESCE((SELECT jsonb_agg(jsonb_build_object('athlete_id',student_id,'aluno',aluno,'abertas',abertas,'devidas',devidas,'a_decidir',a_decidir) ORDER BY aluno) FROM pend), '[]'::jsonb)
  ) INTO v_res;
  RETURN v_res;
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_agenda_stats(integer,integer,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_agenda_stats(integer,integer,uuid) TO authenticated;
;
