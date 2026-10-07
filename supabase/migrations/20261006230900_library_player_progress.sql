-- Player da biblioteca dentro do FitPro: guarda onde o aluno parou, tempo assistido e conclui automaticamente em >= 90%.
ALTER TABLE public.student_library_assignments
  ADD COLUMN IF NOT EXISTS last_position_sec integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_sec integer,
  ADD COLUMN IF NOT EXISTS watch_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_watched_at timestamptz;

CREATE OR REPLACE FUNCTION public.fn_library_progress(
  p_assignment_id uuid,
  p_position_sec integer,
  p_duration_sec integer DEFAULT NULL,
  p_watched_delta_sec integer DEFAULT 0
) RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_a public.student_library_assignments%ROWTYPE;
  v_pos integer;
  v_dur integer;
  v_pct numeric;
  v_done boolean := false;
BEGIN
  SELECT * INTO v_a FROM public.student_library_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'assignment_not_found'; END IF;
  PERFORM public.fn_sheet_assert(v_a.athlete_id);  -- mesma regra de posse (aluno, vínculo ou coach)

  v_pos := greatest(0, least(coalesce(p_position_sec, 0), 86400));
  v_dur := CASE WHEN p_duration_sec IS NOT NULL AND p_duration_sec > 0 THEN least(p_duration_sec, 86400) ELSE v_a.duration_sec END;
  v_pct := CASE WHEN v_dur IS NOT NULL AND v_dur > 0 THEN least(100, round(v_pos * 100.0 / v_dur)) ELSE coalesce(v_a.progress_pct, 0) END;
  v_pct := greatest(coalesce(v_a.progress_pct, 0), v_pct);

  UPDATE public.student_library_assignments SET
    last_position_sec = v_pos,
    duration_sec = v_dur,
    watch_seconds = watch_seconds + greatest(0, least(coalesce(p_watched_delta_sec, 0), 60)),  -- teto por chamada
    last_watched_at = now(),
    progress_pct = CASE WHEN completed_at IS NOT NULL THEN 100 ELSE v_pct END,
    status = CASE WHEN completed_at IS NULL AND v_pct > 0 AND coalesce(status, 'assigned') IN ('assigned', 'pending', 'new') THEN 'in_progress' ELSE status END
  WHERE id = p_assignment_id;

  IF v_a.completed_at IS NULL AND v_pct >= 90 THEN
    UPDATE public.student_library_assignments SET completed_at = now(), status = 'completed', progress_pct = 100 WHERE id = p_assignment_id;
    v_done := true;
    BEGIN
      INSERT INTO public.master_registry (user_id, event_type, source, payload)
      SELECT a.user_id, 'protocol_completed', 'library', jsonb_build_object('assignment_id', p_assignment_id, 'title', v_a.content_title, 'auto', true)
      FROM public.athletes a WHERE a.id = v_a.athlete_id AND a.user_id IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object('progress_pct', CASE WHEN v_done THEN 100 ELSE v_pct END, 'completed', v_done OR v_a.completed_at IS NOT NULL, 'position_sec', v_pos);
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_library_progress(uuid, integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_library_progress(uuid, integer, integer, integer) TO authenticated;
