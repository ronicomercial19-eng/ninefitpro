-- Adicionar role admin para o usuário atual
INSERT INTO public.user_roles (user_id, role) 
VALUES ('58ca67c7-c965-4984-a076-0cf624bd75c5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Criar função helper para verificar se usuário tem permissão de professor
CREATE OR REPLACE FUNCTION public.is_professor(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id
    AND role = 'admin'
  );
$$;

-- Atualizar RLS da tabela alunos para usar a nova função
DROP POLICY IF EXISTS "Professores podem gerenciar seus alunos" ON public.alunos;

CREATE POLICY "Professores podem gerenciar seus alunos"
ON public.alunos
FOR ALL
TO authenticated
USING (
  professor_id = auth.uid() OR public.is_professor(auth.uid())
)
WITH CHECK (
  professor_id = auth.uid() OR public.is_professor(auth.uid())
);;
