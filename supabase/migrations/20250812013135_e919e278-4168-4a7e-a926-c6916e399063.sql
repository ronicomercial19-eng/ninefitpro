-- Tighten RLS for class_bookings
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'class_bookings' AND policyname = 'Everyone can manage class bookings'
  ) THEN
    DROP POLICY "Everyone can manage class bookings" ON public.class_bookings;
  END IF;
END $$;

-- Specific policies: users can manage their own bookings only
CREATE POLICY "Users can view own bookings"
ON public.class_bookings
FOR SELECT
USING (
  user_email = (
    SELECT users.email::text FROM auth.users WHERE users.id = auth.uid()
  )
);

CREATE POLICY "Users can insert own bookings"
ON public.class_bookings
FOR INSERT
WITH CHECK (
  user_email = (
    SELECT users.email::text FROM auth.users WHERE users.id = auth.uid()
  )
);

CREATE POLICY "Users can update own bookings"
ON public.class_bookings
FOR UPDATE
USING (
  user_email = (
    SELECT users.email::text FROM auth.users WHERE users.id = auth.uid()
  )
);

CREATE POLICY "Users can delete own bookings"
ON public.class_bookings
FOR DELETE
USING (
  user_email = (
    SELECT users.email::text FROM auth.users WHERE users.id = auth.uid()
  )
);