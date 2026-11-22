-- Fase 2: fixa search_path nas funções internas de treino.
ALTER FUNCTION public._selecionar_exercicios_bloco(uuid, text[], integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.calcular_sync_score_real(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_treino_rapido(uuid, integer, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_treino_rapido(uuid, text, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_resolver_aluno_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_ajustar_treino_real(uuid, uuid) SET search_path = public, pg_temp;
