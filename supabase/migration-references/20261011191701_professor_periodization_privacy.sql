-- Complete linked access on periodization sources and posture records.
DO $$ DECLARE p record; t text; col text; BEGIN
  FOREACH t IN ARRAY ARRAY['athlete_periodizations','periodization_plans_remote','periodization_annual_plans','fitpro_smartperiodizer_periodizations','fitpro_smartperiodizer_waves'] LOOP
    col := CASE WHEN t LIKE 'fitpro_%' THEN 'fitpro_student_id' ELSE 'athlete_id' END;
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
    END LOOP;
    EXECUTE format('CREATE POLICY fitpro_linked_read ON public.%I FOR SELECT TO authenticated USING (private.fitpro_can_manage_athlete(%I) OR %I=public.fn_current_athlete_id())',t,col,col);
    EXECUTE format('CREATE POLICY fitpro_linked_manage ON public.%I FOR ALL TO authenticated USING (private.fitpro_can_manage_athlete(%I)) WITH CHECK (private.fitpro_can_manage_athlete(%I))',t,col,col);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
    EXECUTE format('REVOKE TRUNCATE,REFERENCES,TRIGGER ON public.%I FROM authenticated',t);
  END LOOP;
END $$;
ALTER VIEW public.vw_athlete_periodizacao_ativa SET (security_invoker=true);
REVOKE ALL ON public.vw_athlete_periodizacao_ativa FROM anon;

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='postura_scans' LOOP
    EXECUTE format('DROP POLICY %I ON public.postura_scans',p.policyname);
  END LOOP;
END $$;
CREATE POLICY fitpro_postura_read ON public.postura_scans FOR SELECT TO authenticated USING (
  user_id=(SELECT auth.uid()) OR private.fitpro_can_manage_athlete(athlete_id)
  OR EXISTS (SELECT 1 FROM public.athletes a WHERE a.user_id=postura_scans.user_id AND private.fitpro_can_manage_athlete(a.id))
);
CREATE POLICY fitpro_postura_insert ON public.postura_scans FOR INSERT TO authenticated WITH CHECK (
  user_id=(SELECT auth.uid()) AND status='pending' AND COALESCE(result,'{}'::jsonb)='{}'::jsonb
  AND (athlete_id IS NULL OR athlete_id=public.fn_current_athlete_id() OR private.fitpro_can_manage_athlete(athlete_id))
);
-- Results and processing status are written by the authorized analysis service.
REVOKE ALL ON public.postura_scans FROM anon;
REVOKE UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.postura_scans FROM authenticated;

-- Trigger functions are not client RPCs. Preserve trigger execution itself.
REVOKE ALL ON FUNCTION public.fn_appointments_before_delete(), public.fn_appointments_guard_and_track(),
  public.fn_appointments_log_event(), public.fn_notify_coach_workout_adjusted(), public.sync_community_cheer_count()
FROM PUBLIC, anon, authenticated;
