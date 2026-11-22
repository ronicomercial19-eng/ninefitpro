-- Atualizar função handle_new_user para usar o novo email de super admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  is_super_admin_user boolean;
  assigned_role app_role;
BEGIN
  -- Email super admin fixo
  is_super_admin_user := NEW.email = 'roni.comercial19@gmail.com';
  
  -- Determinar role
  IF is_super_admin_user THEN
    assigned_role := 'super_admin';
  ELSE
    assigned_role := 'user';
  END IF;
  
  -- Inserir perfil
  INSERT INTO public.profiles (user_id, email, status, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN is_super_admin_user THEN 'active'::user_status ELSE 'pending'::user_status END,
    CASE WHEN is_super_admin_user THEN 'admin' ELSE 'student' END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    status = CASE WHEN NEW.email = 'roni.comercial19@gmail.com' THEN 'active'::user_status ELSE profiles.status END;
  
  -- Inserir role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Atualizar user_roles para o super admin existente
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Buscar o user_id do email do super admin
  SELECT user_id INTO v_user_id FROM public.profiles WHERE email = 'roni.comercial19@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Remover roles anteriores e adicionar super_admin
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'super_admin'::app_role);
    
    -- Atualizar status para active
    UPDATE public.profiles SET status = 'active', role = 'admin' WHERE user_id = v_user_id;
  END IF;
END;
$$;