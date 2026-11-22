-- QA roadmap Fase C (07/09): AITrainingPage.tsx guardava treinos gerados só em
-- useState local — sumiam ao recarregar a página, e a busca "Pesquisar treinos
-- gerados" ficava decorativa por consequência. Tabela dedicada pra persistir.
CREATE TABLE public.ai_training_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES public.athletes(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  html text NOT NULL,
  request_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_training_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach gerencia proprios treinos gerados"
ON public.ai_training_generations
FOR ALL
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());;
