
-- 1. Senha temporária em texto plano
ALTER TABLE public.athletes DROP COLUMN IF EXISTS auto_password_temp;

-- 2. api_access_logs
DROP POLICY IF EXISTS "System can insert api logs" ON public.api_access_logs;
CREATE POLICY "Authenticated insert api logs" ON public.api_access_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- 3. api_connectors
DROP POLICY IF EXISTS "connectors readable" ON public.api_connectors;
CREATE POLICY "connectors readable by staff" ON public.api_connectors
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_trainer(auth.uid()));

-- 4. estudantes
DROP POLICY IF EXISTS "Authenticated can view students" ON public.estudantes;
CREATE POLICY "Staff can view students" ON public.estudantes
  FOR SELECT TO authenticated
  USING (public.is_trainer(auth.uid()) OR public.is_admin(auth.uid()));

-- 5. exercise_logs (sem user_id direto; valida via workout_logs.student_id)
DROP POLICY IF EXISTS "Authenticated can view exercise logs" ON public.exercise_logs;
CREATE POLICY "Owner or staff view exercise logs" ON public.exercise_logs
  FOR SELECT TO authenticated
  USING (
    public.is_trainer(auth.uid()) OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workout_logs wl
      WHERE wl.id = exercise_logs.workout_log_id AND wl.student_id = auth.uid()
    )
  );

-- 6. exercises
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='exercises'
      AND cmd='ALL' AND qual='auth.role() = ''authenticated'''
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.exercises', pol.policyname); END LOOP;
END $$;
DROP POLICY IF EXISTS "Anyone authenticated can read exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated read exercises" ON public.exercises;
CREATE POLICY "Authenticated read exercises" ON public.exercises
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff write exercises" ON public.exercises;
CREATE POLICY "Staff write exercises" ON public.exercises
  FOR ALL TO authenticated
  USING (public.is_trainer(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_trainer(auth.uid()) OR public.is_admin(auth.uid()));

-- 7. real_time_analytics
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='real_time_analytics' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.real_time_analytics', pol.policyname); END LOOP;
END $$;
CREATE POLICY "Own analytics insert" ON public.real_time_analytics
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 8. user_achievements
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='user_achievements' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_achievements', pol.policyname); END LOOP;
END $$;
CREATE POLICY "Own achievements insert" ON public.user_achievements
  FOR INSERT TO authenticated
  WITH CHECK (
    user_email = public.current_user_email()
    OR public.is_trainer(auth.uid()) OR public.is_admin(auth.uid())
  );

-- 9. user_credits
DROP POLICY IF EXISTS "Authenticated can view credits" ON public.user_credits;
CREATE POLICY "Owner view credits" ON public.user_credits
  FOR SELECT TO authenticated
  USING (user_email = public.current_user_email() OR public.is_admin(auth.uid()));

-- 10. user_plans
DROP POLICY IF EXISTS "Authenticated can view plans" ON public.user_plans;
CREATE POLICY "Owner view plans" ON public.user_plans
  FOR SELECT TO authenticated
  USING (user_email = public.current_user_email() OR public.is_admin(auth.uid()));

-- 11. user_profile_details
DROP POLICY IF EXISTS "Authenticated can view profile details" ON public.user_profile_details;
CREATE POLICY "Owner view profile details" ON public.user_profile_details
  FOR SELECT TO authenticated
  USING (
    user_email = public.current_user_email()
    OR public.is_admin(auth.uid()) OR public.is_trainer(auth.uid())
  );

-- 12. user_workout_logs
DROP POLICY IF EXISTS "Authenticated can view workout logs" ON public.user_workout_logs;
CREATE POLICY "Owner view user workout logs" ON public.user_workout_logs
  FOR SELECT TO authenticated
  USING (
    user_email = public.current_user_email()
    OR public.is_trainer(auth.uid()) OR public.is_admin(auth.uid())
  );

-- 13. workout_logs
DROP POLICY IF EXISTS "Authenticated can view workout logs" ON public.workout_logs;
CREATE POLICY "Owner or staff view workout logs" ON public.workout_logs
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_trainer(auth.uid()) OR public.is_admin(auth.uid())
  );
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='workout_logs' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.workout_logs', pol.policyname); END LOOP;
END $$;
CREATE POLICY "Owner or staff insert workout logs" ON public.workout_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    OR public.is_trainer(auth.uid()) OR public.is_admin(auth.uid())
  );

-- 14. workout_models
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='workout_models'
      AND cmd='ALL' AND qual='auth.role() = ''authenticated'''
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.workout_models', pol.policyname); END LOOP;
END $$;
DROP POLICY IF EXISTS "Staff manage workout models" ON public.workout_models;
CREATE POLICY "Staff manage workout models" ON public.workout_models
  FOR ALL TO authenticated
  USING (public.is_trainer(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_trainer(auth.uid()) OR public.is_admin(auth.uid()));

-- 15. planos_de_treino_gerados
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='planos_de_treino_gerados'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.planos_de_treino_gerados', pol.policyname); END LOOP;
END $$;
CREATE POLICY "Owner manage plans" ON public.planos_de_treino_gerados
  FOR ALL TO authenticated
  USING (professor_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (professor_id = auth.uid() OR public.is_admin(auth.uid()));

-- 16. reference_series
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='reference_series'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.reference_series', pol.policyname); END LOOP;
END $$;
CREATE POLICY "Authenticated read reference series" ON public.reference_series
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner manage reference series" ON public.reference_series
  FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- 17. supersets
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='supersets'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.supersets', pol.policyname); END LOOP;
END $$;
CREATE POLICY "Authenticated read supersets" ON public.supersets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner manage supersets" ON public.supersets
  FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- 18. fitpro_events
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='fitpro_events' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.fitpro_events', pol.policyname); END LOOP;
END $$;
CREATE POLICY "Authenticated insert fitpro events" ON public.fitpro_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- 19. profile_periodization_matches
DO $$ DECLARE pol record; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='profile_periodization_matches' AND cmd='INSERT'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.profile_periodization_matches', pol.policyname); END LOOP;
END $$;
CREATE POLICY "Owner insert periodization matches" ON public.profile_periodization_matches
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = user_profile_id AND up.user_id = auth.uid())
    OR public.is_admin(auth.uid()) OR public.is_trainer(auth.uid())
  );

-- 20. students política quebrada
DROP POLICY IF EXISTS "Students can view their profile" ON public.students;
