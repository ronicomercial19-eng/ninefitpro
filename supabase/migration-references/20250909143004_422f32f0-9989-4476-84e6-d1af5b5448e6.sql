-- Fix infinite recursion in profiles RLS policies
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create safe RLS policies for profiles
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert profiles"
ON profiles
FOR INSERT
WITH CHECK (true);

-- Create students table for admin-managed students
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

-- Create RLS policies for students
CREATE POLICY "Professors can manage their students"
ON students
FOR ALL
USING (professor_id = auth.uid());

CREATE POLICY "Students can view their own data"
ON students
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for students table
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER TABLE students REPLICA IDENTITY FULL;