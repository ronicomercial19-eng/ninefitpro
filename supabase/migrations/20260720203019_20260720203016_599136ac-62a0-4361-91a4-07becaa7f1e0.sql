
CREATE OR REPLACE FUNCTION public.fn_complete_mission(p_athlete_id uuid, p_mission_type text DEFAULT 'default'::text)
RETURNS TABLE(missions_completed integer, weekly_count integer, consistency_score integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_days INT;
BEGIN
  INSERT INTO public.athlete_activation (athlete_id, activation_started_at)
  VALUES (p_athlete_id, now())
  ON CONFLICT (athlete_id) DO NOTHING;

  SELECT COALESCE(consistency_days, 0) INTO v_days
  FROM public.athlete_activation WHERE athlete_id = p_athlete_id;

  RETURN QUERY SELECT 1, v_days, LEAST(100, v_days * 10);
END; $$;
;
