
-- ============ 1) BLINDAGEM: ninguém do cliente mexe em crédito direto ============
REVOKE EXECUTE ON FUNCTION public.fn_add_class_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_consume_class_credit(uuid, integer, text) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Students can update own credits on checkin" ON public.student_credits;
DROP POLICY IF EXISTS "Coaches can manage credits" ON public.student_credits;
DROP POLICY IF EXISTS "Trainers can manage student_credits" ON public.student_credits;
DROP POLICY IF EXISTS "Students can read own credits" ON public.student_credits;
DROP POLICY IF EXISTS "Students can view their own credits" ON public.student_credits;

CREATE POLICY "credits_select_own" ON public.student_credits FOR SELECT TO authenticated USING (
  student_id IN (SELECT a.id FROM public.athletes a WHERE a.user_id = auth.uid()
                 UNION SELECT aal.athlete_id FROM public.athlete_auth_link aal WHERE aal.user_id = auth.uid()));
CREATE POLICY "credits_select_coach_trainer" ON public.student_credits FOR SELECT TO authenticated USING (
  student_id IN (SELECT a.id FROM public.athletes a WHERE a.coach_id = auth.uid()) OR public.is_trainer(auth.uid()));

ALTER TABLE public.student_credits
  ADD CONSTRAINT student_credits_used_range_chk CHECK (used_credits >= 0 AND used_credits <= total_credits);

-- ============ 2) Colunas de controle no agendamento ============
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS credit_charged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_waived boolean NOT NULL DEFAULT false;

