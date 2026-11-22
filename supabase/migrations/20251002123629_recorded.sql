-- ==========================================
-- NOVA ESTRUTURA DE ALUNOS
-- ==========================================

-- 1. Criar enum para status do aluno
CREATE TYPE public.aluno_status AS ENUM ('ativo', 'inativo', 'suspenso');

-- 2. Criar enum para tipo de análise
CREATE TYPE public.tipo_analise AS ENUM ('composicao_corporal', 'performance', 'progresso', 'periodizacao');

-- 3. Tabela principal de alunos (limpa e organizada)
CREATE TABLE public.alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados pessoais
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  data_nascimento DATE,
  genero VARCHAR(20),
  
  -- Dados físicos
  peso_atual NUMERIC(5,2),
  altura_cm INTEGER,
  
  -- Informações de treino
  objetivo TEXT NOT NULL,
  nivel_experiencia VARCHAR(50) DEFAULT 'iniciante',
  frequencia_semanal INTEGER DEFAULT 3,
  ambiente_treino VARCHAR(50) DEFAULT 'academia',
  restricoes_medicas TEXT,
  observacoes TEXT,
  
  -- Status e controle
  status aluno_status DEFAULT 'ativo',
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Índices únicos
  UNIQUE(professor_id, email)
);

-- 4. Tabela de avaliações físicas
CREATE TABLE public.avaliacoes_fisicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  
  -- Dados antropométricos
  peso_kg NUMERIC(5,2),
  altura_cm INTEGER,
  imc NUMERIC(4,2),
  percentual_gordura NUMERIC(4,2),
  massa_magra_kg NUMERIC(5,2),
  massa_gorda_kg NUMERIC(5,2),
  
  -- Circunferências (cm)
  circ_braco NUMERIC(5,2),
  circ_peitoral NUMERIC(5,2),
  circ_cintura NUMERIC(5,2),
  circ_quadril NUMERIC(5,2),
  circ_coxa NUMERIC(5,2),
  circ_panturrilha NUMERIC(5,2),
  
  -- Testes de força (RML - Repetições Máximas)
  rml_flexao INTEGER,
  rml_abdominal INTEGER,
  rml_agachamento INTEGER,
  
  -- Testes de RM (1 Repetição Máxima) em kg
  rm_supino NUMERIC(6,2),
  rm_agachamento NUMERIC(6,2),
  rm_terra NUMERIC(6,2),
  rm_leg_press NUMERIC(6,2),
  
  -- Metadados
  data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
  avaliador_nome VARCHAR(255),
  avaliador_cref VARCHAR(50),
  observacoes TEXT,
  arquivos_anexos JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Tabela de planos de treino
CREATE TABLE public.planos_treino_aluno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Informações do plano
  nome_plano VARCHAR(255) NOT NULL,
  descricao TEXT,
  objetivo VARCHAR(100) NOT NULL,
  duracao_semanas INTEGER NOT NULL,
  frequencia_semanal INTEGER NOT NULL,
  
  -- Estrutura do treino (JSON flexível)
  estrutura_treino JSONB NOT NULL DEFAULT '{}',
  
  -- Periodização
  tipo_periodizacao VARCHAR(50),
  fase_atual VARCHAR(50),
  semana_atual INTEGER DEFAULT 1,
  
  -- Status e datas
  data_inicio DATE,
  data_fim DATE,
  status VARCHAR(20) DEFAULT 'ativo',
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Tabela de histórico de treinos realizados
CREATE TABLE public.historico_treinos_realizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  plano_treino_id UUID REFERENCES public.planos_treino_aluno(id) ON DELETE SET NULL,
  
  -- Informações da sessão
  data_treino DATE NOT NULL,
  semana_treino INTEGER,
  dia_treino INTEGER,
  duracao_minutos INTEGER,
  
  -- Detalhes dos exercícios realizados (JSON array)
  exercicios_realizados JSONB NOT NULL DEFAULT '[]',
  
  -- Métricas da sessão
  volume_total_kg NUMERIC(10,2),
  intensidade_media NUMERIC(3,1),
  pse_sessao INTEGER, -- Percepção Subjetiva de Esforço (1-10)
  
  -- Observações
  notas_aluno TEXT,
  notas_professor TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Tabela de análises com IA
