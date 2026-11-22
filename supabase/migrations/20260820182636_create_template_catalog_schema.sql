CREATE TABLE IF NOT EXISTS training_html_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  nome text NOT NULL,
  descricao text,
  categoria text NOT NULL, -- 'musculacao' | 'corrida' | 'clinico' | 'reabilitacao' | 'hibrido' | 'gestante'
  tags text[] DEFAULT '{}',
  preview_color text,
  html_template text NOT NULL, -- template com placeholders {{aluno_nome}}, {{exercicios_json}}, etc
  variaveis_requeridas jsonb DEFAULT '[]', -- lista de placeholders que o template espera
  origem_arquivo text, -- de qual HTML real este foi extraído (auditoria)
  ativo boolean DEFAULT true,
  vezes_usado int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_html_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES training_html_templates(id),
  athlete_id uuid NOT NULL,
  professor_id uuid,
  training_name text,
  rendered_html text NOT NULL,
  variaveis_usadas jsonb,
  storage_path text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_html_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_html_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_read_all" ON training_html_templates FOR SELECT USING (true);
CREATE POLICY "deliveries_read_own" ON training_html_deliveries FOR SELECT USING (true);;
