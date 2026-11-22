create or replace function public.fn_search_exercises_by_muscle_term(p_term text, p_limit int default 8)
returns table(id uuid, name text)
language sql
stable
as $$
  select e.id, e.name
  from public.exercises e
  where exists (
    select 1 from unnest(e.target_muscles) m where m ilike p_term
  )
  limit p_limit;
$$;;
