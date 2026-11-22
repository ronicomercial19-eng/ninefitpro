-- avaliacoes_unificadas tinha RLS ligado sem NENHUMA política — ninguém
-- conseguia gravar (nem aluno em self_checkin, nem professor em avaliação
-- oficial). Espelha o padrão já usado em student_measurements.

create policy "Athletes view own avaliacoes"
  on public.avaliacoes_unificadas
  for select
  using (athlete_id in (select id from public.athletes where user_id = auth.uid()));

create policy "Athletes insert own self checkin"
  on public.avaliacoes_unificadas
  for insert
  with check (
    origem = 'self_checkin'
    and athlete_id in (select id from public.athletes where user_id = auth.uid())
  );

create policy "Professors manage athlete avaliacoes"
  on public.avaliacoes_unificadas
  for all
  using (
    athlete_id in (select id from public.athletes where coach_id = auth.uid())
    or has_role(auth.uid(), 'admin'::app_role)
  )
  with check (
    athlete_id in (select id from public.athletes where coach_id = auth.uid())
    or has_role(auth.uid(), 'admin'::app_role)
  );
;
