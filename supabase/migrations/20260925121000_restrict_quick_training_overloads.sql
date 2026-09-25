-- Keep both legacy fn_treino_rapido signatures out of the public API.
-- The canonical text,equipment overload is hardened in the preceding live
-- migration; the legacy local overload returns no data but still must not be
-- callable anonymously.
REVOKE ALL ON FUNCTION public.fn_treino_rapido(uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_treino_rapido(uuid, integer, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_treino_rapido(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_treino_rapido(uuid, text, integer, text) TO authenticated;
