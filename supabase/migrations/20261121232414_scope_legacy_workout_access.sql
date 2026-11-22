-- Replace overlapping legacy policies, including direct auth.users lookups, with explicit roles and ownership.
DO $policies$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='workouts' LOOP
  EXECUTE format('DROP POLICY %I ON public.workouts',p.policyname);
 END LOOP;
END $policies$;
CREATE POLICY workouts_scoped_read ON public.workouts FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false) AND (
 private.fitpro_can_manage_athlete(student_id)
 OR EXISTS(SELECT 1 FROM public.athletes a WHERE a.id=workouts.student_id AND a.user_id=(SELECT auth.uid()))
 OR EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=workouts.student_id AND l.user_id=(SELECT auth.uid()))
 OR EXISTS(SELECT 1 FROM public.students s WHERE s.id=workouts.student_id AND (s.professor_id=(SELECT auth.uid()) OR s.email=public.current_user_email()))
));
CREATE POLICY workouts_scoped_insert ON public.workouts FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false) AND (
 private.fitpro_can_manage_athlete(student_id)
 OR EXISTS(SELECT 1 FROM public.students s WHERE s.id=workouts.student_id AND s.professor_id=(SELECT auth.uid()))
));
CREATE POLICY workouts_scoped_update ON public.workouts FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false) AND (
 private.fitpro_can_manage_athlete(student_id)
 OR EXISTS(SELECT 1 FROM public.students s WHERE s.id=workouts.student_id AND s.professor_id=(SELECT auth.uid()))
)) WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false) AND (
 private.fitpro_can_manage_athlete(student_id)
 OR EXISTS(SELECT 1 FROM public.students s WHERE s.id=workouts.student_id AND s.professor_id=(SELECT auth.uid()))
));
CREATE POLICY workouts_scoped_delete ON public.workouts FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false) AND (
 private.fitpro_can_manage_athlete(student_id)
 OR EXISTS(SELECT 1 FROM public.students s WHERE s.id=workouts.student_id AND s.professor_id=(SELECT auth.uid()))
));

;
