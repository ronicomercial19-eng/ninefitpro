-- Add RLS policy for athletes to view their own training assignments
CREATE POLICY "Athletes can view their own training assignments"
ON public.student_training_assignments
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT athlete_id FROM public.athlete_auth_link WHERE user_id = auth.uid()
  )
  OR 
  student_id IN (
    SELECT id FROM public.athletes WHERE user_id = auth.uid()
  )
);

-- Make training-html-files bucket public for reliable access
UPDATE storage.buckets SET public = true WHERE id = 'training-html-files';

-- Add policy for public read access to training HTML files
CREATE POLICY "Anyone can view training HTML files"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-html-files');

-- Add user_id column to athletes if not exists (for direct auth linking)
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);