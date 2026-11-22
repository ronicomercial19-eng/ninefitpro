CREATE OR REPLACE FUNCTION public.fn_hub_confirm_meal(p_id uuid, p_plan uuid, p_date date, p_name text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_athlete uuid := public.fn_current_athlete_id();
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF v_user IS NULL OR v_athlete IS NULL OR coalesce(auth.jwt()->>'is_anonymous','false') = 'true' THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF p_date IS DISTINCT FROM v_today OR NOT EXISTS (
    SELECT 1 FROM public.vw_fitpro_diet_context d
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(d.diet_data::jsonb->'meals') = 'array'
        THEN d.diet_data::jsonb->'meals' ELSE '[]'::jsonb END
    ) meal
    WHERE d.athlete_id = v_athlete AND d.diet_assignment_id = p_plan
      AND d.is_active AND d.start_date <= v_today AND (d.end_date IS NULL OR d.end_date >= v_today)
      AND meal->>'name' = p_name
  ) THEN
    RAISE EXCEPTION 'meal_not_in_active_plan' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.master_registry(id,user_id,event_type,source,payload)
  VALUES(p_id,v_user,'hub_quick_record','fitpro_hub_quick',
    jsonb_build_object('category','Nutrição','date',v_today,'label',p_name,
      'athlete_id',v_athlete,'plan_id',p_plan,'self_reported',true))
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_hub_confirm_meal(uuid,uuid,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_hub_confirm_meal(uuid,uuid,date,text) TO authenticated;
