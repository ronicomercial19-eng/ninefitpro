
-- FASE 4: Sistema de Treinos e Progressão

-- 1. Workout executions table
CREATE TABLE public.workout_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  periodization_id UUID,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  week_number INT,
  day_number INT,
  phase_name TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'skipped')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_minutes INT,
  total_volume_kg NUMERIC DEFAULT 0,
  avg_rpe NUMERIC,
  notes TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Per-set tracking
CREATE TABLE public.workout_exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workout_executions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_order INT NOT NULL DEFAULT 0,
  set_number INT NOT NULL,
  planned_reps TEXT,
  actual_reps INT,
  planned_weight NUMERIC,
  actual_weight NUMERIC,
  rpe NUMERIC CHECK (rpe BETWEEN 1 AND 10),
  tempo TEXT,
  rest_seconds INT,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_workout_executions_athlete ON public.workout_executions(athlete_id);
CREATE INDEX idx_workout_executions_date ON public.workout_executions(workout_date DESC);
CREATE INDEX idx_exercise_sets_execution ON public.workout_exercise_sets(execution_id);

-- 4. RLS
ALTER TABLE public.workout_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercise_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes manage own executions" ON public.workout_executions
  FOR ALL TO authenticated
  USING (
    athlete_id IN (SELECT athlete_id FROM public.athlete_auth_link WHERE user_id = auth.uid())
    OR public.is_trainer(auth.uid())
  );

CREATE POLICY "Athletes manage own sets" ON public.workout_exercise_sets
  FOR ALL TO authenticated
  USING (
    execution_id IN (
      SELECT id FROM public.workout_executions 
      WHERE athlete_id IN (SELECT athlete_id FROM public.athlete_auth_link WHERE user_id = auth.uid())
    )
    OR public.is_trainer(auth.uid())
  );

-- 5. Progression view
CREATE OR REPLACE VIEW public.v_workout_progression AS
SELECT 
  we.athlete_id,
  we.workout_date,
  we.phase_name,
  we.week_number,
  we.duration_minutes,
  we.total_volume_kg,
  we.avg_rpe,
  we.rating,
  COUNT(DISTINCT wes.exercise_name) AS exercises_count,
  SUM(CASE WHEN wes.completed THEN 1 ELSE 0 END) AS sets_completed,
  COUNT(wes.id) AS total_sets,
  MAX(wes.actual_weight) AS max_weight,
  AVG(wes.actual_weight) FILTER (WHERE wes.actual_weight > 0) AS avg_weight
FROM public.workout_executions we
LEFT JOIN public.workout_exercise_sets wes ON wes.execution_id = we.id
WHERE we.status = 'completed'
GROUP BY we.id, we.athlete_id, we.workout_date, we.phase_name, we.week_number, 
         we.duration_minutes, we.total_volume_kg, we.avg_rpe, we.rating
ORDER BY we.workout_date DESC;

-- 6. Auto-complete trigger
CREATE OR REPLACE FUNCTION public.trigger_workout_completion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
    NEW.completed_at = now();
    SELECT COALESCE(SUM(actual_weight * actual_reps), 0), COALESCE(AVG(rpe), 0)
    INTO NEW.total_volume_kg, NEW.avg_rpe
    FROM public.workout_exercise_sets WHERE execution_id = NEW.id AND completed = true;
    PERFORM public.log_event('completed', 'workout', NEW.id, NEW.athlete_id,
      jsonb_build_object('volume', NEW.total_volume_kg, 'duration', NEW.duration_minutes));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workout_completion
  BEFORE UPDATE ON public.workout_executions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_workout_completion();
;
