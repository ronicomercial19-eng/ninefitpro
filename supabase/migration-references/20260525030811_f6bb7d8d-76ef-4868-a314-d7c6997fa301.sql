
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_access_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.athletes
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

ALTER TABLE public.student_library_assignments
  ADD COLUMN IF NOT EXISTS weekly_schedule jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_athletes_onboarding_completed_at
  ON public.athletes (onboarding_completed_at);

-- Marca usuários existentes que já trocaram senha como tendo concluído o first-access,
-- evitando que coaches/admins fiquem presos no fluxo.
UPDATE public.profiles p
  SET first_access_completed = true
  WHERE first_access_completed = false
    AND NOT EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.user_id = p.user_id
        AND a.password_changed = false
        AND a.auto_password_temp IS NOT NULL
    );

CREATE OR REPLACE FUNCTION public.complete_first_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.profiles
    SET first_access_completed = true,
        updated_at = now()
    WHERE user_id = v_uid;

  UPDATE public.athletes
    SET password_changed = true,
        auto_password_temp = NULL,
        updated_at = now()
    WHERE user_id = v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_onboarding(p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.athletes
    SET onboarding_completed_at = now(),
        updated_at = now()
    WHERE user_id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_first_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(jsonb) TO authenticated;
