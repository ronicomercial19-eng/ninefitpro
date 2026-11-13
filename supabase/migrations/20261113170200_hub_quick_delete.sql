GRANT DELETE ON public.master_registry TO authenticated;
CREATE POLICY master_registry_delete_own_hub_quick
ON public.master_registry FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()) AND source = 'fitpro_hub_quick'
  AND payload->>'athlete_id' = public.fn_current_athlete_id()::text);
