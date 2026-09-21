-- Fase 15: hardening de objetos que já foram aplicados no projeto.
-- Não altera o modelo de autorização funcional; remove exposições acidentais.

ALTER VIEW public.vw_athlete_periodizacao_ativa
  SET (security_invoker = true);

ALTER FUNCTION public.fn_map_phase_category(text)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.fn_check_catalog_published_complete()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.is_admin()
  SET search_path = public, pg_catalog;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon, authenticated;

ALTER TABLE public._goal_defaults ENABLE ROW LEVEL SECURITY;
