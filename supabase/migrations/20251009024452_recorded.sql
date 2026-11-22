-- Fase 3 e 4: Tabelas para salvamento e edição de periodizações

-- Tabela de periodizações salvas
CREATE TABLE IF NOT EXISTS public.saved_periodizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  periodization_model_id TEXT NOT NULL,
  athlete_id UUID REFERENCES public.alunos(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  customizations JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de histórico de alterações
CREATE TABLE IF NOT EXISTS public.periodization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_periodization_id UUID REFERENCES public.saved_periodizations(id) ON DELETE CASCADE NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changes JSONB NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'archived', 'restored')),
  change_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.saved_periodizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodization_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para saved_periodizations
CREATE POLICY "Users can view their own saved periodizations"
  ON public.saved_periodizations
  FOR SELECT
  USING (
    user_profile_id IN (
      SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
    )
    OR
    (athlete_id IN (
      SELECT id FROM public.alunos WHERE professor_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create their own saved periodizations"
  ON public.saved_periodizations
  FOR INSERT
  WITH CHECK (
    user_profile_id IN (
      SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
    )
    OR
    (athlete_id IN (
      SELECT id FROM public.alunos WHERE professor_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update their own saved periodizations"
  ON public.saved_periodizations
  FOR UPDATE
  USING (
    user_profile_id IN (
      SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
    )
    OR
    (athlete_id IN (
      SELECT id FROM public.alunos WHERE professor_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete their own saved periodizations"
  ON public.saved_periodizations
  FOR DELETE
  USING (
    user_profile_id IN (
      SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
    )
    OR
    (athlete_id IN (
      SELECT id FROM public.alunos WHERE professor_id = auth.uid()
    ))
  );

-- Políticas RLS para periodization_history
CREATE POLICY "Users can view history of their saved periodizations"
  ON public.periodization_history
  FOR SELECT
  USING (
    saved_periodization_id IN (
      SELECT id FROM public.saved_periodizations 
      WHERE user_profile_id IN (
        SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
      )
      OR athlete_id IN (
        SELECT id FROM public.alunos WHERE professor_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can insert history records"
  ON public.periodization_history
  FOR INSERT
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_saved_periodizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_periodizations_updated_at
  BEFORE UPDATE ON public.saved_periodizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_saved_periodizations_updated_at();

-- Trigger para registrar mudanças no histórico
CREATE OR REPLACE FUNCTION public.log_periodization_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.periodization_history (
      saved_periodization_id,
      changed_by,
      changes,
      change_type,
      change_description
    ) VALUES (
      NEW.id,
      auth.uid(),
      jsonb_build_object(
        'plan_name', NEW.plan_name,
        'status', NEW.status,
        'customizations', NEW.customizations
      ),
      'created',
      'Periodização criada'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.periodization_history (
      saved_periodization_id,
      changed_by,
      changes,
      change_type,
      change_description
    ) VALUES (
      NEW.id,
      auth.uid(),
      jsonb_build_object(
        'old', jsonb_build_object(
          'plan_name', OLD.plan_name,
          'status', OLD.status,
          'customizations', OLD.customizations,
          'notes', OLD.notes
        ),
        'new', jsonb_build_object(
          'plan_name', NEW.plan_name,
          'status', NEW.status,
          'customizations', NEW.customizations,
          'notes', NEW.notes
        )
      ),
      'updated',
      CASE 
        WHEN OLD.status != NEW.status AND NEW.status = 'archived' THEN 'Periodização arquivada'
        WHEN OLD.status != NEW.status AND NEW.status = 'active' THEN 'Periodização restaurada'
        ELSE 'Periodização atualizada'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_periodization_changes_trigger
  AFTER INSERT OR UPDATE ON public.saved_periodizations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_periodization_changes();

-- Índices para performance
CREATE INDEX idx_saved_periodizations_user_profile ON public.saved_periodizations(user_profile_id);
CREATE INDEX idx_saved_periodizations_athlete ON public.saved_periodizations(athlete_id);
CREATE INDEX idx_saved_periodizations_status ON public.saved_periodizations(status);
CREATE INDEX idx_periodization_history_saved_id ON public.periodization_history(saved_periodization_id);
CREATE INDEX idx_periodization_history_changed_by ON public.periodization_history(changed_by);;
