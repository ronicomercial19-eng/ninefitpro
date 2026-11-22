-- Garantir que o enum user_role existe com os valores corretos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'professor', 'student', 'demo');
  END IF;
END $$;

-- Garantir que o enum app_role tem o valor 'user'
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Corrigir a função handle_new_user para evitar conflitos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Inserir profile com ON CONFLICT para evitar erros
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.email IN ('admin@system.com', 'roni.comercial19@gmail.com', 'ronys191@gmail.com') 
            THEN 'admin'::public.user_role
            ELSE 'student'::public.user_role
        END
    )
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        role = EXCLUDED.role;
    
    -- Sincronizar user_roles
    IF NEW.email IN ('roni.comercial19@gmail.com', 'ronys191@gmail.com', 'admin@system.com') THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'user'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log o erro mas não bloqueia o cadastro
    RAISE WARNING 'Erro ao criar perfil: %', SQLERRM;
    RETURN NEW;
END;
$function$;;
