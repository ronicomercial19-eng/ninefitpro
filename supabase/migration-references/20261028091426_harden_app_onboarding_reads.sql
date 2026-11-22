DROP POLICY onboarding_coach_read ON public.app_onboarding;
CREATE POLICY onboarding_coach_read ON public.app_onboarding FOR SELECT TO authenticated
USING(NOT coalesce((SELECT(auth.jwt()->>'is_anonymous')::boolean),false) AND private.fitpro_can_manage_athlete(athlete_id));
CREATE INDEX app_onboarding_athlete_id_idx ON public.app_onboarding(athlete_id);

-- Keep privileged writes outside exposed schemas. The public endpoint only
-- delegates, and the private implementation still validates the current user.
ALTER FUNCTION public.fn_save_app_onboarding(jsonb,integer,boolean) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.fn_save_app_onboarding(jsonb,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.fn_save_app_onboarding(jsonb,integer,boolean) TO authenticated;
CREATE FUNCTION public.fn_save_app_onboarding(p_patch jsonb,p_revision integer,p_complete boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.fn_save_app_onboarding(p_patch,p_revision,p_complete);
$$;
REVOKE ALL ON FUNCTION public.fn_save_app_onboarding(jsonb,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_save_app_onboarding(jsonb,integer,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
