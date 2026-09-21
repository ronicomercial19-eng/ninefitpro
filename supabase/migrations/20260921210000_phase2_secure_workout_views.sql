-- Fase 2: views críticas devem respeitar RLS do usuário chamador.
-- As tabelas-base possuem policies para authenticated; anon não deve consultar execuções.
ALTER VIEW public.vw_current_athlete SET (security_invoker = true);
ALTER VIEW public.vw_execucao_series SET (security_invoker = true);

REVOKE ALL ON TABLE public.vw_current_athlete FROM anon;
REVOKE ALL ON TABLE public.vw_execucao_series FROM anon;
GRANT SELECT ON TABLE public.vw_current_athlete TO authenticated;
GRANT SELECT ON TABLE public.vw_execucao_series TO authenticated;
