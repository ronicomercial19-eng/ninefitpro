-- PRIORIDADE 1: FK Migration para Athletes (Compatibilidade Retroativa)
-- Corrigindo conflito de views e adicionando athlete_id às tabelas legacy

-- Remover views que podem causar conflito de nomenclatura
DROP VIEW IF EXISTS public.v_workout_progress_canonical CASCADE;
DROP VIEW IF EXISTS public.v_assessments_canonical CASCADE;

-- 1. workout_progress: adicionar athlete_id referenciando athletes
ALTER TABLE public.workout_progress 
ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_workout_progress_athlete_id ON public.workout_progress(athlete_id);

-- 2. avaliacoes_unificadas: adicionar athlete_id referenciando athletes
ALTER TABLE public.avaliacoes_unificadas
ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_avaliacoes_unificadas_athlete_id ON public.avaliacoes_unificadas(athlete_id);

-- 3. student_measurements: adicionar athlete_id referenciando athletes
ALTER TABLE public.student_measurements
ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_student_measurements_athlete_id ON public.student_measurements(athlete_id);

-- 4. student_photos: adicionar athlete_id referenciando athletes
ALTER TABLE public.student_photos
ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_student_photos_athlete_id ON public.student_photos(athlete_id);

-- 5. student_anamnesis: adicionar athlete_id referenciando athletes
ALTER TABLE public.student_anamnesis
ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_student_anamnesis_athlete_id ON public.student_anamnesis(athlete_id);

-- 6. student_activity_history: adicionar athlete_id referenciando athletes
ALTER TABLE public.student_activity_history
ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_student_activity_history_athlete_id ON public.student_activity_history(athlete_id);

-- Popular athlete_id com base em dados existentes
-- Para workout_progress e avaliacoes_unificadas (usam aluno_id -> athletes.aluno_id)
UPDATE public.workout_progress wp
SET athlete_id = a.id
FROM public.athletes a
WHERE wp.aluno_id = a.aluno_id
AND wp.athlete_id IS NULL;

UPDATE public.avaliacoes_unificadas au
SET athlete_id = a.id
FROM public.athletes a
WHERE au.aluno_id = a.aluno_id
AND au.athlete_id IS NULL;

-- Criar view unificada para workout_progress com nome único
CREATE VIEW public.vw_workout_progress_unified AS
SELECT 
  wp.*,
  COALESCE(wp.athlete_id, a.id) as resolved_athlete_id
FROM public.workout_progress wp
LEFT JOIN public.athletes a ON wp.aluno_id = a.aluno_id;

-- Criar view unificada para avaliacoes_unificadas com nome único
CREATE VIEW public.vw_assessments_unified AS
SELECT 
  au.*,
  COALESCE(au.athlete_id, a.id) as resolved_athlete_id
FROM public.avaliacoes_unificadas au
LEFT JOIN public.athletes a ON au.aluno_id = a.aluno_id;

-- Comentários nas colunas
COMMENT ON COLUMN public.workout_progress.athlete_id IS 'Canonical FK to athletes table. Use this instead of aluno_id for new queries.';
COMMENT ON COLUMN public.avaliacoes_unificadas.athlete_id IS 'Canonical FK to athletes table. Use this instead of aluno_id for new queries.';
COMMENT ON COLUMN public.student_measurements.athlete_id IS 'Canonical FK to athletes table. Use this instead of student_id for new queries.';
COMMENT ON COLUMN public.student_photos.athlete_id IS 'Canonical FK to athletes table. Use this instead of student_id for new queries.';
COMMENT ON COLUMN public.student_anamnesis.athlete_id IS 'Canonical FK to athletes table. Use this instead of student_id for new queries.';
COMMENT ON COLUMN public.student_activity_history.athlete_id IS 'Canonical FK to athletes table. Use this instead of student_id for new queries.';;
