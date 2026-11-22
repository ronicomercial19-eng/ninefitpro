
-- Fix is_professor() to include professor role
CREATE OR REPLACE FUNCTION public.is_professor(check_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id
    AND role IN ('professor', 'trainer', 'admin', 'super_admin')
  );
$$;

-- Unify triggers: update handle_new_user_role to respect user_type from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_user_type text;
  v_app_role app_role;
  v_profile_role user_role;
BEGIN
  v_user_type := NEW.raw_user_meta_data ->> 'user_type';

  -- Determine role from metadata or email
  IF NEW.email = 'roni.comercial19@gmail.com' OR NEW.email = 'ronys191@gmail.com' THEN
    v_app_role := 'admin';
    v_profile_role := 'admin';
  ELSIF v_user_type = 'professor' THEN
    v_app_role := 'professor';
    v_profile_role := 'professor';
  ELSE
    v_app_role := 'user';
    v_profile_role := 'student';
  END IF;

  -- Upsert profiles
  INSERT INTO public.profiles (user_id, email, role, full_name, status, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    v_profile_role,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    'active',
    true,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  -- Upsert user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop handle_new_user if it exists as trigger on auth.users to avoid duplicate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate single trigger using the unified function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
;
