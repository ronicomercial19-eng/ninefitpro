
CREATE TABLE public.periodization_annual_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  assessment_snapshot jsonb DEFAULT '{}'::jsonb,
  scores jsonb DEFAULT '{}'::jsonb,
  flags jsonb DEFAULT '[]'::jsonb,
  dominant_profile jsonb DEFAULT '{}'::jsonb,
  annual_goal text,
  running_distance text,
  selected_model_id text,
  master_rules jsonb DEFAULT '{}'::jsonb,
  macrocycles jsonb DEFAULT '[]'::jsonb,
  mesocycles jsonb DEFAULT '[]'::jsonb,
  micro_rules jsonb DEFAULT '{}'::jsonb,
  output_json jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.periodization_annual_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own plans"
  ON public.periodization_annual_plans
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Athletes can view their own plans"
  ON public.periodization_annual_plans
  FOR SELECT
  TO authenticated
  USING (
    athlete_id IN (
      SELECT id FROM public.athletes WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER update_annual_plans_updated_at
  BEFORE UPDATE ON public.periodization_annual_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
;
