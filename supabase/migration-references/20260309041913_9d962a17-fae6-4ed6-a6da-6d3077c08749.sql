-- Backfill and index for athlete_id on legacy tables
-- FK constraints already exist, skip constraint creation

-- Backfill athlete_id from aluno_id where possible (workout_progress)
UPDATE public.workout_progress wp
SET athlete_id = wp.aluno_id
WHERE wp.athlete_id IS NULL AND wp.aluno_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = wp.aluno_id);

-- Backfill athlete_id from aluno_id (avaliacoes_unificadas)
UPDATE public.avaliacoes_unificadas au
SET athlete_id = au.aluno_id
WHERE au.athlete_id IS NULL AND au.aluno_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = au.aluno_id);

-- Backfill athlete_id from student_id (student_measurements)
UPDATE public.student_measurements sm
SET athlete_id = sm.student_id
WHERE sm.athlete_id IS NULL AND sm.student_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = sm.student_id);

-- Backfill athlete_id from student_id (student_photos)
UPDATE public.student_photos sp
SET athlete_id = sp.student_id
WHERE sp.athlete_id IS NULL AND sp.student_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = sp.student_id);

-- Backfill athlete_id from student_id (student_anamnesis)
UPDATE public.student_anamnesis sa
SET athlete_id = sa.student_id
WHERE sa.athlete_id IS NULL AND sa.student_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = sa.student_id);

-- Backfill athlete_id from student_id (student_activity_history)
UPDATE public.student_activity_history sah
SET athlete_id = sah.student_id
WHERE sah.athlete_id IS NULL AND sah.student_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = sah.student_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_progress_athlete_id ON public.workout_progress(athlete_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_unificadas_athlete_id ON public.avaliacoes_unificadas(athlete_id);
CREATE INDEX IF NOT EXISTS idx_student_measurements_athlete_id ON public.student_measurements(athlete_id);
CREATE INDEX IF NOT EXISTS idx_student_photos_athlete_id ON public.student_photos(athlete_id);
CREATE INDEX IF NOT EXISTS idx_student_anamnesis_athlete_id ON public.student_anamnesis(athlete_id);
CREATE INDEX IF NOT EXISTS idx_student_activity_history_athlete_id ON public.student_activity_history(athlete_id);

-- Add deprecation comments
COMMENT ON COLUMN public.workout_progress.aluno_id IS 'DEPRECATED: Use athlete_id instead. Kept for backward compatibility.';
COMMENT ON COLUMN public.avaliacoes_unificadas.aluno_id IS 'DEPRECATED: Use athlete_id instead. Kept for backward compatibility.';
COMMENT ON COLUMN public.student_measurements.student_id IS 'DEPRECATED: Use athlete_id instead. Kept for backward compatibility.';
COMMENT ON COLUMN public.student_photos.student_id IS 'DEPRECATED: Use athlete_id instead. Kept for backward compatibility.';
COMMENT ON COLUMN public.student_anamnesis.student_id IS 'DEPRECATED: Use athlete_id instead. Kept for backward compatibility.';
COMMENT ON COLUMN public.student_activity_history.student_id IS 'DEPRECATED: Use athlete_id instead. Kept for backward compatibility.';