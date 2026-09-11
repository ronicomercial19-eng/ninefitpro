-- Cover the new assignment foreign key for joins and deletes.
CREATE INDEX IF NOT EXISTS workout_executions_assignment_id_idx
  ON public.workout_executions(assignment_id);