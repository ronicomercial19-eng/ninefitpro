
-- Enum for report type
CREATE TYPE public.ninefit_report_tipo AS ENUM ('diagnostico', 'evolutivo', 'trimestral');

-- Enum for checkin type
CREATE TYPE public.ninefit_checkin_tipo AS ENUM ('semanal', 'mensal', 'trimestral');

-- Reports table
CREATE TABLE public.ninefit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL,
  tipo ninefit_report_tipo NOT NULL DEFAULT 'diagnostico',
  mes_ciclo TEXT,
  data_relatorio DATE NOT NULL DEFAULT CURRENT_DATE,
  objetivo TEXT,
  score_neuro NUMERIC(3,1) CHECK (score_neuro >= 0 AND score_neuro <= 10),
  score_integrated NUMERIC(3,1) CHECK (score_integrated >= 0 AND score_integrated <= 10),
  score_nutrition NUMERIC(3,1) CHECK (score_nutrition >= 0 AND score_nutrition <= 10),
  score_exercise NUMERIC(3,1) CHECK (score_exercise >= 0 AND score_exercise <= 10),
  score_total NUMERIC(4,1) GENERATED ALWAYS AS (
    COALESCE(score_neuro, 0) + COALESCE(score_integrated, 0) + COALESCE(score_nutrition, 0) + COALESCE(score_exercise, 0)
  ) STORED,
  resumo_executivo JSONB DEFAULT '{}',
  evidencias JSONB DEFAULT '[]',
  biomecanica JSONB DEFAULT '{}',
  plano_proximo_ciclo JSONB DEFAULT '{}',
  prescricao JSONB DEFAULT '{}',
  vitorias JSONB DEFAULT '[]',
  proxima_revisao DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  publicado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checkins table
CREATE TABLE public.ninefit_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL,
  tipo ninefit_checkin_tipo NOT NULL DEFAULT 'semanal',
  data_checkin DATE NOT NULL DEFAULT CURRENT_DATE,
  treinos_semana INTEGER CHECK (treinos_semana >= 0 AND treinos_semana <= 7),
  energia NUMERIC(3,1) CHECK (energia >= 0 AND energia <= 10),
  sono NUMERIC(3,1) CHECK (sono >= 0 AND sono <= 10),
  alimentacao NUMERIC(3,1) CHECK (alimentacao >= 0 AND alimentacao <= 10),
  dor NUMERIC(3,1) CHECK (dor >= 0 AND dor <= 10),
  dor_local TEXT,
  vitoria_mes TEXT,
  dificuldade_mes TEXT,
  medida_chave TEXT,
  fator_consistencia TEXT,
  fator_atrapalhou TEXT,
  meta_proximo_mes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ninefit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ninefit_checkins ENABLE ROW LEVEL SECURITY;

-- RLS for ninefit_reports
CREATE POLICY "Professors manage own reports"
  ON public.ninefit_reports FOR ALL
  TO authenticated
  USING (professor_id = auth.uid())
  WITH CHECK (professor_id = auth.uid());

CREATE POLICY "Admins manage all reports"
  ON public.ninefit_reports FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own published reports"
  ON public.ninefit_reports FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND aluno_id IN (
      SELECT al.id FROM public.athlete_auth_link aal
      JOIN public.athletes a ON a.id = aal.athlete_id
      JOIN public.alunos al ON al.email = a.email
      WHERE aal.user_id = auth.uid()
    )
  );

-- RLS for ninefit_checkins
CREATE POLICY "Professors manage own checkins"
  ON public.ninefit_checkins FOR ALL
  TO authenticated
  USING (professor_id = auth.uid())
  WITH CHECK (professor_id = auth.uid());

CREATE POLICY "Admins manage all checkins"
  ON public.ninefit_checkins FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students view own checkins"
  ON public.ninefit_checkins FOR SELECT
  TO authenticated
  USING (
    aluno_id IN (
      SELECT al.id FROM public.athlete_auth_link aal
      JOIN public.athletes a ON a.id = aal.athlete_id
      JOIN public.alunos al ON al.email = a.email
      WHERE aal.user_id = auth.uid()
    )
  );

-- Timestamp trigger for reports
CREATE TRIGGER update_ninefit_reports_updated_at
  BEFORE UPDATE ON public.ninefit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
;
