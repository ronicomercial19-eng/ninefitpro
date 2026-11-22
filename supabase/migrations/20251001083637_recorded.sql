-- Drop existing policies
DROP POLICY IF EXISTS "Admins and professors can view all athletes" ON public.athletes;
DROP POLICY IF EXISTS "Admins and professors can create athletes" ON public.athletes;
DROP POLICY IF EXISTS "Admins and professors can update athletes" ON public.athletes;
DROP POLICY IF EXISTS "Admins and professors can delete athletes" ON public.athletes;
DROP POLICY IF EXISTS "Athletes can view their own data" ON public.athletes;

-- Garantir que RLS está habilitado
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Política: Admin e professores podem ver todos os alunos
CREATE POLICY "Admins and professors can view all athletes"
ON public.athletes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'professor')
  )
);

-- Política: Admin e professores podem criar alunos
CREATE POLICY "Admins and professors can create athletes"
ON public.athletes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'professor')
  )
);

-- Política: Admin e professores podem atualizar alunos
CREATE POLICY "Admins and professors can update athletes"
ON public.athletes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'professor')
  )
);

-- Política: Admin e professores podem deletar alunos
CREATE POLICY "Admins and professors can delete athletes"
ON public.athletes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'professor')
  )
);

-- Política: Alunos podem ver seus próprios dados
CREATE POLICY "Athletes can view their own data"
ON public.athletes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());;
