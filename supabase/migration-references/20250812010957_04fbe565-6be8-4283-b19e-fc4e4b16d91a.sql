-- Create table for class bookings
CREATE TABLE IF NOT EXISTS public.class_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.gym_classes(id) ON DELETE CASCADE,
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'booked'
);

-- Enable RLS and permissive policies (can be tightened later)
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'class_bookings' AND policyname = 'Everyone can manage class bookings'
  ) THEN
    CREATE POLICY "Everyone can manage class bookings"
    ON public.class_bookings
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;