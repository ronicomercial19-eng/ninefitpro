CREATE OR REPLACE FUNCTION public.fn_assessment_can_read(p_athlete_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select auth.uid() is not null and NOT coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists (
   select 1 from athletes a where a.id=p_athlete_id and (
     a.user_id=auth.uid() or a.coach_id=auth.uid()
     or exists(select 1 from athlete_auth_link l where l.athlete_id=a.id and l.user_id=auth.uid())
     or exists(select 1 from alunos al where al.id=a.aluno_id and al.professor_id=auth.uid())
   )
 );
$function$;
CREATE POLICY assessment_goals_canonical_actor ON public.metas_progresso FOR ALL TO authenticated
USING(public.fn_assessment_can_read(athlete_id)) WITH CHECK(public.fn_assessment_can_read(athlete_id));
