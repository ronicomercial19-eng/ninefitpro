CREATE FUNCTION public.fn_professor_publish_reviewed_window(
  p_athlete_id uuid, p_start date, p_days integer, p_drafts jsonb, p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  receipt private.professor_delivery_receipts;
  draft public.student_workout_drafts;
  item jsonb;
  fingerprint text;
  result jsonb;
  session_count integer := 0;
BEGIN
  IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM false
    OR NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN
    RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE = '42501';
  END IF;
  IF p_request_id IS NULL OR p_start IS NULL OR p_days IS NULL
    OR p_days NOT IN (7, 30, 365) OR jsonb_typeof(p_drafts) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_drafts) NOT BETWEEN 1 AND p_days THEN
    RAISE EXCEPTION 'invalid_reviewed_window';
  END IF;
  fingerprint := md5(jsonb_build_array('reviewed_window', p_athlete_id, p_start, p_days, p_drafts)::text);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  SELECT * INTO receipt FROM private.professor_delivery_receipts WHERE request_id = p_request_id;
  IF FOUND THEN
    IF receipt.actor_id <> auth.uid() OR receipt.fingerprint <> fingerprint THEN
      RAISE EXCEPTION 'request_conflict';
    END IF;
    RETURN receipt.result;
  END IF;
  IF p_start < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'reviewed_window_in_past';
  END IF;
  IF (SELECT count(DISTINCT value->>'draft_id') FROM jsonb_array_elements(p_drafts)) <> jsonb_array_length(p_drafts) THEN
    RAISE EXCEPTION 'duplicate_draft';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_drafts) ORDER BY value->>'date' LOOP
    SELECT * INTO draft FROM public.student_workout_drafts
    WHERE id = (item->>'draft_id')::uuid AND author_id = auth.uid()
      AND athlete_id = p_athlete_id AND workout_date >= p_start AND workout_date < p_start + p_days
    FOR SHARE;
    IF NOT FOUND OR draft.updated_at IS DISTINCT FROM (item->>'updated_at')::timestamptz
      OR draft.workout_date IS DISTINCT FROM (item->>'date')::date THEN
      RAISE EXCEPTION 'draft_changed_reload' USING ERRCODE = '40001';
    END IF;
    PERFORM public.fn_professor_publish_workout(p_athlete_id, draft.workout_date, draft.title,
      draft.exercises, md5(p_request_id::text || draft.workout_date::text)::uuid, NULL);
    session_count := session_count + 1;
  END LOOP;
  result := jsonb_build_object('saved', true, 'sessions', session_count, 'athlete_id', p_athlete_id);
  INSERT INTO private.professor_delivery_receipts VALUES
    (p_request_id, auth.uid(), p_athlete_id, fingerprint, result, now());
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_professor_publish_reviewed_window(uuid,date,integer,jsonb,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_publish_reviewed_window(uuid,date,integer,jsonb,uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
