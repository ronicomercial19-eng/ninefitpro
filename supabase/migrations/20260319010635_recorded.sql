
-- Table for 729 protocol combinations (9 protocols x 9 variations x 9 models)
CREATE TABLE public.smart_treino_protocols (
  id text PRIMARY KEY, -- format: "P.V.M" e.g. "4.5.3"
  pillar text NOT NULL,
  pillar_label text NOT NULL,
  protocol_id integer NOT NULL CHECK (protocol_id BETWEEN 1 AND 9),
  protocol_name text NOT NULL,
  protocol_axis text NOT NULL,
  variation_id integer NOT NULL CHECK (variation_id BETWEEN 1 AND 9),
  variation_name text NOT NULL,
  variation_focus text NOT NULL,
  model_id integer NOT NULL CHECK (model_id BETWEEN 1 AND 9),
  model_description text NOT NULL,
  block_neural text NOT NULL DEFAULT '',
  block_integration text NOT NULL DEFAULT '',
  block_9_template jsonb NOT NULL DEFAULT '{}',
  block_reset text NOT NULL DEFAULT '',
  rpe_range text NOT NULL DEFAULT '5-7',
  recommended_for text[] NOT NULL DEFAULT '{"iniciante","intermediario","avancado"}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: professors can read all protocols
ALTER TABLE public.smart_treino_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read protocols"
  ON public.smart_treino_protocols FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage protocols"
  ON public.smart_treino_protocols FOR ALL
  TO authenticated USING (public.is_admin(auth.uid()));

-- Add protocol columns to macro_rules
ALTER TABLE public.smart_treino_macro_rules
  ADD COLUMN IF NOT EXISTS protocol_code text,
  ADD COLUMN IF NOT EXISTS pillar text,
  ADD COLUMN IF NOT EXISTS protocol_name text,
  ADD COLUMN IF NOT EXISTS variation_name text,
  ADD COLUMN IF NOT EXISTS model_name text;
;
