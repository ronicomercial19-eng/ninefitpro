-- Drop existing problematic policies
DROP POLICY IF EXISTS "Professors can manage their students" ON students;
DROP POLICY IF EXISTS "Students can view their own data" ON students;

-- Fix students table if it exists, or create it
CREATE TABLE IF NOT EXISTS students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    full_name text NOT NULL,
    phone text,
    date_of_birth date,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    subscription_expires_at timestamp with time zone,
    emergency_contact_name text,
    emergency_contact_phone text,
    medical_conditions text,
    fitness_goals text,
    notes text,
    payment_status text DEFAULT 'pending' CHECK (payment_status IN ('active', 'pending', 'overdue')),
    professor_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for students
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create safe RLS policies for students
CREATE POLICY "professors_manage_students"
ON students
FOR ALL
USING (professor_id = auth.uid());

CREATE POLICY "students_view_own_data"
ON students
FOR SELECT  
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Create or replace update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for students table  
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER TABLE students REPLICA IDENTITY FULL;