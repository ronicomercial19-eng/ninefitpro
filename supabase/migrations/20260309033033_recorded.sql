-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create models" ON public.modelos_de_treino;
DROP POLICY IF EXISTS "Users can update models" ON public.modelos_de_treino;
DROP POLICY IF EXISTS "Users can view models" ON public.modelos_de_treino;

-- Professors can create models for their students (alunos they own)
CREATE POLICY "Professors can create models for their students"
ON public.modelos_de_treino FOR INSERT TO authenticated
WITH CHECK (
  estudante_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.alunos
    WHERE alunos.id = modelos_de_treino.estudante_id
    AND alunos.professor_id = auth.uid()
  )
  OR auth.uid() = estudante_id
  OR public.is_trainer(auth.uid())
);

-- Professors can view models they created or for their students
CREATE POLICY "Users can view models"
ON public.modelos_de_treino FOR SELECT TO authenticated
USING (
  estudante_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.alunos
    WHERE alunos.id = modelos_de_treino.estudante_id
    AND alunos.professor_id = auth.uid()
  )
  OR auth.uid() = estudante_id
  OR public.is_trainer(auth.uid())
);

-- Professors can update models for their students
CREATE POLICY "Professors can update models"
ON public.modelos_de_treino FOR UPDATE TO authenticated
USING (
  estudante_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.alunos
    WHERE alunos.id = modelos_de_treino.estudante_id
    AND alunos.professor_id = auth.uid()
  )
  OR auth.uid() = estudante_id
  OR public.is_trainer(auth.uid())
);;
