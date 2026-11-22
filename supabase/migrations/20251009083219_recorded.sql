-- ============================================================================
-- CORREÇÃO CRÍTICA: RLS Recursivo e Gestão de Alunos
-- ============================================================================

-- Passo 1: Criar função helper para obter email do usuário atual (sem recursão)
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid();
$$;

-- Passo 2: Remover policy antiga com recursão
DROP POLICY IF EXISTS "Admins e professores podem gerenciar alunos" ON public.alunos;

-- Passo 3: Criar policies separadas por operação (SEM RECURSÃO)

-- Policy para SELECT
CREATE POLICY "alunos_select_access"
ON public.alunos
FOR SELECT
USING (
  professor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR email = public.current_user_email()
);

-- Policy para INSERT
CREATE POLICY "alunos_insert_access"
ON public.alunos
FOR INSERT
WITH CHECK (
  professor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Policy para UPDATE
CREATE POLICY "alunos_update_access"
ON public.alunos
FOR UPDATE
USING (
  professor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  professor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Policy para DELETE
CREATE POLICY "alunos_delete_access"
ON public.alunos
FOR DELETE
USING (
  professor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Passo 4: Atualizar trigger para garantir role admin automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Inserir profile
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.email = 'admin@system.com' THEN 'admin'::public.user_role
            WHEN NEW.email = 'roni.comercial19@gmail.com' THEN 'admin'::public.user_role
            ELSE 'student'::public.user_role
        END
    );
    
    -- Sincronizar user_roles (admin central)
    IF NEW.email = 'roni.comercial19@gmail.com' OR NEW.email = 'admin@system.com' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'user')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Passo 5: Garantir que o admin central já existente tenha a role correta
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'roni.comercial19@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Adicionar role admin em user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Atualizar profile também
    UPDATE public.profiles
    SET role = 'admin'
    WHERE user_id = v_user_id;
  END IF;
END $$;

-- Passo 6: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_alunos_professor_id ON public.alunos(professor_id);
CREATE INDEX IF NOT EXISTS idx_alunos_email ON public.alunos(email);

-- Comentários para documentação
COMMENT ON FUNCTION public.current_user_email() IS 
'Retorna o email do usuário autenticado sem causar recursão em RLS';

COMMENT ON POLICY "alunos_select_access" ON public.alunos IS 
'Permite visualizar alunos: professores veem seus alunos, admins veem todos, alunos veem o próprio registro';

COMMENT ON POLICY "alunos_insert_access" ON public.alunos IS 
'Permite criar alunos: apenas professores e admins (incluindo roni.comercial19@gmail.com)';

COMMENT ON POLICY "alunos_update_access" ON public.alunos IS 
'Permite editar alunos: apenas professores e admins';

COMMENT ON POLICY "alunos_delete_access" ON public.alunos IS 
'Permite remover alunos: apenas professores e admins';;
