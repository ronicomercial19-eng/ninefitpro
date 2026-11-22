CREATE TABLE IF NOT EXISTS public.prescricao_metodo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  workout_date date NOT NULL,
  escopo text NOT NULL CHECK (escopo IN ('treino','exercicio')),
  workout_exercise_id uuid NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  metodo_codigo text NOT NULL REFERENCES public.densificacao_metodos(codigo),
  definido_por uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((escopo = 'treino' AND workout_exercise_id IS NULL) OR (escopo = 'exercicio' AND workout_exercise_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_prescricao_metodo_athlete_date ON public.prescricao_metodo (athlete_id, workout_date);

ALTER TABLE public.prescricao_metodo ENABLE ROW LEVEL SECURITY;

CREATE POLICY prescricao_metodo_read ON public.prescricao_metodo FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = prescricao_metodo.athlete_id AND l.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = prescricao_metodo.athlete_id AND a.coach_id = auth.uid())
    OR public.is_admin()
  );;
