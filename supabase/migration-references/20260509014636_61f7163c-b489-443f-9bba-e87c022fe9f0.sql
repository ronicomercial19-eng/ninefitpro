-- Catálogo unificado da Biblioteca 9FIT
CREATE TABLE IF NOT EXISTS public.library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  type text NOT NULL,
  slug text,
  name text NOT NULL,
  category text,
  subcategory text,
  thumbnail_url text,
  player_url text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_library_items_type ON public.library_items(type);
CREATE INDEX IF NOT EXISTS idx_library_items_category ON public.library_items(category);
CREATE INDEX IF NOT EXISTS idx_library_items_slug ON public.library_items(slug);

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Library readable by authenticated"
ON public.library_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Trainers manage library"
ON public.library_items FOR ALL
TO authenticated
USING (public.is_trainer((select auth.uid())))
WITH CHECK (public.is_trainer((select auth.uid())));

-- Atribuições de qualquer conteúdo da biblioteca a alunos
CREATE TABLE IF NOT EXISTS public.student_library_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_ref text NOT NULL,
  content_title text,
  access_url text,
  player_url text,
  download_url text,
  thumbnail_url text,
  notes text,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(athlete_id, content_type, content_ref)
);

CREATE INDEX IF NOT EXISTS idx_sla_athlete ON public.student_library_assignments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_sla_type ON public.student_library_assignments(content_type);

ALTER TABLE public.student_library_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes see own library assignments"
ON public.student_library_assignments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = student_library_assignments.athlete_id
      AND (a.user_id = (select auth.uid()) OR a.email = public.current_user_email())
  )
  OR public.is_trainer((select auth.uid()))
);

CREATE POLICY "Trainers manage library assignments"
ON public.student_library_assignments FOR ALL
TO authenticated
USING (public.is_trainer((select auth.uid())))
WITH CHECK (public.is_trainer((select auth.uid())));

-- Trigger updated_at
CREATE TRIGGER update_library_items_updated_at
BEFORE UPDATE ON public.library_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();