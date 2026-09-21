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

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    '_goal_defaults','_temp_html_extraction','fitpro_healthflix_assignments',
    'fitpro_healthflix_progress','fitpro_smartperiodizer_events','integration_secrets',
    'training_adjustment_deliveries','training_adjustment_feedback',
    'training_adjustment_recommendations','training_automation_items',
    'training_automation_runs','training_feedback_signals'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "deny direct client access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "deny direct client access" ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t);
  END LOOP;
END $$;
