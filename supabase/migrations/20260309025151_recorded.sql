
-- Fase 5: Ecosystem Config table
-- Stores module configuration for 9FIT ecosystem integration

CREATE TABLE IF NOT EXISTS public.ecosystem_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id text NOT NULL,
  config_key text NOT NULL,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_id, config_key)
);

ALTER TABLE public.ecosystem_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write ecosystem config
CREATE POLICY "Admins can manage ecosystem config"
  ON public.ecosystem_config
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Professors can read config
CREATE POLICY "Professors can read ecosystem config"
  ON public.ecosystem_config
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

-- Updated_at trigger
CREATE TRIGGER update_ecosystem_config_updated_at
  BEFORE UPDATE ON public.ecosystem_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default config for smartreino module
INSERT INTO public.ecosystem_config (module_id, config_key, config_value, description) VALUES
  ('smartreino', 'module_info', '{"name": "SmartReino", "version": "1.0.0", "description": "Gestão de Treinos Inteligente"}', 'Module identity and version'),
  ('smartreino', 'ecosystem_mode', '{"mode": "standalone"}', 'standalone or connected'),
  ('smartreino', 'features', '{"centralAuth": false, "centralAnalytics": false, "centralStorage": false, "crossModuleEvents": false}', 'Feature flags for ecosystem integration'),
  ('smartreino', 'data_contract', '{"canonical_views": ["v_students_canonical", "v_assessments_canonical", "v_assignments_canonical", "v_periodizations_canonical", "v_exercises_canonical", "v_workouts_canonical", "v_progress_canonical", "v_plans_canonical"], "api_routes": ["/api/v1/training/generate", "/api/v1/training/modify", "/api/v1/training/full-plan", "/api/v1/analytics/recommend", "/api/v1/assessments/analyze"], "domains": ["users", "training", "assessments", "progress", "content", "commerce", "analytics", "system"]}', 'Data contract: views, routes, and domains exposed by this module'),
  ('smartreino', 'webhook_endpoints', '{"on_workout_created": null, "on_student_enrolled": null, "on_assessment_created": null}', 'Webhook URLs for cross-module event dispatch (null = disabled)')
ON CONFLICT (module_id, config_key) DO NOTHING;
;
