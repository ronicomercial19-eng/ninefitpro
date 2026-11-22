alter view public.v_athletes set (security_invoker = true);
alter view public.vw_smarttreino_aluno_ativo set (security_invoker = true);
alter view public.vw_alunos_smarttreino set (security_invoker = true);
alter view public.vw_subapp_access_efetivo set (security_invoker = true);
alter view public.periodization_models_valid set (security_invoker = true);
alter view public.vw_athlete_periodizacao_ativa set (security_invoker = true);
alter view public.vw_alunos_canonical set (security_invoker = true);

revoke all on public.v_athletes, public.vw_smarttreino_aluno_ativo, public.vw_alunos_smarttreino, public.vw_subapp_access_efetivo, public.periodization_models_valid, public.vw_athlete_periodizacao_ativa, public.vw_alunos_canonical from anon;
grant select on public.v_athletes, public.vw_smarttreino_aluno_ativo, public.vw_alunos_smarttreino, public.vw_subapp_access_efetivo, public.periodization_models_valid, public.vw_athlete_periodizacao_ativa, public.vw_alunos_canonical to authenticated;
