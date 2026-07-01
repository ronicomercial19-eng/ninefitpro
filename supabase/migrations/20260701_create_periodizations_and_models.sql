-- supabase/migrations/20260701_create_periodizations_and_models.sql
-- Migration: create minimal periodizations and training models tables + seeds

CREATE TABLE IF NOT EXISTS public.periodizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  focus text NOT NULL,
  cycle_weeks int DEFAULT 4,
  difficulty_factor numeric DEFAULT 0.5,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  popularity int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_model_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.training_models(id) ON DELETE CASCADE,
  min_days int,
  recommended_experience text,
  notes text
);

-- Seeds: basic periodizations
INSERT INTO public.periodizations (id, name, focus, cycle_weeks, difficulty_factor)
VALUES
  (gen_random_uuid(), 'General Conditioning', 'general', 4, 0.4),
  (gen_random_uuid(), 'Strength Cycle', 'strength', 6, 0.8),
  (gen_random_uuid(), 'Hypertrophy Block', 'hypertrophy', 5, 0.6)
ON CONFLICT DO NOTHING;

-- Seeds: basic training models
INSERT INTO public.training_models (id, name, description, popularity)
VALUES
  (gen_random_uuid(), 'Full Body 3x', 'Full body for 3 sessions/week', 50),
  (gen_random_uuid(), 'Upper/Lower 4x', 'Upper/Lower split 4x/week', 70),
  (gen_random_uuid(), 'Push/Pull/Legs 5x', 'PPL 5x/week', 60)
ON CONFLICT DO NOTHING;

-- Link meta
INSERT INTO public.training_model_meta (model_id, min_days, recommended_experience, notes)
SELECT id, 3, 'beginner', 'Full body recommended for beginners' FROM public.training_models WHERE name = 'Full Body 3x' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.training_model_meta (model_id, min_days, recommended_experience, notes)
SELECT id, 4, 'intermediate', 'Upper/Lower for intermediate athletes' FROM public.training_models WHERE name = 'Upper/Lower 4x' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.training_model_meta (model_id, min_days, recommended_experience, notes)
SELECT id, 5, 'advanced', 'PPL for advanced athletes' FROM public.training_models WHERE name = 'Push/Pull/Legs 5x' LIMIT 1
ON CONFLICT DO NOTHING;
