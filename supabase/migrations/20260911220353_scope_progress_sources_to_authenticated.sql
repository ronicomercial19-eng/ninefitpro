-- Assessments
drop policy if exists "Athletes FitPro inserem avaliacoes" on public.avaliacoes_unificadas;
create policy "Athletes FitPro inserem avaliacoes" on public.avaliacoes_unificadas for insert to authenticated with check ((athlete_id in (select athlete_id from athlete_auth_link where user_id=auth.uid())) or has_role(auth.uid(),'admin'::app_role) or has_role(auth.uid(),'professor'::app_role));
drop policy if exists "Athletes FitPro veem suas avaliacoes" on public.avaliacoes_unificadas;
create policy "Athletes FitPro veem suas avaliacoes" on public.avaliacoes_unificadas for select to authenticated using ((athlete_id in (select athlete_id from athlete_auth_link where user_id=auth.uid())) or (aluno_id in (select athlete_id from athlete_auth_link where user_id=auth.uid())));
drop policy if exists "Professores gerenciam avaliacoes de seus alunos" on public.avaliacoes_unificadas;
create policy "Professores gerenciam avaliacoes de seus alunos" on public.avaliacoes_unificadas for all to authenticated using ((aluno_id in (select id from alunos where professor_id=auth.uid())) or (athlete_id in (select id from athletes where coach_id=auth.uid())) or has_role(auth.uid(),'admin'::app_role)) with check ((aluno_id in (select id from alunos where professor_id=auth.uid())) or (athlete_id in (select id from athletes where coach_id=auth.uid())) or has_role(auth.uid(),'admin'::app_role));

-- Goals
drop policy if exists "metas: delete" on public.metas_progresso;
drop policy if exists "metas: insert" on public.metas_progresso;
drop policy if exists "metas: select" on public.metas_progresso;
drop policy if exists "metas: update" on public.metas_progresso;
create policy "metas: delete" on public.metas_progresso for delete to authenticated using (is_admin(auth.uid()) or is_aluno_professor(athlete_id,auth.uid()) or is_aluno_student(athlete_id,auth.uid()));
create policy "metas: insert" on public.metas_progresso for insert to authenticated with check (is_admin(auth.uid()) or is_aluno_professor(athlete_id,auth.uid()) or is_aluno_student(athlete_id,auth.uid()));
create policy "metas: select" on public.metas_progresso for select to authenticated using (is_admin(auth.uid()) or is_aluno_professor(athlete_id,auth.uid()) or is_aluno_student(athlete_id,auth.uid()));
create policy "metas: update" on public.metas_progresso for update to authenticated using (is_admin(auth.uid()) or is_aluno_professor(athlete_id,auth.uid()) or is_aluno_student(athlete_id,auth.uid())) with check (is_admin(auth.uid()) or is_aluno_professor(athlete_id,auth.uid()) or is_aluno_student(athlete_id,auth.uid()));

-- Personal records
drop policy if exists "pr: insert system" on public.personal_records;
drop policy if exists "pr: select" on public.personal_records;
create policy "pr: insert system" on public.personal_records for insert to authenticated with check (is_admin(auth.uid()) or is_aluno_professor(athlete_id,auth.uid()) or is_aluno_student(athlete_id,auth.uid()));
create policy "pr: select" on public.personal_records for select to authenticated using (is_admin(auth.uid()) or is_aluno_professor(athlete_id,auth.uid()) or is_aluno_student(athlete_id,auth.uid()));;
