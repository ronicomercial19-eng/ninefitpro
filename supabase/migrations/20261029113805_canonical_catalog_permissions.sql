DROP POLICY "Authenticated users manage exercises" ON public.exercises;
DROP POLICY "Only authenticated users can manage exercises" ON public.exercises;
DROP POLICY "Staff write exercises" ON public.exercises;
CREATE POLICY exercises_canonical_staff_write ON public.exercises FOR ALL TO authenticated
 USING(NOT coalesce((SELECT(auth.jwt()->>'is_anonymous')::boolean),false) AND (SELECT private.fitpro_actor_role()) IN('professor','trainer','admin','super_admin'))
 WITH CHECK(NOT coalesce((SELECT(auth.jwt()->>'is_anonymous')::boolean),false) AND (SELECT private.fitpro_actor_role()) IN('professor','trainer','admin','super_admin'));
DROP POLICY "Authenticated users can manage workout models" ON public.workout_models;
DROP POLICY "Staff manage workout models" ON public.workout_models;
CREATE POLICY workout_models_canonical_staff_write ON public.workout_models FOR ALL TO authenticated
 USING(NOT coalesce((SELECT(auth.jwt()->>'is_anonymous')::boolean),false) AND (SELECT private.fitpro_actor_role()) IN('professor','trainer','admin','super_admin'))
 WITH CHECK(NOT coalesce((SELECT(auth.jwt()->>'is_anonymous')::boolean),false) AND (SELECT private.fitpro_actor_role()) IN('professor','trainer','admin','super_admin'));
CREATE OR REPLACE FUNCTION public.fn_assert_athlete_owner(p_athlete_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR NOT EXISTS(
  SELECT 1 FROM public.athletes a WHERE a.id=p_athlete_id AND (a.user_id=auth.uid() OR (a.user_id IS NULL AND EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=a.id AND l.user_id=auth.uid())))
 ) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
END $$;
CREATE OR REPLACE FUNCTION public.fn_assert_athlete_access(p_athlete_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR NOT(
  EXISTS(SELECT 1 FROM public.athletes a WHERE a.id=p_athlete_id AND (a.user_id=auth.uid() OR (a.user_id IS NULL AND EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=a.id AND l.user_id=auth.uid()))))
  OR private.fitpro_can_manage_athlete(p_athlete_id)
 ) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
END $$;
ALTER FUNCTION public.fn_rm_plausible(text,numeric,numeric,text) SET search_path='';
NOTIFY pgrst,'reload schema';
