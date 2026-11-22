
-- Mission Control view
CREATE OR REPLACE VIEW public.dashboard_students_overview
WITH (security_invoker=on) AS
SELECT
  a.id AS athlete_id,
  a.coach_id,
  a.name,
  a.email,
  a.activated,
  a.level,
  a.total_xp,
  a.primary_goal,
  a.experience_level,
  a.created_at,
  (SELECT COUNT(*) FROM public.workout_executions we WHERE we.athlete_id = a.id AND we.status = 'completed') AS workouts_completed,
  (SELECT MAX(we.completed_at) FROM public.workout_executions we WHERE we.athlete_id = a.id AND we.status = 'completed') AS last_workout_at,
  (SELECT COUNT(*) FROM public.student_training_assignments sta WHERE sta.student_id = a.id AND sta.is_active = true) AS active_trainings,
  (SELECT COUNT(*) FROM public.student_diet_assignments sda WHERE sda.student_id = a.id AND sda.is_active = true) AS active_diets,
  COALESCE(
    (SELECT asc2.churn_risk FROM public.aluno_score_composite asc2 WHERE asc2.aluno_id = a.id),
    'desconhecido'
  ) AS churn_risk,
  COALESCE(
    (SELECT asc2.score_normalized FROM public.aluno_score_composite asc2 WHERE asc2.aluno_id = a.id),
    0
  ) AS score_normalized
FROM public.athletes a;

-- Realtime publication (idempotent)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'appointments','student_credits','student_diet_assignments',
    'student_library_assignments','library_items','notifications'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN others THEN NULL;
    END;
  END LOOP;
END $$;
