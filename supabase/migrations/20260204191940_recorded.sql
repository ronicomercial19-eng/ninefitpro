-- 1. Atualizar o profile existente para admin
UPDATE public.profiles 
SET role = 'admin', 
    status = 'active',
    updated_at = now()
WHERE email = 'ronys191@gmail.com';

-- 2. Adicionar role 'admin' ao enum se ainda não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'admin';
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 3. Atualizar o trigger handle_new_user para detectar admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role_value user_role := 'professor';
BEGIN
  -- Define admin se for o email específico
  IF NEW.email = 'ronys191@gmail.com' THEN
    user_role_value := 'admin';
  END IF;
  
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name, 
    role,
    status,
    is_active,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role_value,
    'active',
    true,
    now(), 
    now()
  );
  
  RETURN NEW;
END;
$$;;
