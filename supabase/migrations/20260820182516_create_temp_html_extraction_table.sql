CREATE TABLE IF NOT EXISTS _temp_html_extraction (
  id serial PRIMARY KEY,
  url text,
  aluno text,
  content text,
  created_at timestamptz DEFAULT now()
);;
