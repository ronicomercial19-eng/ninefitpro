drop index if exists public.workout_executions_one_open_assignment_idx;
create unique index workout_executions_one_open_assignment_idx
on public.workout_executions (athlete_id, assignment_id)
where assignment_id is not null and status = 'in_progress';
