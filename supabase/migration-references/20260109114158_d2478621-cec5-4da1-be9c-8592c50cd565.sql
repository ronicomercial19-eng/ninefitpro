-- Primeiro, adicionar os novos valores ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'trainer';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'student';