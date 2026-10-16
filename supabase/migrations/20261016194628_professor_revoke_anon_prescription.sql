-- The three-argument overload checks athlete access, but it must not be
-- exposed as an anonymous SECURITY DEFINER RPC.
REVOKE EXECUTE ON FUNCTION public.prescrever_treino(uuid, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prescrever_treino(uuid, date, boolean) TO authenticated;
