-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Everyone can manage planos_de_treino_gerados" ON public.planos_de_treino_gerados;
DROP POLICY IF EXISTS "Everyone can view planos_de_treino_gerados" ON public.planos_de_treino_gerados;
DROP POLICY IF EXISTS "Users can create plans" ON public.planos_de_treino_gerados;
DROP POLICY IF EXISTS "Users can view plans" ON public.planos_de_treino_gerados;

-- Add missing columns to planos_de_treino_gerados
ALTER TABLE public.planos_de_treino_gerados 
ADD COLUMN IF NOT EXISTS professor_id UUID,
ADD COLUMN IF NOT EXISTS nome_plano TEXT,
ADD COLUMN IF NOT EXISTS objetivo TEXT,
ADD COLUMN IF NOT EXISTS nivel TEXT,
ADD COLUMN IF NOT EXISTS duracao_semanas INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS plano_completo JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update criado_em to created_at for consistency
ALTER TABLE public.planos_de_treino_gerados 
RENAME COLUMN criado_em TO created_at;

-- Create new RLS policies
CREATE POLICY "Professores podem ver planos dos seus alunos"
  ON public.planos_de_treino_gerados
  FOR SELECT
  USING (
    professor_id = auth.uid() OR professor_id IS NULL
  );

CREATE POLICY "Professores podem criar planos para seus alunos"
  ON public.planos_de_treino_gerados
  FOR INSERT
  WITH CHECK (
    professor_id = auth.uid() OR professor_id IS NULL
  );

CREATE POLICY "Professores podem atualizar planos dos seus alunos"
  ON public.planos_de_treino_gerados
  FOR UPDATE
  USING (professor_id = auth.uid() OR professor_id IS NULL);

CREATE POLICY "Professores podem deletar planos dos seus alunos"
  ON public.planos_de_treino_gerados
  FOR DELETE
  USING (professor_id = auth.uid() OR professor_id IS NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_planos_gerados_estudante ON public.planos_de_treino_gerados(estudante_id);
CREATE INDEX IF NOT EXISTS idx_planos_gerados_professor ON public.planos_de_treino_gerados(professor_id);

-- Create or replace trigger for updated_at
DROP TRIGGER IF EXISTS update_planos_gerados_updated_at ON public.planos_de_treino_gerados;
CREATE TRIGGER update_planos_gerados_updated_at
  BEFORE UPDATE ON public.planos_de_treino_gerados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();;
