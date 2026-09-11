-- Reusable design/prescription/protocol library.
-- Legacy HTML imports remain drafts until reviewed and parameterized.

CREATE TABLE IF NOT EXISTS public.ninefit_template_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('design', 'prescription', 'protocol', 'bundle')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  source_legacy_id integer UNIQUE,
  source_url text,
  source_html text,
  design_tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  prescription_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  protocol_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ninefit_template_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage NineFit template library" ON public.ninefit_template_library;
CREATE POLICY "Staff manage NineFit template library"
  ON public.ninefit_template_library
  FOR ALL TO authenticated
  USING (is_admin((SELECT auth.uid())) OR is_trainer((SELECT auth.uid())))
  WITH CHECK (is_admin((SELECT auth.uid())) OR is_trainer((SELECT auth.uid())));

INSERT INTO public.ninefit_template_library
  (slug, name, template_type, status, source_legacy_id, source_url, source_html,
   required_variables, metadata)
SELECT
  'legacy-html-' || id,
  COALESCE((regexp_match(content, '<title[^>]*>([^<]+)</title>'))[1], 'Legacy HTML #' || id),
  'bundle',
  'draft',
  id,
  url,
  content,
  '["athlete_name", "goal", "metrics", "protocol_blocks"]'::jsonb,
  jsonb_build_object('imported_from', '_temp_html_extraction', 'needs_parameterization', true)
FROM public._temp_html_extraction
ON CONFLICT (source_legacy_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS ninefit_template_library_type_status_idx
  ON public.ninefit_template_library(template_type, status);

COMMENT ON TABLE public.ninefit_template_library IS
  'Reusable NineFit design, prescription and fixed protocol templates. Legacy imports are drafts until reviewed.';

