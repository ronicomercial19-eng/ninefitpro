-- Fix RLS policy that queries auth.users directly (causes permission denied)
DROP POLICY IF EXISTS "students_view_own_data" ON public.students;

-- The existing "Students can view own profile" and "Students can view their profile" policies 
-- already handle this using current_user_email() which is a SECURITY DEFINER function