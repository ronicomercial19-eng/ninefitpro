
-- Fix user_workout_logs: scope to user email or trainer
CREATE POLICY "Users view own workout logs" ON user_workout_logs
  FOR SELECT TO authenticated
  USING (
    user_email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
    OR is_trainer((SELECT auth.uid()))
  );

-- Fix views missing SECURITY INVOKER
ALTER VIEW v_exercises_canonical SET (security_invoker = true);
ALTER VIEW v_plans_canonical SET (security_invoker = true);
ALTER VIEW v_progress_canonical SET (security_invoker = true);
ALTER VIEW v_workout_progression SET (security_invoker = true);
ALTER VIEW v_workouts_canonical SET (security_invoker = true);
ALTER VIEW vw_assessments_unified SET (security_invoker = true);
ALTER VIEW vw_workout_progress_unified SET (security_invoker = true);
