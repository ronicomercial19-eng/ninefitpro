-- =====================================================
-- CRIAÇÃO DO SCHEMA COMPLETO DE GESTÃO DE ALUNOS
-- =====================================================

-- 1. Criar tabela de PLANOS (planos de assinatura)
CREATE TABLE IF NOT EXISTS public.planos (
  id_plano UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_plano VARCHAR(255) NOT NULL UNIQUE,
  descricao TEXT,
  duracao_dias INTEGER NOT NULL CHECK (duracao_dias > 0),
  preco DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
  recursos_incluidos JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Atualizar tabela ALUNOS com novos campos
ALTER TABLE public.alunos 
  ADD COLUMN IF NOT EXISTS nome_completo VARCHAR(255),
  ADD COLUMN IF NOT EXISTS historico_medico TEXT,
  ADD COLUMN IF NOT EXISTS restricoes_alimentares TEXT,
  ADD COLUMN IF NOT EXISTS status_plano VARCHAR(50) DEFAULT 'ativo' CHECK (status_plano IN ('ativo', 'inativo', 'suspenso', 'cancelado')),
  ADD COLUMN IF NOT EXISTS data_inicio_plano DATE,
  ADD COLUMN IF NOT EXISTS data_fim_plano DATE,
  ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
  ADD COLUMN IF NOT EXISTS id_plano_ativo UUID REFERENCES public.planos(id_plano) ON DELETE SET NULL;

-- Copiar nome para nome_completo se existir
UPDATE public.alunos SET nome_completo = nome WHERE nome_completo IS NULL;

-- 3. Criar tabela de PROGRESSO DO ALUNO
CREATE TABLE IF NOT EXISTS public.progresso_aluno (
  id_progresso UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_aluno UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_kg DECIMAL(5,2) CHECK (peso_kg > 0),
  medidas_corporais JSONB DEFAULT '{}'::jsonb,
  desempenho_treino JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Atualizar tabela TREINOS (workouts) com campos necessários
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS nome_treino TEXT,
  ADD COLUMN IF NOT EXISTS data_atribuicao DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS data_conclusao DATE,
  ADD COLUMN IF NOT EXISTS status_treino VARCHAR(50) DEFAULT 'pendente' CHECK (status_treino IN ('pendente', 'em_andamento', 'concluido')),
  ADD COLUMN IF NOT EXISTS detalhes_treino JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS observacoes_treino TEXT;

-- 5. Atualizar tabela MODELOS DE TREINO com campos necessários
ALTER TABLE public.modelos_de_treino
  ADD COLUMN IF NOT EXISTS tipo_modelo VARCHAR(50) CHECK (tipo_modelo IN ('hipertrofia', 'forca', 'resistencia', 'emagrecimento', 'condicionamento'));

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_aluno ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS PARA PLANOS
-- =====================================================

-- Todos podem visualizar planos ativos (para escolher)
CREATE POLICY "Planos ativos são visíveis para todos"
  ON public.planos
  FOR SELECT
  USING (ativo = true);

-- Apenas admins podem gerenciar planos
CREATE POLICY "Admins podem gerenciar planos"
  ON public.planos
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- POLÍTICAS RLS PARA PROGRESSO DO ALUNO
-- =====================================================

-- Professores podem gerenciar progresso de seus alunos
CREATE POLICY "Professores podem gerenciar progresso de seus alunos"
  ON public.progresso_aluno
  FOR ALL
  USING (
    id_aluno IN (
      SELECT id FROM public.alunos WHERE professor_id = auth.uid()
    )
  )
  WITH CHECK (
    id_aluno IN (
      SELECT id FROM public.alunos WHERE professor_id = auth.uid()
    )
  );

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_progresso_aluno_id ON public.progresso_aluno(id_aluno);
CREATE INDEX IF NOT EXISTS idx_progresso_data_registro ON public.progresso_aluno(data_registro DESC);
CREATE INDEX IF NOT EXISTS idx_alunos_plano_ativo ON public.alunos(id_plano_ativo);
CREATE INDEX IF NOT EXISTS idx_planos_ativo ON public.planos(ativo);

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar updated_at em planos
CREATE TRIGGER update_planos_updated_at
  BEFORE UPDATE ON public.planos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em progresso_aluno
CREATE TRIGGER update_progresso_aluno_updated_at
  BEFORE UPDATE ON public.progresso_aluno
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INSERIR PLANOS PADRÃO
-- =====================================================

INSERT INTO public.planos (nome_plano, descricao, duracao_dias, preco, recursos_incluidos, ativo)
VALUES 
  (
    'Plano Básico',
    'Acesso básico com treinos personalizados',
    30,
    79.90,
    '["Treinos personalizados", "Suporte por email", "Avaliação inicial"]'::jsonb,
    true
  ),
  (
    'Plano Premium',
    'Acesso completo com acompanhamento intensivo',
    30,
    149.90,
    '["Treinos personalizados", "Suporte prioritário", "Avaliação mensal", "Ajuste nutricional", "Grupo VIP"]'::jsonb,
    true
  ),
  (
    'Plano Anual',
    'Melhor custo-benefício com pagamento anual',
    365,
    1499.90,
    '["Todos os recursos Premium", "2 meses grátis", "Consultoria trimestral"]'::jsonb,
    true
  )
ON CONFLICT (nome_plano) DO NOTHING;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.planos IS 'Planos de assinatura disponíveis para alunos';
COMMENT ON TABLE public.progresso_aluno IS 'Registros de progresso e evolução dos alunos';
COMMENT ON COLUMN public.alunos.status_plano IS 'Status atual do plano do aluno: ativo, inativo, suspenso, cancelado';
COMMENT ON COLUMN public.alunos.id_plano_ativo IS 'Referência ao plano de assinatura ativo do aluno';
COMMENT ON COLUMN public.progresso_aluno.medidas_corporais IS 'JSON com circunferências, percentual de gordura, etc.';
COMMENT ON COLUMN public.progresso_aluno.desempenho_treino IS 'JSON com cargas, repetições e desempenho nos exercícios';;
