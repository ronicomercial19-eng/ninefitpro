ALTER TABLE public.student_training_assignments 
DROP CONSTRAINT IF EXISTS student_training_assignments_training_type_check;

ALTER TABLE public.student_training_assignments 
ADD CONSTRAINT student_training_assignments_training_type_check
CHECK (training_type IN ('json','html','link','workout','diet','periodization','structured','ai_generated','file'));