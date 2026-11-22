-- QA professor: canonical role, linked students and immutable access fields.
-- Existing accounts retain their roles. New privileged accounts require trusted
-- app_metadata from a server-side provisioning flow, never user_metadata/email.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.fitpro_actor_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN p.is_active IS FALSE THEN NULL ELSE p.role::text END
  FROM public.profiles p WHERE p.user_id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION private.fitpro_actor_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.fitpro_actor_role() TO authenticated;

CREATE OR REPLACE FUNCTION private.fitpro_can_manage_athlete(p_athlete_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT COALESCE(private.fitpro_actor_role() IN ('admin','super_admin'), false)
    OR (COALESCE(private.fitpro_actor_role() IN ('professor','trainer'), false)
      AND EXISTS (SELECT 1 FROM public.athletes a
        WHERE a.id = p_athlete_id AND a.coach_id = (SELECT auth.uid())));
$$;
REVOKE ALL ON FUNCTION private.fitpro_can_manage_athlete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.fitpro_can_manage_athlete(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.fitpro_guard_profile_access()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF COALESCE(private.fitpro_actor_role() IN ('admin','super_admin'), false) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() OR NEW.role::text <> 'student'
       OR NEW.is_active IS FALSE OR NEW.status::text IS DISTINCT FROM 'pending'
       OR NEW.subscription_expires_at IS NOT NULL OR NEW.first_access_completed THEN
      RAISE EXCEPTION 'Campos de acesso só podem ser definidos pelo servidor' USING ERRCODE='42501';
    END IF;
  ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.role IS DISTINCT FROM OLD.role
    OR NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
    OR NEW.first_access_completed IS DISTINCT FROM OLD.first_access_completed THEN
    RAISE EXCEPTION 'Não é permitido alterar campos de acesso' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.fitpro_guard_profile_access() FROM PUBLIC;
DROP TRIGGER IF EXISTS fitpro_guard_profile_access ON public.profiles;
CREATE TRIGGER fitpro_guard_profile_access BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.fitpro_guard_profile_access();

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_role text := NEW.raw_app_meta_data ->> 'fitpro_role';
  v_app_role public.app_role := 'user';
  v_profile_role public.user_role := 'student';
BEGIN
  IF v_role IN ('admin','super_admin') THEN
    v_app_role := v_role::public.app_role; v_profile_role := 'admin';
  ELSIF v_role IN ('professor','trainer') THEN
    v_app_role := v_role::public.app_role; v_profile_role := 'professor';
  END IF;
  INSERT INTO public.profiles (user_id,email,role,full_name,status,is_active,created_at,updated_at)
  VALUES (NEW.id,NEW.email,v_profile_role,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name',NEW.raw_user_meta_data ->> 'name',split_part(NEW.email,'@',1)),
    'active',true,now(),now())
  ON CONFLICT (user_id) DO UPDATE SET email=EXCLUDED.email,updated_at=now();
  INSERT INTO public.user_roles (user_id,role) VALUES (NEW.id,v_app_role)
  ON CONFLICT (user_id,role) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS admin_all ON public.athletes;
CREATE POLICY admin_all ON public.athletes FOR ALL TO authenticated
USING (private.fitpro_actor_role() IN ('admin','super_admin'))
WITH CHECK (private.fitpro_actor_role() IN ('admin','super_admin'));
DROP POLICY IF EXISTS coach_manage_own ON public.athletes;
CREATE POLICY coach_manage_own ON public.athletes FOR ALL TO authenticated
USING (coach_id = (SELECT auth.uid()) AND private.fitpro_actor_role() IN ('professor','trainer'))
WITH CHECK (coach_id = (SELECT auth.uid()) AND private.fitpro_actor_role() IN ('professor','trainer'));

CREATE OR REPLACE FUNCTION private.fitpro_guard_athlete_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF COALESCE(private.fitpro_actor_role() IN ('admin','super_admin'),false) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.coach_id IS DISTINCT FROM OLD.coach_id OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'Vínculos do aluno só podem ser alterados pelo servidor' USING ERRCODE='42501';
  END IF;
  IF TG_OP = 'INSERT' AND (
    (private.fitpro_actor_role() IN ('professor','trainer') AND NEW.user_id IS NOT NULL)
    OR (private.fitpro_actor_role() NOT IN ('professor','trainer') AND NEW.coach_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Vínculo do aluno requer autorização do servidor' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_guard_athlete_identity() FROM PUBLIC;
DROP TRIGGER IF EXISTS fitpro_guard_athlete_identity ON public.athletes;
CREATE TRIGGER fitpro_guard_athlete_identity BEFORE INSERT OR UPDATE ON public.athletes
FOR EACH ROW EXECUTE FUNCTION private.fitpro_guard_athlete_identity();

-- Replace all overlapping policies: permissive policies are OR-combined.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='appointments' LOOP
    EXECUTE format('DROP POLICY %I ON public.appointments',p.policyname);
  END LOOP;
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='student_training_assignments' LOOP
    EXECUTE format('DROP POLICY %I ON public.student_training_assignments',p.policyname);
  END LOOP;
END $$;

CREATE POLICY fitpro_appointments_read ON public.appointments FOR SELECT TO authenticated USING (
  private.fitpro_can_manage_athlete(student_id) OR student_id = public.fn_current_athlete_id()
);
CREATE POLICY fitpro_appointments_staff_insert ON public.appointments FOR INSERT TO authenticated WITH CHECK (
  private.fitpro_can_manage_athlete(student_id)
  AND (private.fitpro_actor_role() IN ('admin','super_admin') OR teacher_id = (SELECT auth.uid()))
);
CREATE POLICY fitpro_appointments_student_insert ON public.appointments FOR INSERT TO authenticated WITH CHECK (
  student_id = public.fn_current_athlete_id()
  AND (teacher_id IS NULL OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.id=student_id AND a.coach_id=teacher_id))
);
CREATE POLICY fitpro_appointments_update ON public.appointments FOR UPDATE TO authenticated USING (
  private.fitpro_can_manage_athlete(student_id) OR student_id = public.fn_current_athlete_id()
) WITH CHECK (
  private.fitpro_can_manage_athlete(student_id) OR student_id = public.fn_current_athlete_id()
);
CREATE POLICY fitpro_appointments_delete ON public.appointments FOR DELETE TO authenticated USING (
  private.fitpro_can_manage_athlete(student_id)
);

CREATE OR REPLACE FUNCTION private.fitpro_guard_appointment_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF COALESCE(private.fitpro_actor_role() IN ('admin','super_admin'),false) THEN RETURN NEW; END IF;
  IF NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id THEN
    RAISE EXCEPTION 'Vínculos do agendamento só podem ser alterados por administrador' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_guard_appointment_identity() FROM PUBLIC;
DROP TRIGGER IF EXISTS fitpro_guard_appointment_identity ON public.appointments;
CREATE TRIGGER fitpro_guard_appointment_identity BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.fitpro_guard_appointment_identity();

CREATE POLICY fitpro_assignments_read ON public.student_training_assignments FOR SELECT TO authenticated USING (
  private.fitpro_can_manage_athlete(student_id) OR student_id = public.fn_current_athlete_id()
);
CREATE POLICY fitpro_assignments_insert ON public.student_training_assignments FOR INSERT TO authenticated WITH CHECK (
  private.fitpro_can_manage_athlete(student_id)
  AND (created_by = (SELECT auth.uid()) OR private.fitpro_actor_role() IN ('admin','super_admin'))
);
CREATE POLICY fitpro_assignments_update ON public.student_training_assignments FOR UPDATE TO authenticated USING (
  private.fitpro_can_manage_athlete(student_id)
) WITH CHECK (private.fitpro_can_manage_athlete(student_id));
CREATE POLICY fitpro_assignments_delete ON public.student_training_assignments FOR DELETE TO authenticated USING (
  private.fitpro_can_manage_athlete(student_id)
);

REVOKE ALL ON public.profiles, public.user_roles, public.appointments, public.student_training_assignments FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.profiles, public.user_roles, public.appointments, public.student_training_assignments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Creating login links is a server/admin operation; a trainer must not attach
-- an arbitrary auth identity to an athlete belonging to another coach.
DROP POLICY IF EXISTS "Trainers can insert links" ON public.athlete_auth_link;
CREATE POLICY fitpro_links_admin_insert ON public.athlete_auth_link FOR INSERT TO authenticated
WITH CHECK (private.fitpro_actor_role() IN ('admin','super_admin'));

DROP POLICY IF EXISTS "Trainers can manage all bookings" ON public.class_bookings;
CREATE POLICY fitpro_bookings_staff ON public.class_bookings FOR ALL TO authenticated USING (
  private.fitpro_actor_role() IN ('admin','super_admin')
  OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.user_id=class_bookings.user_id
    AND a.coach_id=(SELECT auth.uid()) AND private.fitpro_actor_role() IN ('professor','trainer'))
) WITH CHECK (
  private.fitpro_actor_role() IN ('admin','super_admin')
  OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.user_id=class_bookings.user_id
    AND a.coach_id=(SELECT auth.uid()) AND private.fitpro_actor_role() IN ('professor','trainer'))
);
DROP POLICY IF EXISTS credits_select_coach_trainer ON public.student_credits;
CREATE POLICY credits_select_coach_trainer ON public.student_credits FOR SELECT TO authenticated
USING (private.fitpro_can_manage_athlete(student_id));
