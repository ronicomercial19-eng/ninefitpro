
-- Drop existing CHECK constraints on user_profiles
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_primary_goal_check;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_training_environment_check;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_session_duration_check;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_sleep_quality_check;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_stress_level_check;

-- Recreate with expanded values
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_primary_goal_check 
  CHECK (primary_goal = ANY (ARRAY['hipertrofia','emagrecimento','forca_maxima','performance_atletica','saude_qualidade_vida','performance','condicionamento']));

ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_training_environment_check 
  CHECK (training_environment = ANY (ARRAY['academia_completa','casa_equipamentos','peso_corporal','academia','casa']));

ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_session_duration_check 
  CHECK (session_duration = ANY (ARRAY['30min','45min','60min','60min+','90min_plus']));

ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_sleep_quality_check 
  CHECK (sleep_quality >= 1 AND sleep_quality <= 10);

ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_stress_level_check 
  CHECK (stress_level >= 1 AND stress_level <= 10);
;
