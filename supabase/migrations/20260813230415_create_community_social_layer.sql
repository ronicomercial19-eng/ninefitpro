-- =========================================================
-- COMUNIDADE 9FIT (estilo Strava): seguir, feed, kudos,
-- comentários, desafios e leaderboard
-- =========================================================

-- Perfil público / bio (aproveita tabela athletes já existente)
alter table athletes
  add column if not exists is_public_profile boolean default true,
  add column if not exists bio text,
  add column if not exists cover_photo_url text,
  add column if not exists followers_count int default 0,
  add column if not exists following_count int default 0;

-- 1) Seguir outros alunos (rede aberta)
create table if not exists athlete_follows (
  follower_id uuid not null references athletes(id) on delete cascade,
  followee_id uuid not null references athletes(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists idx_follows_followee on athlete_follows(followee_id);
create index if not exists idx_follows_follower on athlete_follows(follower_id);

-- 2) Feed de atividades (posts: treino concluído, PR, conquista, manual)
create table if not exists feed_posts (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  post_type text not null default 'treino_concluido'
    check (post_type in ('treino_concluido','pr','conquista','desafio','manual')),
  workout_execution_id uuid references workout_executions(id) on delete set null,
  achievement_id uuid references user_achievements(id) on delete set null,
  caption text,
  image_url text,
  stats jsonb default '{}'::jsonb,      -- ex: {"duracao_min":45,"volume_kg":3200,"rpe_medio":8}
  visibility text not null default 'public' check (visibility in ('public','followers','private')),
  kudos_count int default 0,
  comments_count int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_feed_posts_athlete on feed_posts(athlete_id, created_at desc);
create index if not exists idx_feed_posts_created on feed_posts(created_at desc) where visibility = 'public';

-- 3) Kudos (curtidas)
create table if not exists feed_kudos (
  post_id uuid not null references feed_posts(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, athlete_id)
);

-- 4) Comentários
create table if not exists feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references feed_posts(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
create index if not exists idx_feed_comments_post on feed_comments(post_id, created_at);

-- 5) Desafios (challenges) em grupo, com meta e progresso
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_image_url text,
  challenge_type text not null default 'volume'
    check (challenge_type in ('volume','frequencia','streak','treinos_concluidos','custom')),
  goal_metric text not null,             -- ex: 'kg_total', 'treinos', 'dias_consecutivos'
  goal_value numeric not null,
  start_date date not null,
  end_date date not null,
  created_by uuid references athletes(id),
  is_public boolean default true,
  participants_count int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_challenges_active on challenges(start_date, end_date) where is_public = true;

create table if not exists challenge_participants (
  challenge_id uuid not null references challenges(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  joined_at timestamptz default now(),
  current_progress numeric default 0,
  completed_at timestamptz,
  primary key (challenge_id, athlete_id)
);
create index if not exists idx_challenge_participants_athlete on challenge_participants(athlete_id);

-- =========================================================
-- TRIGGERS: manter contadores sincronizados
-- =========================================================

create or replace function fn_update_kudos_count() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update feed_posts set kudos_count = kudos_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update feed_posts set kudos_count = greatest(kudos_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$ language plpgsql;

drop trigger if exists trg_kudos_count on feed_kudos;
create trigger trg_kudos_count
after insert or delete on feed_kudos
for each row execute function fn_update_kudos_count();

create or replace function fn_update_comments_count() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update feed_posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update feed_posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end; $$ language plpgsql;

drop trigger if exists trg_comments_count on feed_comments;
create trigger trg_comments_count
after insert or delete on feed_comments
for each row execute function fn_update_comments_count();

create or replace function fn_update_follow_counts() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update athletes set following_count = following_count + 1 where id = new.follower_id;
    update athletes set followers_count = followers_count + 1 where id = new.followee_id;
  elsif TG_OP = 'DELETE' then
    update athletes set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update athletes set followers_count = greatest(followers_count - 1, 0) where id = old.followee_id;
  end if;
  return null;
end; $$ language plpgsql;

drop trigger if exists trg_follow_counts on athlete_follows;
create trigger trg_follow_counts
after insert or delete on athlete_follows
for each row execute function fn_update_follow_counts();

create or replace function fn_update_challenge_participants_count() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update challenges set participants_count = participants_count + 1 where id = new.challenge_id;
  elsif TG_OP = 'DELETE' then
    update challenges set participants_count = greatest(participants_count - 1, 0) where id = old.challenge_id;
  end if;
  return null;
end; $$ language plpgsql;

drop trigger if exists trg_challenge_participants_count on challenge_participants;
create trigger trg_challenge_participants_count
after insert or delete on challenge_participants
for each row execute function fn_update_challenge_participants_count();

-- Auto-postar no feed quando um treino é concluído (estilo Strava)
create or replace function fn_auto_post_workout_completion() returns trigger as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    insert into feed_posts (athlete_id, post_type, workout_execution_id, stats, caption)
    values (
      new.athlete_id,
      'treino_concluido',
      new.id,
      jsonb_build_object(
        'duracao_min', new.duration_minutes,
        'volume_kg', new.total_volume_kg,
        'rpe_medio', new.avg_rpe,
        'fase', new.phase_name
      ),
      new.notes
    );
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_auto_post_workout on workout_executions;
create trigger trg_auto_post_workout
after update on workout_executions
for each row execute function fn_auto_post_workout_completion();

-- =========================================================
-- LEADERBORD (view): ranking semanal/mensal por volume, treinos e streak
-- =========================================================
create or replace view vw_leaderboard_semanal as
select
  a.id as athlete_id,
  a.name,
  a.avatar_url,
  coalesce(s.total_treinos_mes,0) as treinos_mes,
  coalesce(s.kg_total_mes,0) as kg_total_mes,
  coalesce(s.streak_dias,0) as streak_dias,
  coalesce(a.xp_total,0) as xp_total,
  coalesce(a.level,1) as level,
  rank() over (order by coalesce(s.kg_total_mes,0) desc) as rank_volume,
  rank() over (order by coalesce(s.total_treinos_mes,0) desc) as rank_frequencia,
  rank() over (order by coalesce(s.streak_dias,0) desc) as rank_streak
from athletes a
left join user_stats_agg s on s.athlete_id = a.id
where a.is_public_profile is true;

comment on view vw_leaderboard_semanal is 'Ranking geral entre todos os atletas com perfil público. App filtra top N ou posição do usuário atual.';;
