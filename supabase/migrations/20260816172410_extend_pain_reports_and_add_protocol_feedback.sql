
-- Extensão de pain_reports com vocabulário da library-api e triagem de bandeira vermelha
ALTER TABLE public.pain_reports
  ADD COLUMN IF NOT EXISTS symptom_slug text,
  ADD COLUMN IF NOT EXISTS red_flags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_red_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending','routed','blocked','resolved')),
  ADD COLUMN IF NOT EXISTS routed_content jsonb;

COMMENT ON COLUMN public.pain_reports.symptom_slug IS 'slug do vocabulário /library-api/symptoms (ex: dor-lombar)';
COMMENT ON COLUMN public.pain_reports.red_flags IS 'array de flags positivas na triagem (dor_subita_intensa, perda_de_forca, dor_pos_trauma, febre_associada)';
COMMENT ON COLUMN public.pain_reports.routed_content IS 'bloco assignable retornado pela library-api quando roteado';

-- Trigger: bloqueia automaticamente quando bate bandeira vermelha
CREATE OR REPLACE FUNCTION public.fn_check_red_flags()
RETURNS trigger AS $$
BEGIN
  IF (new.red_flags @> '["dor_subita_intensa"]'
      OR new.red_flags @> '["perda_de_forca"]'
      OR new.red_flags @> '["dor_pos_trauma"]'
      OR new.red_flags @> '["febre_associada"]') THEN
    new.is_red_flag := true;
    new.status := 'blocked';
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_red_flags ON public.pain_reports;
CREATE TRIGGER trg_check_red_flags
  BEFORE INSERT OR UPDATE ON public.pain_reports
  FOR EACH ROW EXECUTE FUNCTION public.fn_check_red_flags();

-- Nova tabela: feedback de eficácia do protocolo
CREATE TABLE IF NOT EXISTS public.protocol_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pain_report_id uuid REFERENCES public.pain_reports(id),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id),
  content_ref text NOT NULL,
  outcome text CHECK (outcome IN ('melhorou','sem_mudanca','piorou')),
  notes text,
  reported_at timestamptz DEFAULT now()
);

ALTER TABLE public.protocol_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY athlete_own ON public.protocol_feedback
  FOR ALL
  USING (athlete_id IN (SELECT athletes.id FROM public.athletes WHERE athletes.user_id = auth.uid()));

CREATE POLICY coach_view ON public.protocol_feedback
  FOR SELECT
  USING (athlete_id IN (SELECT athletes.id FROM public.athletes WHERE athletes.coach_id = auth.uid()));
;
