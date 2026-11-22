-- Fase 1: Corrigir Foreign Key para apontar para athletes (tabela ativa)
ALTER TABLE student_training_assignments
DROP CONSTRAINT IF EXISTS student_training_assignments_student_id_fkey;

ALTER TABLE student_training_assignments
ADD CONSTRAINT student_training_assignments_student_id_fkey
FOREIGN KEY (student_id) REFERENCES athletes(id) ON DELETE CASCADE;

-- Fase 2: Atualizar check constraint do training_type para aceitar 'link'
ALTER TABLE student_training_assignments
DROP CONSTRAINT IF EXISTS student_training_assignments_training_type_check;

ALTER TABLE student_training_assignments
ADD CONSTRAINT student_training_assignments_training_type_check
CHECK (training_type IN ('json', 'html', 'link'));