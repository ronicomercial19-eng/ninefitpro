REVOKE ALL ON FUNCTION public.fn_get_recordes(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_registrar_recorde(uuid, text, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_recordes(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_registrar_recorde(uuid, text, text, numeric, text) TO authenticated, service_role;;