-- ============ 3) Motor interno de crédito (só server) ============
CREATE OR REPLACE FUNCTION public.fn_class_credit_debit(p_athlete uuid, p_appt uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.student_credits SET used_credits = used_credits + 1, updated_at = now()
   WHERE student_id = p_athlete AND total_credits - used_credits >= 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.credit_transactions (athlete_id, amount, reason, metadata)
  VALUES (p_athlete, -1, p_reason, jsonb_build_object('domain','class_credit','kind','booked','appointment_id',p_appt));
END $$;

CREATE OR REPLACE FUNCTION public.fn_class_credit_refund(p_athlete uuid, p_appt uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.student_credits SET used_credits = GREATEST(used_credits - 1, 0), updated_at = now() WHERE student_id = p_athlete;
  IF FOUND AND EXISTS (SELECT 1 FROM public.athletes WHERE id = p_athlete) THEN
    INSERT INTO public.credit_transactions (athlete_id, amount, reason, metadata)
    VALUES (p_athlete, 1, p_reason, jsonb_build_object('domain','class_credit','kind','refund','appointment_id',p_appt));
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.fn_class_credit_debit(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_class_credit_refund(uuid,uuid,text) FROM PUBLIC, anon, authenticated;

-- ============ 4) Papel do ator respeita operação interna ============
CREATE OR REPLACE FUNCTION public.fn_appt_actor_role(p_student uuid, p_actor uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN current_setting('app.appt_internal', true) = '1' THEN 'system'
              WHEN p_actor IS NULL THEN 'system'
              WHEN p_actor = public.fn_get_user_id_for_athlete(p_student) THEN 'student'
              ELSE 'teacher' END;
$$;

-- ============ 5) Guard + rastreio + crédito (substitui a versão anterior) ============
CREATE OR REPLACE FUNCTION public.fn_appointments_guard_and_track()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_actor uuid := auth.uid(); v_role text; v_src public.appointments%ROWTYPE;
        v_type_charged boolean; v_has_credit boolean;
BEGIN
  IF current_setting('app.appt_internal', true) = '1' THEN RETURN NEW; END IF;
  v_role := public.fn_appt_actor_role(NEW.student_id, v_actor);
  v_type_charged := COALESCE(NEW.appointment_type,'') IN ('aula','staff');
  v_has_credit := EXISTS (SELECT 1 FROM public.student_credits WHERE student_id = NEW.student_id);

  IF TG_OP = 'INSERT' THEN
    IF v_role = 'student' THEN
      NEW.makeup_status := NULL; NEW.cancelled_at := NULL; NEW.cancelled_by := NULL; NEW.cancelled_by_role := NULL;
      NEW.credit_waived := false;
    END IF;
    NEW.credit_charged := false;
    IF NEW.makeup_for_id IS NOT NULL THEN
      SELECT * INTO v_src FROM public.appointments WHERE id = NEW.makeup_for_id;
      IF v_src.id IS NULL OR v_src.student_id <> NEW.student_id OR v_src.status <> 'cancelled' OR v_src.makeup_status IS DISTINCT FROM 'owed' THEN
        RAISE EXCEPTION 'makeup_not_owed' USING ERRCODE = '42501';
      END IF;
    END IF;
    IF v_role IN ('student','teacher') AND v_type_charged AND v_has_credit AND NOT NEW.credit_waived
       AND NEW.status IN ('scheduled','confirmed') THEN
      PERFORM public.fn_class_credit_debit(NEW.student_id, NEW.id, 'Aula agendada');
      NEW.credit_charged := true;
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
       OR NEW.credit_charged IS DISTINCT FROM OLD.credit_charged
       OR NEW.credit_waived IS DISTINCT FROM OLD.credit_waived
       OR NEW.gym_class_id IS DISTINCT FROM OLD.gym_class_id THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
    IF OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('cancelled','confirmed') THEN
      RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- cancelamento: quem, quando, e reposição
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    NEW.cancelled_at := now(); NEW.cancelled_by := v_actor; NEW.cancelled_by_role := v_role;
    IF NEW.makeup_status IS NULL THEN
      NEW.makeup_status := CASE WHEN v_role = 'teacher' THEN 'owed' ELSE 'undecided' END;
    END IF;
  END IF;

  -- desfazer cancelamento
  IF OLD.status = 'cancelled' AND NEW.status IN ('scheduled','confirmed') THEN
    IF OLD.makeup_status = 'done' THEN RAISE EXCEPTION 'makeup_already_used' USING ERRCODE = 'P0001'; END IF;
    NEW.cancelled_at := NULL; NEW.cancelled_by := NULL; NEW.cancelled_by_role := NULL; NEW.cancel_reason := NULL;
    NEW.makeup_status := NULL;
    IF NOT NEW.credit_charged AND v_type_charged AND v_has_credit AND NOT NEW.credit_waived THEN
      PERFORM public.fn_class_credit_debit(NEW.student_id, NEW.id, 'Cancelamento desfeito');
      NEW.credit_charged := true;
    END IF;
  END IF;

  -- reposição devida => crédito volta pro saldo; revogada => crédito é cobrado de novo
  IF NEW.status = 'cancelled' AND NEW.makeup_status = 'owed' AND OLD.makeup_status IS DISTINCT FROM 'owed' AND NEW.credit_charged THEN
    PERFORM public.fn_class_credit_refund(NEW.student_id, NEW.id, 'Crédito devolvido — reposição');
    NEW.credit_charged := false;
  ELSIF NEW.status = 'cancelled' AND OLD.makeup_status = 'owed' AND NEW.makeup_status IN ('not_owed','undecided')
        AND NOT NEW.credit_charged AND v_has_credit AND v_type_charged AND NOT NEW.credit_waived THEN
    PERFORM public.fn_class_credit_debit(NEW.student_id, NEW.id, 'Reposição revogada');
    NEW.credit_charged := true;
  END IF;

  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at AND NEW.status IN ('scheduled','confirmed') THEN
    NEW.reschedule_count := COALESCE(OLD.reschedule_count,0) + 1;
  END IF;
  RETURN NEW;
END $$;

-- excluir agendamento futuro devolve o crédito
CREATE OR REPLACE FUNCTION public.fn_appointments_before_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.credit_charged AND OLD.status IN ('scheduled','confirmed') THEN
    PERFORM public.fn_class_credit_refund(OLD.student_id, OLD.id, 'Crédito devolvido — agendamento excluído');
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_appointments_before_delete ON public.appointments;
CREATE TRIGGER trg_appointments_before_delete BEFORE DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_appointments_before_delete();

-- ============ 6) reconcile do aluno: agora funciona, mas só mexe nos últimos 3 dias ============
CREATE OR REPLACE FUNCTION public.reconcile_appointments_for_user()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  PERFORM set_config('app.appt_internal','1',true);
  UPDATE public.appointments SET status = 'completed'::appointment_status, updated_at = now()
   WHERE status = 'confirmed'::appointment_status
     AND scheduled_at + (COALESCE(duration,60) || ' minutes')::interval + interval '30 minutes' < now()
     AND student_id IN (SELECT a.id FROM athletes a WHERE a.user_id = v_uid UNION SELECT aal.athlete_id FROM athlete_auth_link aal WHERE aal.user_id = v_uid);
  UPDATE public.appointments SET status = 'no_show'::appointment_status, updated_at = now()
   WHERE status = 'scheduled'::appointment_status
     AND scheduled_at + interval '30 minutes' < now()
     AND scheduled_at > now() - interval '3 days'
     AND student_id IN (SELECT a.id FROM athletes a WHERE a.user_id = v_uid UNION SELECT aal.athlete_id FROM athlete_auth_link aal WHERE aal.user_id = v_uid);
  PERFORM set_config('app.appt_internal','0',true);
END $$;

-- ============ 7) RPCs do professor / aluno ============
CREATE OR REPLACE FUNCTION public.fn_grant_class_credits(p_athlete uuid, p_amount integer, p_note text DEFAULT NULL, p_expires_at date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_total int; v_used int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF NOT (public.is_trainer(v_uid) OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = p_athlete AND a.coach_id = v_uid)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF p_amount = 0 OR abs(p_amount) > 500 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  IF p_amount > 0 THEN
    INSERT INTO public.student_credits (student_id, total_credits, used_credits, expires_at)
    VALUES (p_athlete, p_amount, 0, p_expires_at)
    ON CONFLICT (student_id) DO UPDATE
      SET total_credits = public.student_credits.total_credits + p_amount,
          expires_at = COALESCE(p_expires_at, public.student_credits.expires_at), updated_at = now()
    RETURNING total_credits, used_credits INTO v_total, v_used;
  ELSE
    UPDATE public.student_credits SET total_credits = total_credits + p_amount, updated_at = now()
     WHERE student_id = p_athlete AND total_credits + p_amount >= used_credits
    RETURNING total_credits, used_credits INTO v_total, v_used;
    IF NOT FOUND THEN RAISE EXCEPTION 'cannot_reduce_below_used' USING ERRCODE = 'P0001'; END IF;
  END IF;
  INSERT INTO public.credit_transactions (athlete_id, amount, reason, metadata)
  VALUES (p_athlete, p_amount, CASE WHEN p_amount > 0 THEN 'Créditos adicionados pelo professor' ELSE 'Ajuste de créditos' END,
          jsonb_build_object('domain','class_credit','kind', CASE WHEN p_amount > 0 THEN 'grant' ELSE 'adjust' END, 'note', p_note, 'actor', v_uid));
  RETURN jsonb_build_object('ok', true, 'total', v_total, 'used', v_used, 'remaining', v_total - v_used);
END $$;
REVOKE ALL ON FUNCTION public.fn_grant_class_credits(uuid,integer,text,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_grant_class_credits(uuid,integer,text,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_class_credit_statement(p_athlete uuid, p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_bal jsonb; v_rows jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF NOT (public.is_trainer(v_uid)
      OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = p_athlete AND (a.coach_id = v_uid OR a.user_id = v_uid))
      OR EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = p_athlete AND l.user_id = v_uid)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object('total', total_credits, 'used', used_credits, 'remaining', total_credits - used_credits, 'expires_at', expires_at)
    INTO v_bal FROM public.student_credits WHERE student_id = p_athlete;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'amount', amount, 'reason', reason, 'kind', metadata->>'kind',
           'appointment_id', metadata->>'appointment_id', 'created_at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_rows FROM (SELECT * FROM public.credit_transactions
                      WHERE athlete_id = p_athlete AND metadata->>'domain' = 'class_credit'
                      ORDER BY created_at DESC LIMIT LEAST(GREATEST(p_limit,1),300)) t;
  RETURN jsonb_build_object('balance', COALESCE(v_bal, jsonb_build_object('total',0,'used',0,'remaining',0,'expires_at',NULL)), 'transactions', v_rows);
END $$;
REVOKE ALL ON FUNCTION public.fn_class_credit_statement(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_class_credit_statement(uuid,integer) TO authenticated;

-- ============ 8) Booking nativo do aluno: sem duplo débito, sem "pending" eterno ============
DROP FUNCTION IF EXISTS public.fn_create_staff_appointment(uuid,uuid,text,timestamptz,integer,text,text,text,text);
CREATE OR REPLACE FUNCTION public.fn_create_staff_appointment(
  p_athlete_id uuid, p_teacher_id uuid, p_title text, p_scheduled_at timestamptz,
  p_duration integer DEFAULT 60, p_appointment_type text DEFAULT 'staff', p_notes text DEFAULT NULL,
  p_staff_professional_id text DEFAULT NULL, p_staff_method_id text DEFAULT NULL, p_makeup_for_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_coach uuid; v_appt public.appointments%ROWTYPE; v_rem int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND (a.user_id = v_uid OR EXISTS (
        SELECT 1 FROM public.athlete_auth_link aal WHERE aal.athlete_id = a.id AND aal.user_id = v_uid))) THEN
    RAISE EXCEPTION 'athlete_not_owned' USING ERRCODE = '42501';
  END IF;
  SELECT coach_id INTO v_coach FROM public.athletes WHERE id = p_athlete_id;
  IF p_scheduled_at <= now() OR p_duration < 15 OR p_duration > 240 THEN RAISE EXCEPTION 'invalid_schedule'; END IF;
  IF EXISTS (SELECT 1 FROM public.appointments a
      WHERE a.status IN ('scheduled'::appointment_status,'confirmed'::appointment_status)
        AND (a.student_id = p_athlete_id OR (v_coach IS NOT NULL AND a.teacher_id = v_coach))
        AND a.scheduled_at < p_scheduled_at + make_interval(mins => p_duration)
        AND a.scheduled_at + make_interval(mins => COALESCE(a.duration,60)) > p_scheduled_at) THEN
    RAISE EXCEPTION 'schedule_conflict';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.student_credits WHERE student_id = p_athlete_id AND total_credits - used_credits >= 1) THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;
  INSERT INTO public.appointments (student_id, teacher_id, title, scheduled_at, duration, status, appointment_type, notes,
      staff_professional_id, staff_method_id, integration_status, makeup_for_id)
  VALUES (p_athlete_id, v_coach, p_title, p_scheduled_at, p_duration, 'scheduled', p_appointment_type, p_notes,
      p_staff_professional_id, p_staff_method_id, CASE WHEN p_staff_professional_id IS NULL THEN 'not_sent' ELSE 'pending' END, p_makeup_for_id)
  RETURNING * INTO v_appt;
  SELECT total_credits - used_credits INTO v_rem FROM public.student_credits WHERE student_id = p_athlete_id;
  RETURN jsonb_build_object('ok', true, 'appointment_id', v_appt.id, 'credits_remaining', v_rem, 'integration_status', v_appt.integration_status);
END $$;
REVOKE ALL ON FUNCTION public.fn_create_staff_appointment(uuid,uuid,text,timestamptz,integer,text,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_create_staff_appointment(uuid,uuid,text,timestamptz,integer,text,text,text,text,uuid) TO authenticated;

-- ============ 9) Saldo inicial no ledger (sem disparar notificação) ============
ALTER TABLE public.credit_transactions DISABLE TRIGGER trg_notify_credit_transaction;
INSERT INTO public.credit_transactions (athlete_id, amount, reason, metadata)
SELECT sc.student_id, (sc.total_credits - sc.used_credits) - COALESCE(l.net,0), 'Saldo inicial',
       jsonb_build_object('domain','class_credit','kind','opening_balance')
FROM public.student_credits sc
LEFT JOIN (SELECT athlete_id, sum(amount) net FROM public.credit_transactions WHERE metadata->>'domain'='class_credit' GROUP BY athlete_id) l
  ON l.athlete_id = sc.student_id
WHERE (sc.total_credits - sc.used_credits) - COALESCE(l.net,0) <> 0;
ALTER TABLE public.credit_transactions ENABLE TRIGGER trg_notify_credit_transaction;
;
