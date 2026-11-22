
-- Add unique constraint on student_id for student_credits to support upsert
ALTER TABLE public.student_credits 
ADD CONSTRAINT student_credits_student_id_key UNIQUE (student_id);
