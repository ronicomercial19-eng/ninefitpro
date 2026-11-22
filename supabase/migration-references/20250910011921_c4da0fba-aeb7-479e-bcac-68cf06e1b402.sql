-- Complete gym management database schema implementation

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workout_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_type AS ENUM ('announcement', 'workout', 'nutrition', 'tips');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('supplement', 'equipment', 'apparel', 'membership');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create comprehensive users table (extending profiles)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Create student_profiles table (extending students)
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES auth.users(id),
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_conditions TEXT,
    fitness_goals TEXT,
    notes TEXT,
    payment_status payment_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create workouts table
CREATE TABLE IF NOT EXISTS workouts_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    category TEXT,
    difficulty_level difficulty_level,
    estimated_duration INTEGER, -- in minutes
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create exercises table (enhanced version)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS muscle_groups JSONB DEFAULT '[]';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment_needed TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create workout_exercises table
CREATE TABLE IF NOT EXISTS workout_exercises_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES workouts_new(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    sets INTEGER,
    reps TEXT, -- can be range like "8-12"
    weight DECIMAL(5,2),
    rest_time INTEGER, -- in seconds
    notes TEXT,
    order_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create workout_assignments table (enhanced from existing)
CREATE TABLE IF NOT EXISTS workout_assignments_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id),
    workout_id UUID NOT NULL REFERENCES workouts_new(id),
    assigned_by UUID NOT NULL REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    start_date DATE,
    end_date DATE,
    status workout_status DEFAULT 'active',
    notes TEXT
);

-- Create workout_logs table
CREATE TABLE IF NOT EXISTS workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id),
    workout_id UUID NOT NULL REFERENCES workouts_new(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);

-- Create exercise_logs table
CREATE TABLE IF NOT EXISTS exercise_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_log_id UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    sets_completed INTEGER,
    reps_completed TEXT,
    weight_used DECIMAL(5,2),
    notes TEXT
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id),
    teacher_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER, -- in minutes
    status appointment_status DEFAULT 'scheduled',
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type post_type NOT NULL,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    target_audience TEXT DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type product_type NOT NULL,
    price DECIMAL(10,2),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    stock_quantity INTEGER,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    status payment_status DEFAULT 'pending',
    transaction_id TEXT,
    description TEXT,
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create supersets table (based on screenshot)
CREATE TABLE IF NOT EXISTS supersets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    exercises JSONB NOT NULL DEFAULT '[]',
    difficulty_level difficulty_level,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reference_series table (based on screenshot)
CREATE TABLE IF NOT EXISTS reference_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    difficulty_level difficulty_level,
    exercises JSONB NOT NULL DEFAULT '[]',
    duration_weeks INTEGER,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_assignments_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supersets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_series ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Student profiles policies
CREATE POLICY "Teachers can manage their students profiles" ON student_profiles
    FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Students can view own profile" ON student_profiles
    FOR SELECT USING (user_id = auth.uid());

-- Workouts policies
CREATE POLICY "Teachers can manage workouts" ON workouts_new
    FOR ALL USING (created_by = auth.uid());

CREATE POLICY "Everyone can view templates" ON workouts_new
    FOR SELECT USING (is_template = true);

-- Workout assignments policies
CREATE POLICY "Teachers can assign workouts to their students" ON workout_assignments_new
    FOR ALL USING (assigned_by = auth.uid());

CREATE POLICY "Students can view their assignments" ON workout_assignments_new
    FOR SELECT USING (student_id = auth.uid());

-- Appointments policies
CREATE POLICY "Teachers can manage their appointments" ON appointments
    FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their appointments" ON appointments
    FOR SELECT USING (student_id = auth.uid());

-- Posts policies
CREATE POLICY "Authors can manage their posts" ON posts
    FOR ALL USING (author_id = auth.uid());

CREATE POLICY "Everyone can view published posts" ON posts
    FOR SELECT USING (is_published = true);

-- Notifications policies
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Supersets and reference series policies
CREATE POLICY "Teachers can manage supersets" ON supersets
    FOR ALL USING (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "Teachers can manage reference series" ON reference_series
    FOR ALL USING (created_by = auth.uid() OR created_by IS NULL);

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_student_profiles_teacher ON student_profiles(teacher_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_student ON workout_assignments_new(student_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_status ON workout_assignments_new(status);
CREATE INDEX IF NOT EXISTS idx_appointments_teacher_date ON appointments(teacher_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_student_date ON appointments(student_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts_new FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supersets_updated_at BEFORE UPDATE ON supersets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reference_series_updated_at BEFORE UPDATE ON reference_series FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();