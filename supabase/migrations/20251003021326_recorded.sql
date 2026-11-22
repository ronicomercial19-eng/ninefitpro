-- 1) Enum para papéis
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'professor', 'student', 'demo');
  END IF;
END $$;

-- 2) Tabela de papéis de usuário
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas básicas para leitura própria (opcional)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='Users can view own roles'
  ) THEN
    CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- 3) Função de checagem de papel (segura)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
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
      AND role = _role
  );
$$;

-- 4) Garantir RLS em athletes e políticas adequadas
-- Habilita RLS
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='athletes' AND policyname='Admins manage all athletes') THEN
    DROP POLICY "Admins manage all athletes" ON public.athletes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='athletes' AND policyname='Coaches insert own athletes') THEN
    DROP POLICY "Coaches insert own athletes" ON public.athletes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='athletes' AND policyname='Coaches update own athletes') THEN
    DROP POLICY "Coaches update own athletes" ON public.athletes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='athletes' AND policyname='Coaches delete own athletes') THEN
    DROP POLICY "Coaches delete own athletes" ON public.athletes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='athletes' AND policyname='Coaches select own athletes') THEN
    DROP POLICY "Coaches select own athletes" ON public.athletes;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='athletes' AND policyname='Admins select all athletes') THEN
    DROP POLICY "Admins select all athletes" ON public.athletes;
  END IF;
END $$;

-- Políticas novas
-- Admin pode tudo
CREATE POLICY "Admins manage all athletes"
ON public.athletes
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Professores CRUD apenas dos seus registros
CREATE POLICY "Coaches insert own athletes"
ON public.athletes
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches update own athletes"
ON public.athletes
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches delete own athletes"
ON public.athletes
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (coach_id = auth.uid());

CREATE POLICY "Coaches select own athletes"
ON public.athletes
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (coach_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5) Trigger de updated_at (caso ainda não exista)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_athletes_updated_at'
  ) THEN
    CREATE TRIGGER update_athletes_updated_at
    BEFORE UPDATE ON public.athletes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_athletes_updated_at();
  END IF;
END $$;
;
