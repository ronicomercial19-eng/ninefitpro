-- Set default status to 'pending' for new profiles
ALTER TABLE profiles ALTER COLUMN status SET DEFAULT 'pending'::user_status;

-- Create or replace the handle_new_user function to set pending status for non-admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  -- Check if this is an admin email
  is_admin_user := NEW.email IN ('jonathas2014jln@gmail.com', 'admin@fitevolution.com', 'joathaslins@gmail.com');
  
  -- Insert profile with appropriate status
  INSERT INTO public.profiles (id, email, status)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN is_admin_user THEN 'active'::user_status ELSE 'pending'::user_status END
  );
  
  -- Insert role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN is_admin_user THEN 'admin'::app_role ELSE 'user'::app_role END
  );
  
  RETURN NEW;
END;
$$;

-- Create helper function to check if user is approved (status = 'active' or is admin)
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND status = 'active'
  ) OR public.has_role(_user_id, 'admin')
$$;