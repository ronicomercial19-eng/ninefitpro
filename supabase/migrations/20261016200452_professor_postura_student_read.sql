DROP POLICY IF EXISTS fitpro_postura_read ON public.postura_scans;
CREATE POLICY fitpro_postura_read ON public.postura_scans FOR SELECT TO authenticated USING (
  user_id = (SELECT auth.uid())
  OR athlete_id = (SELECT public.fn_current_athlete_id())
  OR private.fitpro_can_manage_athlete(athlete_id)
  OR EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.user_id = postura_scans.user_id AND private.fitpro_can_manage_athlete(a.id)
  )
);;
