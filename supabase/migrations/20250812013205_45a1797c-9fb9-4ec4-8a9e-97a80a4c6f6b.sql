-- Cleanup any overly permissive policies on class_bookings if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'class_bookings' AND policyname = 'Everyone can manage bookings'
  ) THEN
    DROP POLICY "Everyone can manage bookings" ON public.class_bookings;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'class_bookings' AND policyname = 'Everyone can view bookings'
  ) THEN
    DROP POLICY "Everyone can view bookings" ON public.class_bookings;
  END IF;
END $$;