-- Create student credits system for class scheduling
CREATE TABLE IF NOT EXISTS public.student_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  total_credits INTEGER NOT NULL DEFAULT 0,
  used_credits INTEGER NOT NULL DEFAULT 0,
  expires_at DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vacation requests table
CREATE TABLE IF NOT EXISTS public.vacation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add credit deduction column to class_bookings
ALTER TABLE public.class_bookings 
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add price to gym classes
ALTER TABLE public.gym_classes 
ADD COLUMN IF NOT EXISTS credits_required INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS class_type TEXT DEFAULT 'regular';

-- Add video_url and gif_url columns to exercises for caching
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS gif_url TEXT,
ADD COLUMN IF NOT EXISTS video_cached_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS external_video_id TEXT;

-- Enable RLS
ALTER TABLE public.student_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_credits
CREATE POLICY "Students can view their own credits"
ON public.student_credits FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.athletes WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Coaches can manage credits"
ON public.student_credits FOR ALL
USING (
  student_id IN (
    SELECT id FROM public.athletes WHERE coach_id = auth.uid()
  )
);

-- RLS Policies for vacation_requests
CREATE POLICY "Students can view their own vacation requests"
ON public.vacation_requests FOR SELECT
USING (
  student_id IN (
    SELECT id FROM public.athletes WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Students can create vacation requests"
ON public.vacation_requests FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT id FROM public.athletes WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Coaches can manage vacation requests"
ON public.vacation_requests FOR ALL
USING (
  student_id IN (
    SELECT id FROM public.athletes WHERE coach_id = auth.uid()
  )
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_student_credits_updated_at
BEFORE UPDATE ON public.student_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_credits_student ON public.student_credits(student_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_student ON public.vacation_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_status ON public.vacation_requests(status);
CREATE INDEX IF NOT EXISTS idx_class_bookings_checkin ON public.class_bookings(check_in_at);
CREATE INDEX IF NOT EXISTS idx_exercises_external_video ON public.exercises(external_video_id);