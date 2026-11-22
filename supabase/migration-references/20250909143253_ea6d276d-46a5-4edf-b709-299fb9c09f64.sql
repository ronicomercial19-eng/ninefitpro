-- Simply fix the RLS policies without touching realtime
CREATE POLICY "professors_manage_students"
ON students
FOR ALL
USING (professor_id = auth.uid());

CREATE POLICY "students_view_own_data"
ON students
FOR SELECT  
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));