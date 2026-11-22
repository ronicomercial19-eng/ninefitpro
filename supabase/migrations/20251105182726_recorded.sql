-- Sprint 1: Sistema de Convites para Alunos
-- Tabela de convites com tokens únicos
CREATE TABLE IF NOT EXISTS public.student_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token TEXT NOT NULL UNIQUE,
  nome_aluno VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- Índices para performance
CREATE INDEX idx_student_invitations_token ON public.student_invitations(token);
CREATE INDEX idx_student_invitations_email ON public.student_invitations(email);
CREATE INDEX idx_student_invitations_professor ON public.student_invitations(professor_id);

-- RLS policies
ALTER TABLE public.student_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professores podem criar convites"
ON public.student_invitations
FOR INSERT
TO authenticated
WITH CHECK (professor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Professores podem ver seus convites"
ON public.student_invitations
FOR SELECT
TO authenticated
USING (professor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Sistema pode atualizar convites"
ON public.student_invitations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Sprint 2: Sistema de Auditoria
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Função para registrar auditoria
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, resource_type, resource_id)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id);
EXCEPTION WHEN OTHERS THEN
  -- Não falhar operação principal se log falhar
  RAISE WARNING 'Falha ao registrar auditoria: %', SQLERRM;
END;
$$;

-- Trigger para auditoria automática em alunos
CREATE OR REPLACE FUNCTION public.audit_alunos_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (
      user_id, action, resource_type, resource_id, old_data, new_data
    ) VALUES (
      auth.uid(),
      'UPDATE',
      'alunos',
      OLD.id::text,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (
      user_id, action, resource_type, resource_id, old_data
    ) VALUES (
      auth.uid(),
      'DELETE',
      'alunos',
      OLD.id::text,
      to_jsonb(OLD)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_alunos_trigger
AFTER UPDATE OR DELETE ON public.alunos
FOR EACH ROW EXECUTE FUNCTION public.audit_alunos_changes();

-- Sprint 3: Sistema de Progressão de Cargas
CREATE TABLE IF NOT EXISTS public.workout_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg NUMERIC(6,2),
  rpe INTEGER CHECK (rpe BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_workout_progress_aluno ON public.workout_progress(aluno_id);
CREATE INDEX idx_workout_progress_date ON public.workout_progress(date DESC);

ALTER TABLE public.workout_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alunos veem seu próprio progresso"
ON public.workout_progress
FOR SELECT
TO authenticated
USING (
  aluno_id IN (
    SELECT id FROM public.alunos WHERE email = current_user_email()
  ) OR 
  aluno_id IN (
    SELECT id FROM public.alunos WHERE professor_id = auth.uid()
  ) OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Sistema pode inserir progresso"
ON public.workout_progress
FOR INSERT
TO authenticated
WITH CHECK (
  aluno_id IN (
    SELECT id FROM public.alunos WHERE email = current_user_email()
  ) OR 
  aluno_id IN (
    SELECT id FROM public.alunos WHERE professor_id = auth.uid()
  ) OR 
  has_role(auth.uid(), 'admin')
);

-- Função para gerar token único de convite
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'base64');
  token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');
  RETURN token;
END;
$$;;
