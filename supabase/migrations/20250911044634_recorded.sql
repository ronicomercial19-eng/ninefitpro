-- Add corrected RLS policies with actual column names

-- Training models - Uses estudante_id column
DROP POLICY IF EXISTS "Users can view models" ON public.modelos_de_treino;
DROP POLICY IF EXISTS "Users can create models" ON public.modelos_de_treino;
DROP POLICY IF EXISTS "Users can update models" ON public.modelos_de_treino;

CREATE POLICY "Users can view models" ON public.modelos_de_treino
FOR SELECT USING (auth.uid() = estudante_id OR estudante_id IS NULL);

CREATE POLICY "Users can create models" ON public.modelos_de_treino
FOR INSERT WITH CHECK (auth.uid() = estudante_id OR estudante_id IS NULL);

CREATE POLICY "Users can update models" ON public.modelos_de_treino
FOR UPDATE USING (auth.uid() = estudante_id OR estudante_id IS NULL);

-- Generated plans - Uses estudante_id column
DROP POLICY IF EXISTS "Users can view plans" ON public.planos_de_treino_gerados;
DROP POLICY IF EXISTS "Users can create plans" ON public.planos_de_treino_gerados;

CREATE POLICY "Users can view plans" ON public.planos_de_treino_gerados
FOR SELECT USING (auth.uid() = estudante_id);

CREATE POLICY "Users can create plans" ON public.planos_de_treino_gerados
FOR INSERT WITH CHECK (auth.uid() = estudante_id);

-- Student periodization - Uses aluno_id column
DROP POLICY IF EXISTS "Users can view periodization" ON public.aluno_periodizacao;
DROP POLICY IF EXISTS "Users can create periodization" ON public.aluno_periodizacao;

CREATE POLICY "Users can view periodization" ON public.aluno_periodizacao
FOR SELECT USING (auth.uid() = aluno_id);

CREATE POLICY "Users can create periodization" ON public.aluno_periodizacao
FOR INSERT WITH CHECK (auth.uid() = aluno_id);

-- Check if uploads_periodizacao exists and add policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uploads_periodizacao' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view uploads" ON public.uploads_periodizacao;
        DROP POLICY IF EXISTS "Users can create uploads" ON public.uploads_periodizacao;
        
        EXECUTE 'CREATE POLICY "Users can view uploads" ON public.uploads_periodizacao FOR SELECT USING (auth.uid() = estudante_id)';
        EXECUTE 'CREATE POLICY "Users can create uploads" ON public.uploads_periodizacao FOR INSERT WITH CHECK (auth.uid() = estudante_id)';
    END IF;
END
$$;;
