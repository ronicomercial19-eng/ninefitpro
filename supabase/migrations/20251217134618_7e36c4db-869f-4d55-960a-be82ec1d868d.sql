-- Create table for storing PDF physical assessments
CREATE TABLE public.student_pdf_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_pdf_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view assessments" 
ON public.student_pdf_assessments 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can insert assessments" 
ON public.student_pdf_assessments 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can delete assessments" 
ON public.student_pdf_assessments 
FOR DELETE 
TO authenticated
USING (true);

-- Create storage bucket for assessments if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('assessments', 'assessments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for assessments bucket
CREATE POLICY "Anyone can view assessments"
ON storage.objects FOR SELECT
USING (bucket_id = 'assessments');

CREATE POLICY "Authenticated users can upload assessments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assessments');

CREATE POLICY "Authenticated users can delete assessments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assessments');