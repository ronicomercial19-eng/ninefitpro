CREATE TABLE IF NOT EXISTS public.densificacao_parametros (
  metodo_codigo text NOT NULL REFERENCES public.densificacao_metodos(codigo) ON DELETE CASCADE,
  nivel text NOT NULL REFERENCES public.densificacao_niveis(nivel) ON DELETE CASCADE,
  series_min int NOT NULL CHECK (series_min >= 1),
  series_max int NOT NULL CHECK (series_max >= series_min),
  descanso_intra_seg_min int NOT NULL DEFAULT 0,
  descanso_intra_seg_max int NOT NULL DEFAULT 0,
  descanso_pos_seg int NOT NULL DEFAULT 90,
  limite_por_sessao int NULL CHECK (limite_por_sessao IS NULL OR limite_por_sessao >= 1),
  observacao text,
  PRIMARY KEY (metodo_codigo, nivel),
  CHECK (descanso_intra_seg_max >= descanso_intra_seg_min)
);

ALTER TABLE public.densificacao_parametros ENABLE ROW LEVEL SECURITY;
CREATE POLICY densificacao_parametros_read ON public.densificacao_parametros FOR SELECT TO authenticated USING (true);

INSERT INTO public.densificacao_parametros
  (metodo_codigo, nivel, series_min, series_max, descanso_intra_seg_min, descanso_intra_seg_max, descanso_pos_seg, limite_por_sessao, observacao) VALUES
  ('superset_agonista_antagonista','iniciante',2,3,0,30,60,NULL,'2 a 3 séries por par; 0 a 30 s entre exercícios do par; 60 a 90 s após o par'),
  ('superset_agonista_antagonista','intermediario',3,4,0,30,90,NULL,'3 a 4 séries por par'),
  ('superset_agonista_antagonista','avancado',4,5,0,30,90,NULL,'4 a 5 séries por par'),
  ('superset_mesmo_musculo','intermediario',2,3,0,15,90,1,'Máximo 1 par por sessão; reduz carga total'),
  ('superset_mesmo_musculo','avancado',3,4,0,15,90,1,'Máximo 1 par por sessão; reduz carga total'),
  ('cluster','intermediario',3,4,15,30,150,2,'3 a 4 séries de 2 a 3 clusters; 2 a 3 min entre séries'),
  ('cluster','avancado',4,5,15,30,150,2,'4 a 5 séries de 2 a 3 clusters; 2 a 3 min entre séries'),
  ('rest_pause','intermediario',1,1,15,20,120,1,'1 série até perto da falha, depois 2 mini-séries'),
  ('rest_pause','avancado',1,1,15,20,120,1,'1 série até perto da falha, depois 2 a 3 mini-séries'),
  ('drop_set','intermediario',1,1,0,0,120,2,'1 série com 2 quedas de 10 a 20% de carga'),
  ('drop_set','avancado',1,1,0,0,120,2,'1 série com 2 a 3 quedas de 10 a 20% de carga'),
  ('pre_exaustao','avancado',1,1,0,30,120,1,'1 série isolada de 12 a 15 repetições, depois o composto; só para músculo em atraso'),
  ('piramide','iniciante',3,3,60,90,60,NULL,'3 degraus, ex.: 12, 10, 8 repetições'),
  ('piramide','intermediario',4,4,60,90,60,NULL,'4 degraus'),
  ('piramide','avancado',4,5,60,90,60,NULL,'4 a 5 degraus')
ON CONFLICT (metodo_codigo, nivel) DO NOTHING;

UPDATE public.densificacao_metodos SET ativo = false WHERE codigo = 'tri_set';;
