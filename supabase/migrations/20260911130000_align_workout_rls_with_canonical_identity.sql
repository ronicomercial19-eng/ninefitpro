-- Align direct workout reads/writes with the canonical athlete resolver.
-- Keep trainer access unchanged; do not add a second permissive policy.

DROP POLICY IF EXISTS "Athletes manage own executions" ON public.workout_executions;
CREATE POLICY "Athletes manage own executions"
  ON public.workout_executions
  FOR ALL TO authenticated
  USING (athlete_id = public.fn_current_athlete_id() OR is_trainer((SELECT auth.uid())))
  WITH CHECK (athlete_id = public.fn_current_athlete_id() OR is_trainer((SELECT auth.uid())));

DROP POLICY IF EXISTS "Athletes manage own sets" ON public.workout_exercise_sets;
CREATE POLICY "Athletes manage own sets"
  ON public.workout_exercise_sets
  FOR ALL TO authenticated
  USING (
    execution_id IN (
      SELECT we.id FROM public.workout_executions we
      WHERE we.athlete_id = public.fn_current_athlete_id()
    )
    OR is_trainer((SELECT auth.uid()))
  )
  WITH CHECK (
    execution_id IN (
      SELECT we.id FROM public.workout_executions we
      WHERE we.athlete_id = public.fn_current_athlete_id()
    )
    OR is_trainer((SELECT auth.uid()))
  );

