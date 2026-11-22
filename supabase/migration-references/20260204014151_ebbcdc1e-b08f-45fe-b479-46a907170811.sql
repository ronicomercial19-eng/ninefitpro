-- Add email column to athletes table if not exists
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS email TEXT;

-- Create unique index on email (optional, for faster lookups)
CREATE INDEX IF NOT EXISTS idx_athletes_email ON public.athletes(email);

-- Update existing athletes to extract email from metadata
UPDATE public.athletes 
SET email = (metadata->>'email')::TEXT
WHERE email IS NULL 
  AND metadata IS NOT NULL 
  AND metadata->>'email' IS NOT NULL;