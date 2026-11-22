-- FASE 9: Correção completa do sistema

-- 1. Sincronizar admin na tabela profiles
INSERT INTO public.profiles (user_id, email, full_name, role)
SELECT id, email, 'Admin Principal', 'admin'::user_role
FROM auth.users
WHERE email = 'roni.comercial19@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET 
  role = 'admin'::user_role,
  full_name = COALESCE(profiles.full_name, 'Admin Principal');

-- 2. Garantir user_roles correto para admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'roni.comercial19@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Criar índices para performance nas consultas de periodização
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_periodization_models_goal ON public.periodization_models(goal);
CREATE INDEX IF NOT EXISTS idx_profile_periodization_matches_user ON public.profile_periodization_matches(user_profile_id);;
