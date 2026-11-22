-- =========================================================
-- 1) PROGRESSO AUTOMÁTICO DE DESAFIOS
-- =========================================================
create or replace function fn_update_challenge_progress() returns trigger as $$
declare
  cp record;
  novo_progresso numeric;
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    for cp in
      select cpt.challenge_id, cpt.athlete_id, cpt.joined_at, c.goal_metric, c.goal_value, c.end_date, c.start_date
      from challenge_participants cpt
      join challenges c on c.id = cpt.challenge_id
      where cpt.athlete_id = new.athlete_id
        and cpt.completed_at is null
        and current_date between c.start_date and c.end_date
    loop
      if cp.goal_metric = 'kg_total' then
        select coalesce(sum(total_volume_kg),0) into novo_progresso
        from workout_executions
        where athlete_id = cp.athlete_id and status = 'completed'
          and workout_date between cp.start_date and cp.end_date;

      elsif cp.goal_metric in ('treinos','treinos_concluidos','frequencia') then
        select coalesce(count(*),0) into novo_progresso
        from workout_executions
        where athlete_id = cp.athlete_id and status = 'completed'
          and workout_date between cp.start_date and cp.end_date;

      elsif cp.goal_metric = 'dias_consecutivos' then
        select coalesce(count(distinct workout_date),0) into novo_progresso
        from workout_executions
        where athlete_id = cp.athlete_id and status = 'completed'
          and workout_date between cp.start_date and cp.end_date;
      else
        novo_progresso := null;
      end if;

      if novo_progresso is not null then
        update challenge_participants
          set current_progress = novo_progresso,
              completed_at = case when novo_progresso >= cp.goal_value and completed_at is null
                                   then now() else completed_at end
          where challenge_id = cp.challenge_id and athlete_id = cp.athlete_id;

        -- Notifica conclusão de desafio
        if novo_progresso >= cp.goal_value then
          insert into notifications (user_id, title, message, type, action_url)
          select a.user_id, 'Desafio concluído! 🏆',
                 'Você bateu a meta do desafio "' || c.title || '".',
                 'success', '/desafios/' || cp.challenge_id
          from athletes a, challenges c
          where a.id = cp.athlete_id and c.id = cp.challenge_id
            and a.user_id is not null;
        end if;
      end if;
    end loop;
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_update_challenge_progress on workout_executions;
create trigger trg_update_challenge_progress
after update on workout_executions
for each row execute function fn_update_challenge_progress();

-- =========================================================
-- 2) NOTIFICAÇÕES SOCIAIS: follow, kudos, comentário
-- =========================================================

create or replace function fn_notify_new_follow() returns trigger as $$
begin
  insert into notifications (user_id, title, message, type, action_url)
  select followee.user_id,
         'Novo seguidor',
         follower.name || ' começou a seguir você.',
         'info',
         '/perfil/' || new.follower_id
  from athletes follower, athletes followee
  where follower.id = new.follower_id and followee.id = new.followee_id
    and followee.user_id is not null;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_notify_new_follow on athlete_follows;
create trigger trg_notify_new_follow
after insert on athlete_follows
for each row execute function fn_notify_new_follow();

create or replace function fn_notify_new_kudos() returns trigger as $$
begin
  insert into notifications (user_id, title, message, type, action_url)
  select dono.user_id,
         'Novo kudos 👏',
         quem_deu.name || ' curtiu seu treino.',
         'info',
         '/feed/' || new.post_id
  from feed_posts fp
  join athletes dono on dono.id = fp.athlete_id
  join athletes quem_deu on quem_deu.id = new.athlete_id
  where fp.id = new.post_id
    and dono.id <> new.athlete_id   -- não notifica se curtiu o próprio post
    and dono.user_id is not null;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_notify_new_kudos on feed_kudos;
create trigger trg_notify_new_kudos
after insert on feed_kudos
for each row execute function fn_notify_new_kudos();

create or replace function fn_notify_new_comment() returns trigger as $$
begin
  insert into notifications (user_id, title, message, type, action_url)
  select dono.user_id,
         'Novo comentário 💬',
         quem_comentou.name || ' comentou no seu treino.',
         'info',
         '/feed/' || new.post_id
  from feed_posts fp
  join athletes dono on dono.id = fp.athlete_id
  join athletes quem_comentou on quem_comentou.id = new.athlete_id
  where fp.id = new.post_id
    and dono.id <> new.athlete_id
    and dono.user_id is not null;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_notify_new_comment on feed_comments;
create trigger trg_notify_new_comment
after insert on feed_comments
for each row execute function fn_notify_new_comment();;
