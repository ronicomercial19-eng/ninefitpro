REVOKE ALL ON FUNCTION public.fn_treino_rapido(uuid,integer,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_treino_rapido(uuid,integer,text,text) TO authenticated;;
