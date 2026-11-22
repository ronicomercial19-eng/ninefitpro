-- Corrigir a função handle_new_user_role para cast correto
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar perfil na tabela profiles
  INSERT INTO public.profiles (user_id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'roni.comercial19@gmail.com' THEN 'admin'::user_role
      ELSE 'student'::user_role
    END,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE 
      WHEN EXCLUDED.email = 'roni.comercial19@gmail.com' THEN 'admin'::user_role
      ELSE profiles.role
    END;

  -- Criar entrada na tabela user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.email = 'roni.comercial19@gmail.com' THEN 'admin'::app_role
      WHEN NEW.email LIKE 'demo.professor%' THEN 'admin'::app_role
      ELSE 'user'::app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;;
