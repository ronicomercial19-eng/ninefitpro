CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ur.role::text
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  ORDER BY CASE ur.role::text
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'professor' THEN 3
    WHEN 'trainer' THEN 4
    WHEN 'student' THEN 5
    WHEN 'user' THEN 6
    ELSE 99
  END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
RETURNS TABLE(role text, profile_ready boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_user_type text;
  v_role app_role;
  v_profile_exists boolean;
  v_extended_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT
    u.email,
    COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data ->> 'user_type', u.raw_user_meta_data ->> 'accountType')
  INTO v_email, v_name, v_user_type
  FROM auth.users u
  WHERE u.id = v_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  IF lower(v_email) IN ('roni.comercial19@gmail.com', 'ronys191@gmail.com') THEN
    v_role := 'admin'::app_role;
  ELSIF v_user_type = 'professor' THEN
    v_role := 'professor'::app_role;
  ELSIF v_user_type = 'student' THEN
    v_role := 'user'::app_role;
  ELSE
    v_role := COALESCE((SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = v_user_id ORDER BY CASE ur.role::text WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 WHEN 'professor' THEN 3 WHEN 'trainer' THEN 4 WHEN 'student' THEN 5 WHEN 'user' THEN 6 ELSE 99 END LIMIT 1), 'user'::app_role);
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_role = 'admin'::app_role THEN
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id
      AND role NOT IN ('admin'::app_role, 'super_admin'::app_role);
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, status, is_active)
  VALUES (v_user_id, v_email, v_name, 'active'::user_status, true)
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    status = CASE
      WHEN lower(EXCLUDED.email) IN ('roni.comercial19@gmail.com', 'ronys191@gmail.com') THEN 'active'::user_status
      ELSE COALESCE(public.profiles.status, 'active'::user_status)
    END,
    is_active = true,
    updated_at = now();

  INSERT INTO public.user_profiles_extended (user_id, user_type, name, email, experience_level, training_environment)
  VALUES (
    v_user_id,
    CASE WHEN v_role IN ('admin'::app_role, 'professor'::app_role, 'trainer'::app_role, 'super_admin'::app_role) THEN 'professor' ELSE 'student' END,
    v_name,
    v_email,
    'iniciante',
    'academia'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(public.user_profiles_extended.name, ''), EXCLUDED.name),
    user_type = CASE WHEN v_role IN ('admin'::app_role, 'professor'::app_role, 'trainer'::app_role, 'super_admin'::app_role) THEN 'professor' ELSE public.user_profiles_extended.user_type END,
    updated_at = now();

  SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id = v_user_id),
         EXISTS(SELECT 1 FROM public.user_profiles_extended upe WHERE upe.user_id = v_user_id)
  INTO v_profile_exists, v_extended_exists;

  RETURN QUERY SELECT public.get_user_role(v_user_id), (v_profile_exists AND v_extended_exists);
END;
$$;

UPDATE public.profiles
SET status = 'active'::user_status,
    is_active = true,
    updated_at = now()
WHERE lower(email) IN ('roni.comercial19@gmail.com', 'ronys191@gmail.com');

INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
WHERE lower(p.email) IN ('roni.comercial19@gmail.com', 'ronys191@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_profiles_extended (user_id, user_type, name, email, experience_level, training_environment)
SELECT p.user_id, 'professor', COALESCE(p.full_name, split_part(p.email, '@', 1)), p.email, 'iniciante', 'academia'
FROM public.profiles p
WHERE lower(p.email) IN ('roni.comercial19@gmail.com', 'ronys191@gmail.com')
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(NULLIF(public.user_profiles_extended.name, ''), EXCLUDED.name),
  user_type = 'professor',
  updated_at = now();;
