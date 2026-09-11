-- Review workflow: trainers edit drafts; only admins can approve/archive.
CREATE OR REPLACE FUNCTION public.fn_review_ninefit_template(
  p_template_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
BEGIN
  IF v_actor IS NULL OR NOT (public.is_admin(v_actor) OR public.is_trainer(v_actor)) THEN
    RAISE EXCEPTION 'template_review_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('draft', 'approved', 'archived') THEN
    RAISE EXCEPTION 'invalid_template_status' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'approved' AND NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'only_admin_can_approve_template' USING ERRCODE = '42501';
  END IF;
  UPDATE public.ninefit_template_library
  SET status = p_status, updated_at = now(),
      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{reviewed_by}', to_jsonb(v_actor::text), true)
  WHERE id = p_template_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_review_ninefit_template(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_review_ninefit_template(uuid,text) TO authenticated;

