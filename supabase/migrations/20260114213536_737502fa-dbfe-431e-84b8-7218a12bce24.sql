-- Atualizar super admin para email do Lovable ao invés do email anterior
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super_admin_user boolean;
  assigned_role app_role;
BEGIN
  -- Email super admin fixo do Lovable
  is_super_admin_user := NEW.email = 'lovable@lovable.dev';
  
  -- Determinar role
  IF is_super_admin_user THEN
    assigned_role := 'super_admin';
  ELSE
    assigned_role := 'user';
  END IF;
  
  -- Inserir perfil
  INSERT INTO public.profiles (id, email, status, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN is_super_admin_user THEN 'active'::user_status ELSE 'pending'::user_status END,
    CASE WHEN is_super_admin_user THEN 'admin' ELSE 'student' END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    status = CASE WHEN NEW.email = 'lovable@lovable.dev' THEN 'active'::user_status ELSE profiles.status END;
  
  -- Inserir role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Adicionar coluna user_id ao class_bookings para rastrear qual usuário agendou
ALTER TABLE public.class_bookings 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Habilitar RLS nas tabelas de aulas
ALTER TABLE public.gym_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;

-- Políticas para gym_classes - todos podem ver aulas
DROP POLICY IF EXISTS "Todos podem ver aulas" ON public.gym_classes;
CREATE POLICY "Todos podem ver aulas"
ON public.gym_classes
FOR SELECT
TO authenticated
USING (true);

-- Apenas admins/trainers podem gerenciar aulas
DROP POLICY IF EXISTS "Admins podem gerenciar aulas" ON public.gym_classes;
CREATE POLICY "Admins podem gerenciar aulas"
ON public.gym_classes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.is_trainer(auth.uid()));

-- Políticas para class_bookings
DROP POLICY IF EXISTS "Usuários podem ver seus agendamentos" ON public.class_bookings;
CREATE POLICY "Usuários podem ver seus agendamentos"
ON public.class_bookings
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Usuários podem criar agendamentos" ON public.class_bookings;
CREATE POLICY "Usuários podem criar agendamentos"
ON public.class_bookings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Usuários podem cancelar seus agendamentos" ON public.class_bookings;
CREATE POLICY "Usuários podem cancelar seus agendamentos"
ON public.class_bookings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Usuários podem deletar seus agendamentos" ON public.class_bookings;
CREATE POLICY "Usuários podem deletar seus agendamentos"
ON public.class_bookings
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));