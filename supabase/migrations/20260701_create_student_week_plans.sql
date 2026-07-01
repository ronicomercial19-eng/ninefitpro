-- supabase/migrations/20260701_create_student_week_plans.sql
-- Migration: cria a tabela student_week_plans para armazenar semanas geradas (rascunho/aplicadas)

CREATE TABLE IF NOT EXISTS public.student_week_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  periodization_id uuid,
  training_model_id uuid,
  days jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','applied','archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);

-- Grants consistent with other migrations
GRANT SELECT, INSERT, UPDATE ON public.student_week_plans TO authenticated;
GRANT ALL ON public.student_week_plans TO service_role;

-- Enable realtime if desired (follow project migration conventions)
-- ALTER PUBLICATION supabase_realtime ADD TABLE student_week_plans;

