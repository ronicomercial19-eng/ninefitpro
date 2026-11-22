
-- Enum for dominant/secondary profiles
CREATE TYPE public.athlete_profile_type AS ENUM (
  'forca_mmss', 'forca_mmii', 'resistencia_mmss', 'resistencia_mmii',
  'core_estabilidade', 'mobilidade', 'potencia', 'cardio', 'equilibrado'
);

-- Smart Treino Profiles
CREATE TABLE public.smart_treino_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES auth.users(id),
  dominant_profile athlete_profile_type NOT NULL DEFAULT 'equilibrado',
  secondary_profile athlete_profile_type,
  score_global NUMERIC(5,2) DEFAULT 0,
  gargalos_tecnicos TEXT[] DEFAULT '{}',
  riscos_estruturais TEXT[] DEFAULT '{}',
  modalidade_principal VARCHAR(100) DEFAULT 'geral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(aluno_id)
);

ALTER TABLE public.smart_treino_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors manage own profiles" ON public.smart_treino_profiles
  FOR ALL USING (professor_id = auth.uid())
  WITH CHECK (professor_id = auth.uid());

-- Smart Treino Macro Rules
CREATE TABLE public.smart_treino_macro_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES auth.users(id),
  macro_number INT NOT NULL CHECK (macro_number BETWEEN 1 AND 4),
  macro_objetivo TEXT NOT NULL DEFAULT 'Base técnica',
  reps_range VARCHAR(20) NOT NULL DEFAULT '8-12',
  rpe_target NUMERIC(3,1) NOT NULL DEFAULT 6.0,
  progression_type VARCHAR(50) NOT NULL DEFAULT 'technique_first',
  density_control BOOLEAN NOT NULL DEFAULT true,
  volume_locked BOOLEAN NOT NULL DEFAULT true,
  deload_planned BOOLEAN NOT NULL DEFAULT true,
  descanso_compostos VARCHAR(20) DEFAULT '75-90s',
  descanso_acessorios VARCHAR(20) DEFAULT '60s',
  descanso_core VARCHAR(20) DEFAULT '45-60s',
  carga_inicial_percent NUMERIC(5,2) DEFAULT 60.0,
  weekly_frequency INT NOT NULL DEFAULT 4 CHECK (weekly_frequency BETWEEN 2 AND 6),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_treino_macro_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors manage own macro rules" ON public.smart_treino_macro_rules
  FOR ALL USING (professor_id = auth.uid())
  WITH CHECK (professor_id = auth.uid());

-- Smart Treino Muscle Volume
CREATE TABLE public.smart_treino_muscle_volume (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  macro_rules_id UUID NOT NULL REFERENCES public.smart_treino_macro_rules(id) ON DELETE CASCADE,
  muscle_group VARCHAR(50) NOT NULL,
  weekly_sets INT NOT NULL DEFAULT 22 CHECK (weekly_sets BETWEEN 10 AND 40),
  is_emphasis BOOLEAN NOT NULL DEFAULT false,
  distribution_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.smart_treino_muscle_volume ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors manage muscle volume via macro rules" ON public.smart_treino_muscle_volume
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.smart_treino_macro_rules mr 
      WHERE mr.id = macro_rules_id AND mr.professor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.smart_treino_macro_rules mr 
      WHERE mr.id = macro_rules_id AND mr.professor_id = auth.uid()
    )
  );

-- Update triggers
CREATE TRIGGER update_smart_treino_profiles_updated_at
  BEFORE UPDATE ON public.smart_treino_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_treino_macro_rules_updated_at
  BEFORE UPDATE ON public.smart_treino_macro_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
;
