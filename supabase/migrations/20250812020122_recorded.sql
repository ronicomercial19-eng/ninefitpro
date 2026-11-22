-- Ajustar tabela athletes para incluir campos da anamnese
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS peso_kg DECIMAL;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS altura_cm DECIMAL;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS objetivo TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS nivel TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS restricoes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS respostas_anamnese JSONB DEFAULT '{}'::jsonb;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS perfil_classificado JSONB DEFAULT '{}'::jsonb;

-- Ajustar tabela periodizations para incluir campos necessários
ALTER TABLE periodizations ADD COLUMN IF NOT EXISTS macrocycle JSONB DEFAULT '{}'::jsonb;
ALTER TABLE periodizations ADD COLUMN IF NOT EXISTS mesocycle JSONB DEFAULT '{}'::jsonb;
ALTER TABLE periodizations ADD COLUMN IF NOT EXISTS microcycle JSONB DEFAULT '[]'::jsonb;
ALTER TABLE periodizations ADD COLUMN IF NOT EXISTS recommended_for JSONB DEFAULT '{}'::jsonb;
ALTER TABLE periodizations ADD COLUMN IF NOT EXISTS graph_data JSONB DEFAULT '[]'::jsonb;

-- Criar tabela de relacionamento aluno_periodizacao para armazenar compatibilidades
CREATE TABLE IF NOT EXISTS aluno_periodizacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  periodizacao_id UUID NOT NULL REFERENCES periodizations(id) ON DELETE CASCADE,
  compatibilidade DECIMAL CHECK (compatibilidade >= 0 AND compatibilidade <= 100),
  explicacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(aluno_id, periodizacao_id)
);

-- Habilitar RLS na nova tabela
ALTER TABLE aluno_periodizacao ENABLE ROW LEVEL SECURITY;

-- Política para coaches verem compatibilidades dos seus alunos
CREATE POLICY "Coaches can view compatibilities for their athletes"
ON aluno_periodizacao
FOR SELECT
USING (
  aluno_id IN (
    SELECT id FROM athletes WHERE coach_id = auth.uid()
  )
);

-- Política para sistema inserir/atualizar compatibilidades
CREATE POLICY "System can manage compatibilities"
ON aluno_periodizacao
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_aluno_periodizacao_updated_at
BEFORE UPDATE ON aluno_periodizacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();;
