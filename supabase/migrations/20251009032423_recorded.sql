-- Adicionar role admin para o email central do sistema
-- Primeiro, verificar se o usuário existe e adicionar role admin
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Buscar o user_id do email especificado
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'roni.comercial19@gmail.com';
  
  -- Se o usuário existe, adicionar role admin
  IF v_user_id IS NOT NULL THEN
    -- Remover qualquer role existente para evitar conflitos
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    
    -- Adicionar role admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Atualizar o perfil para role admin também
    UPDATE public.profiles
    SET role = 'admin'
    WHERE user_id = v_user_id;
  END IF;
END $$;

-- Atualizar RLS policies da tabela alunos para permitir que admins criem alunos sem autenticação do aluno
DROP POLICY IF EXISTS "Professores podem gerenciar seus alunos" ON public.alunos;

-- Nova policy que permite admins e professores gerenciarem alunos
CREATE POLICY "Admins e professores podem gerenciar alunos"
ON public.alunos
FOR ALL
USING (
  -- Pode visualizar se for professor do aluno, admin, ou o próprio aluno
  (professor_id = auth.uid()) 
  OR public.has_role(auth.uid(), 'admin')
  OR (id IN (
    SELECT a.id 
    FROM public.alunos a
    INNER JOIN auth.users u ON u.email = a.email
    WHERE u.id = auth.uid()
  ))
)
WITH CHECK (
  -- Pode criar/editar se for professor, admin
  (professor_id = auth.uid()) 
  OR public.has_role(auth.uid(), 'admin')
);

-- Comentário para documentar o email admin central
COMMENT ON POLICY "Admins e professores podem gerenciar alunos" ON public.alunos IS 
'Permite que admins (incluindo roni.comercial19@gmail.com) e professores gerenciem alunos. Admins podem criar alunos sem que eles precisem estar autenticados.';;
