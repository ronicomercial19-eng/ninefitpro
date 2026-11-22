
-- Liga appointments a uma aula de grade fixa (gym_classes), quando aplicável
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS gym_class_id UUID REFERENCES public.gym_classes(id);
CREATE INDEX IF NOT EXISTS idx_appointments_gym_class ON public.appointments(gym_class_id);
;
