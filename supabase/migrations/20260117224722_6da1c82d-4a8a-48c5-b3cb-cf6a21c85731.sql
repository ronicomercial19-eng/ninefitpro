-- 1. Primeiro, corrigir o trigger problemático ou removê-lo temporariamente
DROP TRIGGER IF EXISTS audit_alunos_trigger ON alunos;

-- 2. Adicionar coluna faltante no audit_log se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'old_data') THEN
    ALTER TABLE audit_log ADD COLUMN old_data JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_log' AND column_name = 'new_data') THEN
    ALTER TABLE audit_log ADD COLUMN new_data JSONB;
  END IF;
END $$;

-- 3. Agora limpar tabelas dependentes
DELETE FROM exercise_logs;
DELETE FROM workout_logs;
DELETE FROM workout_assignments_new;
DELETE FROM athlete_periodizations;
DELETE FROM athlete_auth_link;
DELETE FROM avaliacoes_unificadas;
DELETE FROM avaliacoes_fisicas;
DELETE FROM avaliacoes;
DELETE FROM historico_avaliacoes;
DELETE FROM physical_assessments;
DELETE FROM historico_treinos_realizados;
DELETE FROM planos_treino_aluno;
DELETE FROM planos_de_treino_gerados;
DELETE FROM student_measurements;
DELETE FROM student_photos;
DELETE FROM student_anamnesis;
DELETE FROM student_activity_history;
DELETE FROM student_training_assignments;
DELETE FROM notifications;
DELETE FROM payments;
DELETE FROM appointments;
DELETE FROM class_bookings;
DELETE FROM analises_ia_aluno;
DELETE FROM progresso_aluno;
DELETE FROM user_workout_logs;
DELETE FROM workout_progress;
DELETE FROM user_program_progress;

-- 4. Limpar atletas (exceto dados do super admin)
DELETE FROM athletes WHERE coach_id != '61e303b9-f78e-4ba0-b8d6-07cf5ff22cd6';

-- 5. Limpar tabelas legado
DELETE FROM alunos;
DELETE FROM estudantes;
DELETE FROM students;

-- 6. Limpar user_roles (manter apenas super_admin)
DELETE FROM user_roles WHERE user_id != '61e303b9-f78e-4ba0-b8d6-07cf5ff22cd6';

-- 7. Limpar profiles (manter apenas super_admin)
DELETE FROM profiles WHERE id != '61e303b9-f78e-4ba0-b8d6-07cf5ff22cd6';

-- 8. Garantir que o super admin tenha role correto
INSERT INTO user_roles (user_id, role)
VALUES ('61e303b9-f78e-4ba0-b8d6-07cf5ff22cd6', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;