-- Expandir tabela students para incluir mais campos do MobiTrainer
ALTER TABLE students ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS estado_civil TEXT DEFAULT 'solteiro';
ALTER TABLE students ADD COLUMN IF NOT EXISTS profissao TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS endereco_completo TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS data_vencimento_plano DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'mensal';
ALTER TABLE students ADD COLUMN IF NOT EXISTS valor_mensalidade NUMERIC(10,2);
ALTER TABLE students ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'em_dia';

-- Tabela de histórico de atividades do aluno
CREATE TABLE IF NOT EXISTS student_activity_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'treino', 'avaliacao', 'mensalidade', 'aula'
  activity_name TEXT NOT NULL,
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'concluido', -- 'concluido', 'faltou', 'cancelado'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de medidas corporais detalhadas
CREATE TABLE IF NOT EXISTS student_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_kg NUMERIC(5,2),
  altura_cm NUMERIC(5,1),
  gordura_corporal NUMERIC(4,1),
  massa_muscular NUMERIC(5,2),
  imc NUMERIC(4,1),
  circunferencia_braco_cm NUMERIC(4,1),
  circunferencia_peitoral_cm NUMERIC(4,1),
  circunferencia_cintura_cm NUMERIC(4,1),
  circunferencia_quadril_cm NUMERIC(4,1),
  circunferencia_coxa_cm NUMERIC(4,1),
  circunferencia_panturrilha_cm NUMERIC(4,1),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, measurement_date)
);

-- Tabela de anamneses/questionários dos alunos
CREATE TABLE IF NOT EXISTS student_anamnesis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'saude', 'objetivos', 'preferencias', 'par-q'
  title TEXT NOT NULL,
  questions_answers JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de fotos do aluno (antes/durante/depois)
CREATE TABLE IF NOT EXISTS student_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL, -- 'frente', 'costas', 'perfil', 'outros'
  photo_category TEXT DEFAULT 'progresso', -- 'progresso', 'avaliacao', 'outros'
  description TEXT,
  taken_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de treinos atribuídos aos alunos
CREATE TABLE IF NOT EXISTS student_training_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  training_name TEXT NOT NULL,
  training_data JSONB NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL, -- professor_id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE student_activity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_anamnesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_training_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas para student_activity_history
CREATE POLICY "Professors can manage their students activity history"
ON student_activity_history FOR ALL
USING (
  student_id IN (
    SELECT id FROM students WHERE professor_id = auth.uid()
  )
);

-- Políticas para student_measurements
CREATE POLICY "Professors can manage their students measurements"
ON student_measurements FOR ALL
USING (
  student_id IN (
    SELECT id FROM students WHERE professor_id = auth.uid()
  )
);

-- Políticas para student_anamnesis
CREATE POLICY "Professors can manage their students anamnesis"
ON student_anamnesis FOR ALL
USING (
  student_id IN (
    SELECT id FROM students WHERE professor_id = auth.uid()
  )
);

-- Políticas para student_photos
CREATE POLICY "Professors can manage their students photos"
ON student_photos FOR ALL
USING (
  student_id IN (
    SELECT id FROM students WHERE professor_id = auth.uid()
  )
);

-- Políticas para student_training_assignments
CREATE POLICY "Professors can manage training assignments"
ON student_training_assignments FOR ALL
USING (created_by = auth.uid());

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para student_training_assignments
CREATE TRIGGER update_student_training_assignments_updated_at
BEFORE UPDATE ON student_training_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_student_activity_history_student_id ON student_activity_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_measurements_student_id ON student_measurements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_anamnesis_student_id ON student_anamnesis(student_id);
CREATE INDEX IF NOT EXISTS idx_student_photos_student_id ON student_photos(student_id);
CREATE INDEX IF NOT EXISTS idx_student_training_assignments_student_id ON student_training_assignments(student_id);