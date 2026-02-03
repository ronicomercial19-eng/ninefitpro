-- Criar tabela de atribuição de dietas
CREATE TABLE IF NOT EXISTS public.student_diet_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  diet_name TEXT NOT NULL,
  diet_description TEXT,
  diet_type VARCHAR(20) CHECK (diet_type IN ('link', 'html', 'json')),
  diet_file_url TEXT,
  diet_file_path TEXT,
  diet_data JSONB DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_diet_assignments_student ON student_diet_assignments(student_id);
CREATE INDEX idx_diet_assignments_active ON student_diet_assignments(is_active);

-- RLS
ALTER TABLE student_diet_assignments ENABLE ROW LEVEL SECURITY;

-- Coaches podem gerenciar dietas dos seus alunos
CREATE POLICY "Coaches can manage diet assignments"
ON student_diet_assignments FOR ALL
USING (created_by = auth.uid() OR EXISTS (
  SELECT 1 FROM athletes WHERE id = student_id AND coach_id = auth.uid()
));

-- Alunos podem ver suas próprias dietas
CREATE POLICY "Athletes can view own diets"
ON student_diet_assignments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM athletes WHERE id = student_id AND user_id = auth.uid()
));

-- Criar bucket de storage para dietas
INSERT INTO storage.buckets (id, name, public)
VALUES ('diet-html-files', 'diet-html-files', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Anyone can view diet files"
ON storage.objects FOR SELECT
USING (bucket_id = 'diet-html-files');

CREATE POLICY "Authenticated users can upload diet files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'diet-html-files' AND auth.role() = 'authenticated');

CREATE POLICY "Owners can delete diet files"
ON storage.objects FOR DELETE
USING (bucket_id = 'diet-html-files' AND owner = auth.uid());