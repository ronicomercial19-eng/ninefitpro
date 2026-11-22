-- Ativa RLS nas 6 tabelas de comunidade criadas nesta sessão
alter table athlete_follows enable row level security;
alter table feed_posts enable row level security;
alter table feed_kudos enable row level security;
alter table feed_comments enable row level security;
alter table challenges enable row level security;
alter table challenge_participants enable row level security;

-- Helper: subquery reaproveitada nas policies para mapear auth.uid() -> athlete.id
-- (athletes.user_id já existe e liga o usuário autenticado ao registro de atleta)

-- ATHLETE_FOLLOWS: qualquer autenticado vê quem segue quem (rede aberta);
-- só pode criar/apagar o próprio follow.
create policy "follows_select_all" on athlete_follows
  for select using (true);
create policy "follows_insert_own" on athlete_follows
  for insert with check (follower_id in (select id from athletes where user_id = auth.uid()));
create policy "follows_delete_own" on athlete_follows
  for delete using (follower_id in (select id from athletes where user_id = auth.uid()));

-- FEED_POSTS: vê posts públicos, os próprios, ou de quem segue (se visibility='followers')
create policy "feed_posts_select" on feed_posts
  for select using (
    visibility = 'public'
    or athlete_id in (select id from athletes where user_id = auth.uid())
    or (visibility = 'followers' and athlete_id in (
          select followee_id from athlete_follows
          where follower_id in (select id from athletes where user_id = auth.uid())
        ))
  );
create policy "feed_posts_insert_own" on feed_posts
  for insert with check (athlete_id in (select id from athletes where user_id = auth.uid()));
create policy "feed_posts_update_own" on feed_posts
  for update using (athlete_id in (select id from athletes where user_id = auth.uid()));
create policy "feed_posts_delete_own" on feed_posts
  for delete using (athlete_id in (select id from athletes where user_id = auth.uid()));

-- FEED_KUDOS: visível pra quem vê o post; só dá/tira o próprio kudos
create policy "kudos_select" on feed_kudos
  for select using (
    post_id in (select id from feed_posts where visibility = 'public')
    or athlete_id in (select id from athletes where user_id = auth.uid())
  );
create policy "kudos_insert_own" on feed_kudos
  for insert with check (athlete_id in (select id from athletes where user_id = auth.uid()));
create policy "kudos_delete_own" on feed_kudos
  for delete using (athlete_id in (select id from athletes where user_id = auth.uid()));

-- FEED_COMMENTS: mesma lógica de visibilidade do post; só edita/apaga o próprio comentário
create policy "comments_select" on feed_comments
  for select using (
    post_id in (select id from feed_posts where visibility = 'public')
    or athlete_id in (select id from athletes where user_id = auth.uid())
  );
create policy "comments_insert_own" on feed_comments
  for insert with check (athlete_id in (select id from athletes where user_id = auth.uid()));
create policy "comments_delete_own" on feed_comments
  for delete using (athlete_id in (select id from athletes where user_id = auth.uid()));

-- CHALLENGES: vê os públicos ou os que criou; só o criador edita/apaga
create policy "challenges_select" on challenges
  for select using (is_public = true or created_by in (select id from athletes where user_id = auth.uid()));
create policy "challenges_insert_own" on challenges
  for insert with check (created_by in (select id from athletes where user_id = auth.uid()));
create policy "challenges_update_own" on challenges
  for update using (created_by in (select id from athletes where user_id = auth.uid()));
create policy "challenges_delete_own" on challenges
  for delete using (created_by in (select id from athletes where user_id = auth.uid()));

-- CHALLENGE_PARTICIPANTS: vê participantes de desafios públicos ou dos quais participa;
-- só entra/sai por conta própria (progresso é atualizado por trigger/serviço, não pelo usuário)
create policy "challenge_participants_select" on challenge_participants
  for select using (
    challenge_id in (select id from challenges where is_public = true)
    or athlete_id in (select id from athletes where user_id = auth.uid())
  );
create policy "challenge_participants_insert_own" on challenge_participants
  for insert with check (athlete_id in (select id from athletes where user_id = auth.uid()));
create policy "challenge_participants_delete_own" on challenge_participants
  for delete using (athlete_id in (select id from athletes where user_id = auth.uid()));;
