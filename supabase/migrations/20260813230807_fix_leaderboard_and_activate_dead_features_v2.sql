drop view if exists vw_leaderboard_semanal;

create view vw_leaderboard_semanal as
with agg as (
  select
    athlete_id,
    count(*) filter (where completed_at >= now() - interval '30 days') as treinos_mes,
    coalesce(sum(total_volume_kg) filter (where completed_at >= now() - interval '30 days'),0) as kg_total_mes,
    max(completed_at) as ultimo_treino
  from workout_executions
  where status = 'completed'
  group by athlete_id
),
streak as (
  select athlete_id, count(distinct workout_date) as dias_com_treino
  from workout_executions
  where status = 'completed' and workout_date >= current_date - interval '30 days'
  group by athlete_id
)
select
  a.id as athlete_id,
  a.name,
  a.avatar_url,
  coalesce(g.treinos_mes,0)::int as treinos_mes,
  coalesce(g.kg_total_mes,0) as kg_total_mes,
  coalesce(s.dias_com_treino,0)::int as streak_dias,
  coalesce(a.xp_total,0) as xp_total,
  coalesce(a.level,1) as level,
  rank() over (order by coalesce(g.kg_total_mes,0) desc) as rank_volume,
  rank() over (order by coalesce(g.treinos_mes,0) desc) as rank_frequencia,
  rank() over (order by coalesce(s.dias_com_treino,0) desc) as rank_streak
from athletes a
left join agg g on g.athlete_id = a.id
left join streak s on s.athlete_id = a.id
where a.is_public_profile is true;

comment on view vw_leaderboard_semanal is 'Ranking calculado direto de workout_executions (user_stats_agg estava vazia/não confiável). Últimos 30 dias.';

create or replace function fn_award_xp_on_workout_completion() returns trigger as $$
declare
  xp_ganho int;
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    xp_ganho := 20
      + coalesce((new.duration_minutes / 10)::int, 0)
      + case when new.rating >= 4 then 10 else 0 end;

    update athletes
      set xp_total = coalesce(xp_total,0) + xp_ganho,
          level = greatest(1, floor(sqrt(coalesce(xp_total,0) + xp_ganho) / 10)::int + 1)
      where id = new.athlete_id;
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_award_xp_on_workout on workout_executions;
create trigger trg_award_xp_on_workout
after update on workout_executions
for each row execute function fn_award_xp_on_workout_completion();

update athletes a
set xp_total = coalesce(a.xp_total,0) + backfill.total_xp,
    level = greatest(1, floor(sqrt(coalesce(a.xp_total,0) + backfill.total_xp) / 10)::int + 1)
from (
  select athlete_id,
         sum(20 + coalesce((duration_minutes/10)::int,0) + case when rating >= 4 then 10 else 0 end) as total_xp
  from workout_executions
  where status = 'completed'
  group by athlete_id
) backfill
where backfill.athlete_id = a.id;;
