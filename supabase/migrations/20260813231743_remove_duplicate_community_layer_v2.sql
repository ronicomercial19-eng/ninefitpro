drop trigger if exists trg_auto_post_workout on workout_executions;
drop trigger if exists trg_auto_post_workout_insert on workout_executions;
drop trigger if exists trg_update_challenge_progress on workout_executions;
drop trigger if exists trg_update_challenge_progress_insert on workout_executions;

drop table if exists feed_comments cascade;
drop table if exists feed_kudos cascade;
drop table if exists feed_posts cascade;
drop table if exists challenge_participants cascade;
drop table if exists challenges cascade;
drop table if exists athlete_follows cascade;

drop function if exists fn_auto_post_workout_completion() cascade;
drop function if exists fn_update_challenge_progress() cascade;
drop function if exists fn_notify_new_follow() cascade;
drop function if exists fn_notify_new_kudos() cascade;
drop function if exists fn_notify_new_comment() cascade;
drop function if exists fn_update_kudos_count() cascade;
drop function if exists fn_update_comments_count() cascade;
drop function if exists fn_update_follow_counts() cascade;
drop function if exists fn_update_challenge_participants_count() cascade;

alter table athletes
  drop column if exists followers_count,
  drop column if exists following_count;;
