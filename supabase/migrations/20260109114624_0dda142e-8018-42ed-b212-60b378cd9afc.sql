-- Funções de verificação de roles
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trainer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('trainer', 'admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- Atualizar handle_new_user - super_admin apenas para joathaslins@gmail.com
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
  -- ÚNICO email super admin
  is_super_admin_user := NEW.email = 'joathaslins@gmail.com';
  
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
    status = CASE WHEN NEW.email = 'joathaslins@gmail.com' THEN 'active'::user_status ELSE profiles.status END;
  
  -- Inserir role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Atualizar is_user_approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id AND status = 'active'
  ) OR public.has_role(_user_id, 'super_admin') OR public.has_role(_user_id, 'admin')
$$;