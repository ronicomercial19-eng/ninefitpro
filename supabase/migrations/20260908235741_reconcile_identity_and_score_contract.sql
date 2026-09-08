-- Stage 2/12: reconcile authenticated athlete identity and legacy score RPCs.
-- This migration is additive/reversible at the data level: no rows are deleted.

CREATE OR REPLACE FUNCTION public.fn_current_athlete_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id
  FROM public.athletes a
  WHERE a.user_id = (SELECT auth.uid())
     OR EXISTS (
       SELECT 1
       FROM public.athlete_auth_link aal
       WHERE aal.user_id = (SELECT auth.uid())
         AND aal.athlete_id = a.id
     )
  ORDER BY CASE WHEN a.user_id = (SELECT auth.uid()) THEN 0 ELSE 1 END,
           a.created_at DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.fn_current_athlete_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_current_athlete_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_current_athlete_id() TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_current_athlete_id() IS
  'Canonical auth.uid() to athlete resolver. Never uses email as authorization.';

-- The July trigger wrote athlete_id into sync_score_logs even though that table
-- requires user_id and score, then swallowed the error. Base-table Realtime and
-- the canonical Hub snapshot replace this fake notification mechanism.
DROP TRIGGER IF EXISTS trg_sync_score_from_workout ON public.workout_executions;
DROP TRIGGER IF EXISTS trg_sync_score_from_checkin ON public.ninefit_checkins;
DROP FUNCTION IF EXISTS public.fn_log_sync_score_event();

-- Compatibility facade for any client that has not yet migrated to
-- fn_get_hub_snapshot. It only permits the caller's canonical athlete.
CREATE OR REPLACE FUNCTION public.get_athlete_scores(p_athlete_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_snapshot jsonb;
BEGIN
  IF p_athlete_id IS DISTINCT FROM public.fn_current_athlete_id() THEN
    RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE = '42501';
  END IF;

  v_snapshot := public.fn_get_hub_snapshot();
  RETURN jsonb_build_object(
    'sync_score', v_snapshot #> '{sync,value}',
    'treino', v_snapshot #> '{dimensions,treino,value}',
    'nutri', v_snapshot #> '{dimensions,nutri,value}',
    'sono', v_snapshot #> '{dimensions,sono,value}',
    'mob', v_snapshot #> '{dimensions,mob,value}',
    'hidr', v_snapshot #> '{dimensions,hidr,value}',
    'updated_at', v_snapshot #> '{sync,observed_at}',
    'deprecated', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_athlete_scores(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_athlete_scores(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_athlete_scores(uuid) TO authenticated, service_role;

-- The generated client types referenced this alternate name. Keep it as a
-- restricted compatibility alias so schema, migrations and clients converge.
CREATE OR REPLACE FUNCTION public.fn_get_athlete_scores(p_athlete_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.get_athlete_scores(p_athlete_id)
$$;

REVOKE ALL ON FUNCTION public.fn_get_athlete_scores(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_get_athlete_scores(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_athlete_scores(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_athlete_scores(uuid) IS
  'Deprecated compatibility facade. Use fn_get_hub_snapshot().';
COMMENT ON FUNCTION public.fn_get_athlete_scores(uuid) IS
  'Deprecated compatibility alias. Use fn_get_hub_snapshot().';

