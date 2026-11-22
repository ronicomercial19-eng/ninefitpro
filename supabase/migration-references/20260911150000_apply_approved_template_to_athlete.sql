-- Apply an approved reusable template to an athlete without exposing raw HTML
-- or allowing students to self-assign protocols.

CREATE OR REPLACE FUNCTION public.fn_apply_template_to_athlete(
  p_template_id uuid,
  p_athlete_id uuid,
  p_variables jsonb DEFAULT '{}'::jsonb,
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_template public.ninefit_template_library%ROWTYPE;
  v_assignment_id uuid;
  v_actor uuid := (SELECT auth.uid());
BEGIN
  IF v_actor IS NULL OR NOT (public.is_admin(v_actor) OR public.is_trainer(v_actor)) THEN
    RAISE EXCEPTION 'template_apply_forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_template
  FROM public.ninefit_template_library
  WHERE id = p_template_id AND status = 'approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'template_not_approved' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.athletes WHERE id = p_athlete_id) THEN
    RAISE EXCEPTION 'athlete_not_found' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.student_training_assignments
    (student_id, training_name, training_data, start_date, end_date, is_active,
     created_by, training_type, training_description, content_type, periodization_html)
  VALUES
    (p_athlete_id,
     v_template.name,
     jsonb_build_object(
       'template_id', v_template.id,
       'template_slug', v_template.slug,
       'variables', COALESCE(p_variables, '{}'::jsonb),
       'design_tokens', v_template.design_tokens,
       'prescription', v_template.prescription_schema,
       'protocol', v_template.protocol_schema,
       'required_variables', v_template.required_variables
     ),
     COALESCE(p_start_date, CURRENT_DATE), p_end_date, true,
     v_actor, 'template', v_template.metadata->>'description',
     v_template.template_type, v_template.source_html)
  RETURNING id INTO v_assignment_id;

  UPDATE public.ninefit_template_library
  SET metadata = jsonb_set(
        jsonb_set(COALESCE(metadata, '{}'::jsonb), '{usage_count}',
          to_jsonb(COALESCE((metadata->>'usage_count')::integer, 0) + 1), true),
        '{last_applied_at}', to_jsonb(now()), true),
      updated_at = now()
  WHERE id = v_template.id;

  RETURN v_assignment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_apply_template_to_athlete(uuid, uuid, jsonb, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_apply_template_to_athlete(uuid, uuid, jsonb, date, date) TO authenticated;

COMMENT ON FUNCTION public.fn_apply_template_to_athlete(uuid, uuid, jsonb, date, date) IS
  'Applies only approved NineFit templates to an athlete; restricted to admin/trainer actors.';

