-- Fix critical security issues

-- 1. Fix search_path in existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.email = 'admin@system.com' THEN 'admin'::public.user_role
            ELSE 'student'::public.user_role
        END
    );
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.gerar_modelo_treino(p_estudante_id uuid, p_objetivo text, p_nivel text, p_periodizacao jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(modelo_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  novo_id uuid := gen_random_uuid();
BEGIN
  -- Valida estudante
  IF NOT EXISTS (SELECT 1 FROM estudantes WHERE id = p_estudante_id) THEN
    RAISE EXCEPTION 'Estudante não encontrado';
  END IF;

  -- Insere novo modelo
  INSERT INTO modelos_de_treino (id, estudante_id, objetivo, nivel, periodizacao, criado_em, tag, nome, descricao)
  VALUES (novo_id, p_estudante_id, p_objetivo, p_nivel, p_periodizacao, now(), 'gerado_programa', 
          CONCAT('Modelo ', p_objetivo, ' - ', p_nivel), 
          CONCAT('Modelo gerado para ', p_objetivo, ' nível ', p_nivel));

  RETURN QUERY SELECT novo_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_periodizacao_correspondencia(estudante uuid)
RETURNS TABLE(semana integer, carga_prevista numeric, carga_real numeric, diferenca numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.semana,
        p.carga_prevista,
        p.carga_real,
        (p.carga_real - p.carga_prevista) AS diferenca
    FROM periodizacoes_novas p
    WHERE p.estudante_id = estudante
    ORDER BY p.semana;
END;
$function$;

-- 2. Add missing RLS policies for tables that have RLS enabled but no policies

-- For payments table (if it exists and has RLS but no policies)
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "System can manage payments" 
ON public.payments 
FOR ALL 
USING (true);

-- For vacation_freeze_requests (already has policies but let's ensure they're secure)
-- Policy already exists, but let's make it more secure
DROP POLICY IF EXISTS "Everyone can manage freeze requests" ON public.vacation_freeze_requests;
DROP POLICY IF EXISTS "Everyone can view freeze requests" ON public.vacation_freeze_requests;

CREATE POLICY "Users can manage their own freeze requests" 
ON public.vacation_freeze_requests 
FOR ALL 
USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- For user_achievements (make it user-specific)
DROP POLICY IF EXISTS "Everyone can manage achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Everyone can view achievements" ON public.user_achievements;

CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "System can create achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (true);

-- For user_program_progress (make it user-specific)
DROP POLICY IF EXISTS "Everyone can manage user progress" ON public.user_program_progress;
DROP POLICY IF EXISTS "Everyone can view user progress" ON public.user_program_progress;

CREATE POLICY "Users can manage their own progress" 
ON public.user_program_progress 
FOR ALL 
USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- For avaliacoes and historico_avaliacoes (make them more secure)
DROP POLICY IF EXISTS "Users can manage current assessments" ON public.avaliacoes;
DROP POLICY IF EXISTS "Users can view current assessments" ON public.avaliacoes;

CREATE POLICY "Users can view their own assessments" 
ON public.avaliacoes 
FOR SELECT 
USING (estudante_id = auth.uid());

CREATE POLICY "Authorized users can manage assessments" 
ON public.avaliacoes 
FOR ALL 
USING (estudante_id = auth.uid() OR EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
));

DROP POLICY IF EXISTS "Users can manage assessment history" ON public.historico_avaliacoes;
DROP POLICY IF EXISTS "Users can view assessment history" ON public.historico_avaliacoes;

CREATE POLICY "Users can view their own assessment history" 
ON public.historico_avaliacoes 
FOR SELECT 
USING (estudante_id = auth.uid());

CREATE POLICY "System can insert assessment history" 
ON public.historico_avaliacoes 
FOR INSERT 
WITH CHECK (true);;
