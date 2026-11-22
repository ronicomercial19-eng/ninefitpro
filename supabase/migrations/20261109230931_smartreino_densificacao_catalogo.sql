CREATE TABLE IF NOT EXISTS public.densificacao_niveis (
  nivel text PRIMARY KEY CHECK (nivel IN ('iniciante','intermediario','avancado')),
  series_min_semana int NOT NULL,
  series_max_semana int NOT NULL,
  CHECK (series_max_semana >= series_min_semana)
);

CREATE TABLE IF NOT EXISTS public.densificacao_metodos (
  codigo text PRIMARY KEY,
  nome text NOT NULL,
  estrutura text NOT NULL CHECK (estrutura IN ('NINE','LIMA')),
  bloco text NOT NULL CHECK (bloco IN ('neural','integracao','bloco9','reset')),
  evidencia text NOT NULL CHECK (evidencia IN ('alta','moderada','baixa','nao_avaliada')),
  beneficio text,
  cautela text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.densificacao_niveis (nivel, series_min_semana, series_max_semana) VALUES
  ('iniciante', 8, 12),
  ('intermediario', 12, 18),
  ('avancado', 18, 30)
ON CONFLICT (nivel) DO NOTHING;

INSERT INTO public.densificacao_metodos (codigo, nome, estrutura, bloco, evidencia, beneficio, cautela) VALUES
  ('superset_agonista_antagonista','Superset agonista-antagonista','NINE','bloco9','alta','Mesmo volume e resultado em força e hipertrofia, com sessão mais curta.','Pares do mesmo músculo reduzem a carga total; evitar nesse caso.'),
  ('superset_mesmo_musculo','Superset de mesmo músculo','NINE','bloco9','moderada','Concentra o estímulo em um grupo muscular.','Reduz a carga total em comparação com séries tradicionais.'),
  ('cluster','Cluster set','NINE','bloco9','alta','Mantém velocidade e potência ao longo da série.','Resultado crônico equivalente ao tradicional.'),
  ('rest_pause','Rest-pause','NINE','bloco9','moderada','Eficiente em tempo, especialmente em máquinas.','Sem evidência de superioridade sobre o tradicional.'),
  ('drop_set','Drop set','NINE','bloco9','moderada','Pode aumentar a força com múltiplas quedas de carga.','Alta fadiga; limitar a poucos exercícios por sessão.'),
  ('pre_exaustao','Pré-exaustão','NINE','bloco9','baixa','Pode permitir mais volume em um músculo específico.','Evidência inconclusiva; pode reduzir repetições no exercício seguinte.'),
  ('piramide','Pirâmide','NINE','bloco9','baixa','Variação de estímulo.','Resultado semelhante ao tradicional.'),
  ('tri_set','Tri-set','NINE','bloco9','nao_avaliada','A confirmar.','Sem evidência direta levantada nesta pesquisa.')
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE public.densificacao_niveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.densificacao_metodos ENABLE ROW LEVEL SECURITY;
CREATE POLICY densificacao_niveis_read ON public.densificacao_niveis FOR SELECT TO authenticated USING (true);
CREATE POLICY densificacao_metodos_read ON public.densificacao_metodos FOR SELECT TO authenticated USING (true);;
