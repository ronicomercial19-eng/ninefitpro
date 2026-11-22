-- Add invitation fields to athletes table if not exists
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS auto_password_temp TEXT,
ADD COLUMN IF NOT EXISTS password_changed BOOLEAN DEFAULT false;

-- Create function to create auth user for athlete
CREATE OR REPLACE FUNCTION public.create_athlete_auth_user(
  p_athlete_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_name TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result jsonb;
BEGIN
  -- Create user in auth.users using admin API (requires service role)
  -- This will be called from edge function with service role
  
  -- Update athlete with temp password for reference
  UPDATE public.athletes 
  SET 
    auto_password_temp = p_password,
    password_changed = false,
    activated = true
  WHERE id = p_athlete_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'athlete_id', p_athlete_id,
    'email', p_email
  );
END;
$$;

-- Create table to link athletes with auth users
CREATE TABLE IF NOT EXISTS public.athlete_auth_link (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(athlete_id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.athlete_auth_link ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own link" 
ON public.athlete_auth_link 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Coaches can view their athletes links" 
ON public.athlete_auth_link 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.athletes a 
    WHERE a.id = athlete_id 
    AND a.coach_id = auth.uid()
  )
);

CREATE POLICY "System can insert links" 
ON public.athlete_auth_link 
FOR INSERT 
TO authenticated
WITH CHECK (true);