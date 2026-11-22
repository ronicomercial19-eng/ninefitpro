-- =====================================================
-- PARTE 1: INFRAESTRUTURA PARA UPLOAD DE TREINOS HTML
-- =====================================================

-- 1. Criar bucket de storage para arquivos HTML de treino
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-html-files', 
  'training-html-files', 
  false,
  5242880, -- 5MB limite
  ARRAY['text/html']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Adicionar colunas à tabela student_training_assignments
ALTER TABLE student_training_assignments
ADD COLUMN IF NOT EXISTS html_file_path TEXT,
ADD COLUMN IF NOT EXISTS html_file_url TEXT,
ADD COLUMN IF NOT EXISTS training_type VARCHAR(20) DEFAULT 'json' CHECK (training_type IN ('json', 'html')),
ADD COLUMN IF NOT EXISTS training_description TEXT;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sta_training_type ON student_training_assignments(training_type);
CREATE INDEX IF NOT EXISTS idx_sta_student_active ON student_training_assignments(student_id, is_active);

-- 4. RLS Policies para o bucket de storage

-- Policy: Professores podem fazer upload de arquivos HTML
CREATE POLICY "Professores upload HTML treinos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-html-files'
);

-- Policy: Professores podem ver seus arquivos
CREATE POLICY "Professores veem arquivos HTML"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'training-html-files'
);

-- Policy: Professores podem deletar arquivos
CREATE POLICY "Professores deletam arquivos HTML"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-html-files'
);

-- Policy: Professores podem atualizar arquivos
CREATE POLICY "Professores atualizam arquivos HTML"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'training-html-files'
);

-- 5. Comentários para documentação
COMMENT ON COLUMN student_training_assignments.html_file_path IS 'Caminho do arquivo HTML no storage bucket';
COMMENT ON COLUMN student_training_assignments.html_file_url IS 'URL pública/signed do arquivo HTML';
COMMENT ON COLUMN student_training_assignments.training_type IS 'Tipo do treino: json (gerado por IA) ou html (upload manual)';
COMMENT ON COLUMN student_training_assignments.training_description IS 'Descrição do treino para exibir ao aluno';