-- AI Chat Messages: persistência completa do RON
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_created
  ON public.ai_chat_messages (user_id, created_at DESC);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own ai messages" ON public.ai_chat_messages;
CREATE POLICY "user reads own ai messages"
  ON public.ai_chat_messages FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user inserts own ai messages" ON public.ai_chat_messages;
CREATE POLICY "user inserts own ai messages"
  ON public.ai_chat_messages FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user deletes own ai messages" ON public.ai_chat_messages;
CREATE POLICY "user deletes own ai messages"
  ON public.ai_chat_messages FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Realtime publication: garante eventos para as tabelas críticas
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ai_chat_messages',
    'master_registry',
    'student_training_assignments',
    'student_diet_assignments',
    'student_library_assignments',
    'library_items',
    'notifications'
  ]) LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END $$;