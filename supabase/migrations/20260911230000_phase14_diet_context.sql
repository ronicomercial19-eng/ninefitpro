create or replace view public.vw_fitpro_diet_context
with (security_invoker = true)
as
select a.id as athlete_id,a.coach_id,a.primary_goal,a.peso_kg,a.altura_cm,
 d.id as diet_assignment_id,d.diet_name,d.diet_description,d.diet_type,d.diet_data,
 d.start_date,d.end_date,d.is_active,coalesce(l.days_logged,0)::bigint as days_logged_30d,
 coalesce(l.meals_logged,0)::bigint as meals_logged_30d,coalesce(l.avg_calories,0)::numeric as avg_calories_30d,
 coalesce(l.avg_protein,0)::numeric as avg_protein_30d,
 case when d.id is null then 'self_guided' when d.is_active then 'assigned' else 'inactive' end as diet_mode
from public.athletes a
left join lateral (select x.* from public.student_diet_assignments x where x.student_id=a.id or x.student_id=a.aluno_id order by x.is_active desc,x.updated_at desc nulls last limit 1) d on true
left join lateral (select count(distinct n.date) filter(where n.date>=current_date-30) as days_logged,count(*) filter(where n.date>=current_date-30) as meals_logged,avg(n.calories) filter(where n.date>=current_date-30) as avg_calories,avg(n.protein) filter(where n.date>=current_date-30) as avg_protein from public.nutrition_logs n where n.athlete_id=a.id) l on true;
comment on view public.vw_fitpro_diet_context is 'Fase 14: contexto autônomo de Dieta para aluno e RON.';
grant select on public.vw_fitpro_diet_context to authenticated;
