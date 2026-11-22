-- FASE 1: CORREÇÕES CRÍTICAS E SEGURANÇA (Corrigido)

-- 1.1: Migrar dados de alunos para students (se existirem)
INSERT INTO public.students (
  id,
  professor_id,
  nome,
  email,
  telefone,
  data_nascimento,
  peso_kg,
  altura_cm,
  objetivo,
  nivel_experiencia,
  observacoes,
  ativo,
  created_at,
  updated_at,
  foto_url,
  cpf,
  whatsapp,
  data_vencimento_plano,
  forma_pagamento,
  valor_mensalidade,
  status_pagamento
)
SELECT 
  a.id,
  a.professor_id,
  a.nome,
  a.email,
  a.telefone,
  a.data_nascimento,
  a.peso_atual,
  a.altura_cm,
  a.objetivo,
  a.nivel_experiencia,
  a.observacoes,
  CASE WHEN a.status = 'ativo' THEN true ELSE false END,
  a.data_cadastro,
  a.ultima_atualizacao,
  a.foto_perfil_url,
  NULL, -- cpf
  a.telefone, -- usar telefone como whatsapp temporariamente
  a.data_fim_plano,
  'mensal',
  NULL, -- valor_mensalidade
  'em_dia'
FROM public.alunos a
WHERE NOT EXISTS (
  SELECT 1 FROM public.students s WHERE s.id = a.id
)
ON CONFLICT (id) DO NOTHING;

-- 1.2: RLS para Students
DROP POLICY IF EXISTS "Professors can manage their students" ON public.students;
CREATE POLICY "Professors can manage their students"
ON public.students FOR ALL
USING (professor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (professor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Students can view own profile" ON public.students;
CREATE POLICY "Students can view own profile"
ON public.students FOR SELECT
USING (email = current_user_email());

-- 1.3: RLS para Workouts
DROP POLICY IF EXISTS "Professors manage student workouts" ON public.workouts;
CREATE POLICY "Professors manage student workouts"
ON public.workouts FOR ALL
USING (
  student_id IN (
    SELECT id FROM public.students WHERE professor_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Students view own workouts" ON public.workouts;
CREATE POLICY "Students view own workouts"
ON public.workouts FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.students WHERE email = current_user_email()
  )
);

-- 1.4: RLS para Avaliacoes
DROP POLICY IF EXISTS "Professors manage assessments" ON public.avaliacoes;
CREATE POLICY "Professors manage assessments"
ON public.avaliacoes FOR ALL
USING (
  estudante_id IN (
    SELECT id FROM public.students WHERE professor_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Students view own assessments" ON public.avaliacoes;
CREATE POLICY "Students view own assessments"
ON public.avaliacoes FOR SELECT
USING (
  estudante_id IN (
    SELECT id FROM public.students WHERE email = current_user_email()
  )
);

-- 1.5: RLS para Student Measurements
DROP POLICY IF EXISTS "Professors manage student measurements" ON public.student_measurements;
CREATE POLICY "Professors manage student measurements"
ON public.student_measurements FOR ALL
USING (
  student_id IN (
    SELECT id FROM public.students WHERE professor_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Students view own measurements" ON public.student_measurements;
CREATE POLICY "Students view own measurements"
ON public.student_measurements FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.students WHERE email = current_user_email()
  )
);

-- 1.6: RLS para Student Photos
DROP POLICY IF EXISTS "Professors manage student photos" ON public.student_photos;
CREATE POLICY "Professors manage student photos"
ON public.student_photos FOR ALL
USING (
  student_id IN (
    SELECT id FROM public.students WHERE professor_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Students view own photos" ON public.student_photos;
CREATE POLICY "Students view own photos"
ON public.student_photos FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.students WHERE email = current_user_email()
  )
);

-- 1.7: RLS para Payments
DROP POLICY IF EXISTS "Professors manage student payments" ON public.payments;
CREATE POLICY "Professors manage student payments"
ON public.payments FOR ALL
USING (
  student_id = auth.uid() OR
  student_id IN (
    SELECT profile_id FROM public.students WHERE professor_id = auth.uid()
  ) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Students view own payments" ON public.payments;
CREATE POLICY "Students view own payments"
ON public.payments FOR SELECT
USING (student_id = auth.uid());

-- 1.8: RLS para Exercises
DROP POLICY IF EXISTS "Authenticated users manage exercises" ON public.exercises;
CREATE POLICY "Authenticated users manage exercises"
ON public.exercises FOR ALL
USING (auth.role() = 'authenticated');

-- 1.9: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_students_professor_id ON public.students(professor_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_workouts_student_id ON public.workouts(student_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_estudante_id ON public.avaliacoes(estudante_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_measurements_student_id ON public.student_measurements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_photos_student_id ON public.student_photos(student_id);

-- 1.10: Trigger para updated_at em students
DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();