-- Restringe RPCs internos de treino ao contexto autenticado.
REVOKE EXECUTE ON FUNCTION public._selecionar_exercicios_bloco(uuid, text[], integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calcular_sync_score_real(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_treino_rapido(uuid, integer, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_treino_rapido(uuid, text, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_resolver_aluno_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_ajustar_treino_real(uuid, uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public._selecionar_exercicios_bloco(uuid, text[], integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_sync_score_real(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_treino_rapido(uuid, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_treino_rapido(uuid, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_resolver_aluno_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ajustar_treino_real(uuid, uuid) TO authenticated;
