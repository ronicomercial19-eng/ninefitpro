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

REVOKE ALL ON FUNCTION public._selecionar_exercicios_bloco(uuid, text[], integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_alunos_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deprecated_prescrever_treino_rapido(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.auto_link_annual_plan() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_link_athlete_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calcular_periodizacao_correspondencia(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.calcular_sync_score_real(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_and_create_pr_from_assessment(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_current_user_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_plano_treino_gerado(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gerar_blocos_protocolo_dia(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gerar_modelo_treino(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gerar_plano_contingencia(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_fitpro_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_subapp_from_plan() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND (p.proname LIKE 'trg_%' OR p.proname LIKE 'trigger_%'
        OR p.proname LIKE 'fn_core_os_%' OR p.proname LIKE 'fn_notify_%'
        OR p.proname IN ('log_audit','log_event','log_periodization_changes'))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated', r.nspname, r.proname, r.args);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.validate_partner_key(text) FROM PUBLIC, anon, authenticated;
