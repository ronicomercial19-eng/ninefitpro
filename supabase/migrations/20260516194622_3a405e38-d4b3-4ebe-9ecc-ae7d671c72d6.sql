-- Add library_items and student_library_assignments to realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.library_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_library_assignments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_training_assignments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_diet_assignments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Ensure REPLICA IDENTITY FULL for proper realtime delete/update events
ALTER TABLE public.library_items REPLICA IDENTITY FULL;
ALTER TABLE public.student_library_assignments REPLICA IDENTITY FULL;