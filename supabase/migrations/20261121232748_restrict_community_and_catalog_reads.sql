-- Published community content remains shared; private instructor groups and activation targets do not.
ALTER POLICY "cp read all" ON public.community_posts TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false) AND (
 user_id=(SELECT auth.uid()) OR private.fitpro_actor_role() IN ('admin','super_admin')
 OR NOT EXISTS(SELECT 1 FROM public.feed_visibility v WHERE v.post_id=community_posts.id AND v.visibility::text<>'free')
 OR EXISTS(SELECT 1 FROM public.feed_visibility v WHERE v.post_id=community_posts.id AND v.visibility::text='instructor_only' AND private.fitpro_actor_role() IN ('professor','trainer'))
));
ALTER POLICY "cc read all" ON public.community_cheers TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false) AND EXISTS(SELECT 1 FROM public.community_posts p WHERE p.id=community_cheers.post_id));
ALTER POLICY "fv read" ON public.feed_visibility TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false));
ALTER POLICY "ig read" ON public.instructor_groups TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false) AND (
 private IS FALSE OR EXISTS(SELECT 1 FROM public.instructor_profiles p WHERE p.id=instructor_groups.instructor_id AND p.user_id=(SELECT auth.uid())) OR private.fitpro_actor_role() IN ('admin','super_admin')
));
ALTER POLICY "ip read" ON public.instructor_profiles TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false) AND (verified IS TRUE OR user_id=(SELECT auth.uid()) OR private.fitpro_actor_role() IN ('admin','super_admin')));
ALTER POLICY "activations readable" ON public.skill_activations TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false) AND (
 activated_by=(SELECT auth.uid()) OR target_id=(SELECT auth.uid()) OR private.fitpro_can_manage_athlete(target_id) OR private.fitpro_actor_role() IN ('admin','super_admin') OR (scope='global' AND active IS TRUE)
));
ALTER POLICY "Authenticated can view products" ON public.products TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false) AND (is_active IS TRUE OR created_by=(SELECT auth.uid()) OR private.fitpro_actor_role() IN ('admin','super_admin')));
ALTER POLICY "Everyone can view workout templates" ON public.workout_templates TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false));
ALTER POLICY readiness_zones_read ON public.injury_zone_contraindications TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false));
-- subscription_plans intentionally remains public: it only contains published prices and product features.

;
