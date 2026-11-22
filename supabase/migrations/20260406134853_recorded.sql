-- RLS policy for smart_treino_protocols: allow authenticated users to read all protocols
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'smart_treino_protocols' AND policyname = 'Authenticated users can read protocols'
  ) THEN
    ALTER TABLE public.smart_treino_protocols ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Authenticated users can read protocols"
      ON public.smart_treino_protocols
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;;
