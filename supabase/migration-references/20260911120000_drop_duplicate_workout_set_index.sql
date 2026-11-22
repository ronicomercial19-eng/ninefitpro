-- The existing workout_exercise_sets_unique_slot index already enforces the
-- same (execution_id, exercise_order, set_number) identity.
DROP INDEX IF EXISTS public.workout_exercise_sets_identity_idx;