CREATE TABLE public.analises_ia_aluno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Tipo e contexto da análise
  tipo_analise tipo_analise NOT NULL,
  contexto_analise TEXT NOT NULL,
  
  -- Dados da análise
  dados_entrada JSONB NOT NULL,
  resultado_analise JSONB NOT NULL,
  
  -- Insights e recomendações
  insights TEXT[],
  recomendacoes TEXT[],
  alertas TEXT[],
  
  -- Score de confiança da IA (0-100)
  confianca_score INTEGER,
  
  -- Metadados
  modelo_ia_usado VARCHAR(100),
  tempo_processamento_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================

CREATE INDEX idx_alunos_professor ON public.alunos(professor_id);
CREATE INDEX idx_alunos_status ON public.alunos(status);
CREATE INDEX idx_alunos_email ON public.alunos(email);

CREATE INDEX idx_avaliacoes_aluno ON public.avaliacoes_fisicas(aluno_id);
CREATE INDEX idx_avaliacoes_data ON public.avaliacoes_fisicas(data_avaliacao DESC);

CREATE INDEX idx_planos_aluno ON public.planos_treino_aluno(aluno_id);
CREATE INDEX idx_planos_status ON public.planos_treino_aluno(status);

CREATE INDEX idx_historico_aluno ON public.historico_treinos_realizados(aluno_id);
CREATE INDEX idx_historico_data ON public.historico_treinos_realizados(data_treino DESC);

CREATE INDEX idx_analises_aluno ON public.analises_ia_aluno(aluno_id);
CREATE INDEX idx_analises_tipo ON public.analises_ia_aluno(tipo_analise);

-- ==========================================
-- TRIGGERS PARA UPDATED_AT
-- ==========================================

CREATE OR REPLACE FUNCTION public.atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ultima_atualizacao = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alunos_updated
BEFORE UPDATE ON public.alunos
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_timestamp();

CREATE TRIGGER trigger_planos_updated
BEFORE UPDATE ON public.planos_treino_aluno
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Alunos: professores só veem seus próprios alunos
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professores podem gerenciar seus alunos"
ON public.alunos
FOR ALL
TO authenticated
USING (professor_id = auth.uid())
WITH CHECK (professor_id = auth.uid());

-- Avaliações: acesso baseado no aluno
ALTER TABLE public.avaliacoes_fisicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professores podem gerenciar avaliações de seus alunos"
ON public.avaliacoes_fisicas
FOR ALL
TO authenticated
USING (
  aluno_id IN (
    SELECT id FROM public.alunos WHERE professor_id = auth.uid()
  )
)
WITH CHECK (
  aluno_id IN (
    SELECT id FROM public.alunos WHERE professor_id = auth.uid()
  )
);

-- Planos de treino
ALTER TABLE public.planos_treino_aluno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professores podem gerenciar planos de seus alunos"
ON public.planos_treino_aluno
FOR ALL
TO authenticated
USING (professor_id = auth.uid())
WITH CHECK (professor_id = auth.uid());

-- Histórico de treinos
ALTER TABLE public.historico_treinos_realizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professores podem ver histórico de seus alunos"
ON public.historico_treinos_realizados
FOR ALL
TO authenticated
USING (
  aluno_id IN (
    SELECT id FROM public.alunos WHERE professor_id = auth.uid()
  )
)
WITH CHECK (
  aluno_id IN (
    SELECT id FROM public.alunos WHERE professor_id = auth.uid()
  )
);

-- Análises IA
ALTER TABLE public.analises_ia_aluno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professores podem gerenciar análises de seus alunos"
ON public.analises_ia_aluno
FOR ALL
TO authenticated
USING (professor_id = auth.uid())
WITH CHECK (professor_id = auth.uid());;
