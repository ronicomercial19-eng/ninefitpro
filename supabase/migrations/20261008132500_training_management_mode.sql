-- Coach linkage is mandatory in the existing schema. Keep it intact while
-- recording who controls training decisions for this athlete.
ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS training_management_mode text NOT NULL DEFAULT 'professional'
  CHECK (training_management_mode IN ('professional', 'self'));

CREATE OR REPLACE FUNCTION public.fn_set_training_management_mode(
  p_athlete_id uuid, p_mode text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_mode NOT IN ('professional', 'self') THEN
    RAISE EXCEPTION 'invalid_training_management_mode' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = p_athlete_id AND (
      a.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.athlete_auth_link l
        WHERE l.athlete_id = a.id AND l.user_id = auth.uid()
      )
    )
  ) THEN
    RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.athletes SET training_management_mode = p_mode WHERE id = p_athlete_id;
  RETURN p_mode;
END $$;

REVOKE ALL ON FUNCTION public.fn_set_training_management_mode(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_set_training_management_mode(uuid,text) TO authenticated;
