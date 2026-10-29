CREATE TABLE public.core_chat_threads (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
 thread_id text NOT NULL UNIQUE CHECK (length(thread_id) BETWEEN 1 AND 200),
 phone text NOT NULL CHECK (phone ~ '^\+55[1-9][0-9]{9,10}$'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX core_chat_threads_athlete_idx ON public.core_chat_threads(athlete_id);
ALTER TABLE public.core_chat_threads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.core_chat_threads FROM anon, authenticated;
GRANT ALL ON public.core_chat_threads TO service_role;

