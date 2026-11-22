-- Trigger para atribuir role automaticamente baseado no email
-- roni.comercial19@gmail.com = admin, todos outros = student

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Criar perfil na tabela profiles
  INSERT INTO public.profiles (user_id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'roni.comercial19@gmail.com' THEN 'admin'::text
      ELSE 'student'::text
    END,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE 
      WHEN EXCLUDED.email = 'roni.comercial19@gmail.com' THEN 'admin'::text
      ELSE profiles.role -- manter role existente se não for o admin
    END;

  -- Criar entrada na tabela user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.email = 'roni.comercial19@gmail.com' THEN 'admin'::app_role
      ELSE 'user'::app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar novo trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();;
