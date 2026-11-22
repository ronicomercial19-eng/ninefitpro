-- Cobre o caminho de INSERT direto com status='completed' (sem passar por update)
-- reaproveitando as mesmas funções já criadas, agora também como AFTER INSERT.

drop trigger if exists trg_award_xp_on_workout_insert on workout_executions;
create trigger trg_award_xp_on_workout_insert
after insert on workout_executions
for each row
when (new.status = 'completed')
execute function fn_award_xp_on_workout_completion();

drop trigger if exists trg_auto_post_workout_insert on workout_executions;
create trigger trg_auto_post_workout_insert
after insert on workout_executions
for each row
when (new.status = 'completed')
execute function fn_auto_post_workout_completion();

drop trigger if exists trg_update_challenge_progress_insert on workout_executions;
create trigger trg_update_challenge_progress_insert
after insert on workout_executions
for each row
when (new.status = 'completed')
execute function fn_update_challenge_progress();;
