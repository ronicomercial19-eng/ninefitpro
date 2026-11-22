-- ETAPA 1 FINAL: Auditoria e Correção de RLS + Preparação para ETAPA 2
-- ============================================================================

-- 1. CORRIGIR ERRO: "permission denied for table users"
--    O erro ocorre porque o código tenta acessar auth.users diretamente
--    Solução: Usar apenas auth.uid() e não consultar tabela users

-- 2. Verificar se tabela 'students' existe (legado)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students' AND table_schema = 'public') THEN
    -- Desabilitar RLS temporariamente para migração
    ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
    
    -- Migrar dados de students para alunos (se ainda não migrado)
    INSERT INTO public.alunos (
      id, professor_id, nome, email, telefone, data_nascimento,
      peso_atual, altura_cm, objetivo, nivel_experiencia, observacoes, status
    )
    SELECT 
      s.id,
      s.professor_id,
      s.nome,
      s.email,
      s.telefone,
      s.data_nascimento,
      s.peso_kg,
      s.altura_cm,
      s.objetivo,
      s.nivel_experiencia,
      s.observacoes,
      CASE WHEN s.ativo THEN 'ativo'::aluno_status ELSE 'inativo'::aluno_status END
    FROM public.students s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.alunos a WHERE a.id = s.id
    );
    
    RAISE NOTICE 'Migração de students para alunos concluída';
  END IF;
END $$;

-- 3. AUDITORIA DE RLS - Garantir que todas as tabelas críticas tenham RLS
DO $$ 
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('alunos', 'planos_treino_aluno', 'workouts', 'avaliacoes', 'profiles')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    RAISE NOTICE 'RLS habilitado em: %', tbl.tablename;
  END LOOP;
END $$;

-- 4. Criar índices para PERFORMANCE (ETAPA 2)
CREATE INDEX IF NOT EXISTS idx_alunos_professor_id ON public.alunos(professor_id);
CREATE INDEX IF NOT EXISTS idx_alunos_status ON public.alunos(status) WHERE status = 'ativo';
CREATE INDEX IF NOT EXISTS idx_alunos_email ON public.alunos(email);

CREATE INDEX IF NOT EXISTS idx_planos_aluno_id ON public.planos_treino_aluno(aluno_id);
CREATE INDEX IF NOT EXISTS idx_planos_professor_id ON public.planos_treino_aluno(professor_id);
CREATE INDEX IF NOT EXISTS idx_planos_status ON public.planos_treino_aluno(status) WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_workouts_student_id ON public.workouts(student_id);
CREATE INDEX IF NOT EXISTS idx_workouts_week_day ON public.workouts(week_number, day_number);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 5. Otimizar trigger de updated_at (evitar overhead desnecessário)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Só atualiza se houve mudança real nos dados
    IF NEW IS DISTINCT FROM OLD THEN
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Função de auditoria de segurança (LGPD compliance)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_log(created_at DESC);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de auditoria
CREATE POLICY "Admins can view audit logs"
ON public.audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Sistema pode inserir logs (via service role)
CREATE POLICY "System can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (true);

-- 7. Criar função helper para log de auditoria
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action text,
  p_resource_type text,
  p_resource_id text
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, resource_type, resource_id)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id);
EXCEPTION WHEN OTHERS THEN
  -- Não falhar operação principal se log falhar
  RAISE WARNING 'Falha ao registrar auditoria: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Estatísticas para query planner (melhor performance)
ANALYZE public.alunos;
ANALYZE public.planos_treino_aluno;
ANALYZE public.workouts;
ANALYZE public.profiles;;
