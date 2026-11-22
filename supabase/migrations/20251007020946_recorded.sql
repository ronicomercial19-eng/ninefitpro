-- Criar tabela para armazenar avaliações físicas recebidas do Base44
CREATE TABLE IF NOT EXISTS public.avaliacoes_fisicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_base44 TEXT UNIQUE,
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE NOT NULL,
  data_avaliacao DATE NOT NULL,
  peso NUMERIC,
  altura NUMERIC,
  idade INTEGER,
  gordura NUMERIC,
  squat_carga NUMERIC,
  squat_reps INTEGER,
  squat_1rm NUMERIC,
  dados_completos JSONB DEFAULT '{}'::jsonb,
  sincronizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela para logs de sincronização
CREATE TABLE IF NOT EXISTS public.logs_sincronizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  status TEXT NOT NULL,
  dados_enviados JSONB,
  dados_resposta JSONB,
  erro TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.avaliacoes_fisicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_sincronizacao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para avaliacoes_fisicas
CREATE POLICY "Professores podem ver avaliações de seus alunos"
  ON public.avaliacoes_fisicas
  FOR SELECT
  USING (
    aluno_id IN (
      SELECT id FROM public.alunos WHERE professor_id = auth.uid()
    )
  );

CREATE POLICY "Sistema pode inserir avaliações"
  ON public.avaliacoes_fisicas
  FOR INSERT
  WITH CHECK (true);

-- Políticas RLS para logs_sincronizacao
CREATE POLICY "Apenas admins podem ver logs"
  ON public.logs_sincronizacao
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Sistema pode inserir logs"
  ON public.logs_sincronizacao
  FOR INSERT
  WITH CHECK (true);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_fisicas_aluno_id ON public.avaliacoes_fisicas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_fisicas_data ON public.avaliacoes_fisicas(data_avaliacao);
CREATE INDEX IF NOT EXISTS idx_logs_sincronizacao_created ON public.logs_sincronizacao(created_at DESC);;
