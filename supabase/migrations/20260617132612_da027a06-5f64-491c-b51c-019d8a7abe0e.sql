
DROP FUNCTION IF EXISTS public.aplicar_ajuste_treino_dia(uuid, date, jsonb);

ALTER TABLE public.daily_workouts
  ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.athletes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workout_date date,
  ADD COLUMN IF NOT EXISTS override_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS changes_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_daily_workouts_athlete_date
  ON public.daily_workouts(athlete_id, workout_date);

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.aplicar_ajuste_treino_dia(
  p_athlete_id uuid,
  p_data date,
  p_changes jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_result jsonb;
BEGIN
  IF p_athlete_id IS NULL OR p_data IS NULL THEN
    RAISE EXCEPTION 'athlete_id e data são obrigatórios';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.daily_workouts
  WHERE athlete_id = p_athlete_id AND workout_date = p_data
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.daily_workouts
    SET changes_json = COALESCE(changes_json, '{}'::jsonb) || COALESCE(p_changes, '{}'::jsonb),
        override_locked = true,
        updated_at = now()
    WHERE id = v_existing_id
    RETURNING jsonb_build_object('id', id, 'athlete_id', athlete_id, 'workout_date', workout_date,
                                  'override_locked', override_locked, 'changes_json', changes_json)
    INTO v_result;
  ELSE
    INSERT INTO public.daily_workouts (athlete_id, workout_date, changes_json, override_locked)
    VALUES (p_athlete_id, p_data, COALESCE(p_changes, '{}'::jsonb), true)
    RETURNING jsonb_build_object('id', id, 'athlete_id', athlete_id, 'workout_date', workout_date,
                                  'override_locked', override_locked, 'changes_json', changes_json)
    INTO v_result;
  END IF;

  BEGIN
    INSERT INTO public.system_events (event_type, entity_type, entity_id, actor_id, metadata)
    VALUES ('updated'::event_type, 'daily_workout_override', p_athlete_id, auth.uid(),
            jsonb_build_object('date', p_data, 'changes', p_changes));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aplicar_ajuste_treino_dia(uuid, date, jsonb) TO authenticated;

CREATE TABLE IF NOT EXISTS public.social_share_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  content_type text NOT NULL,
  layout_html text,
  layout_css text,
  accent_color text DEFAULT '#F05C1A',
  preview_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.social_share_templates TO authenticated, anon;
GRANT ALL ON public.social_share_templates TO service_role;
ALTER TABLE public.social_share_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_templates_read_all" ON public.social_share_templates;
CREATE POLICY "share_templates_read_all" ON public.social_share_templates
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "share_templates_admin_manage" ON public.social_share_templates;
CREATE POLICY "share_templates_admin_manage" ON public.social_share_templates
  FOR ALL USING (public.is_admin((select auth.uid())) OR public.is_professor((select auth.uid())))
  WITH CHECK (public.is_admin((select auth.uid())) OR public.is_professor((select auth.uid())));

INSERT INTO public.social_share_templates (slug, name, content_type, accent_color) VALUES
  ('workout_done',  'Treino Concluído',  'workout',     '#F05C1A'),
  ('new_pr',        'Novo Recorde (PR)', 'achievement', '#4DA3FF'),
  ('streak',        'Streak X dias',     'achievement', '#FFD166'),
  ('level_up',      'Subiu de Level',    'achievement', '#06D6A0'),
  ('check_in',      'Check-in do Dia',   'progress',    '#EF476F')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.monetization_offers (name, description, category, status, priority, metadata)
SELECT
  '9FIT Audience — R$49/mês',
  'Acesso inicial ao ecossistema 9FIT: hub, gamificação, protocolos básicos e comunidade.',
  'entry', 'active', 100,
  jsonb_build_object('price_cents', 4900, 'currency', 'BRL', 'recurrence', 'monthly', 'slug', 'audience_49', 'public', true)
WHERE NOT EXISTS (SELECT 1 FROM public.monetization_offers WHERE metadata->>'slug' = 'audience_49');
