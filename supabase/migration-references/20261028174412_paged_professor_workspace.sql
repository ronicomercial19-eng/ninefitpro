SET LOCAL lock_timeout='2s';
CREATE FUNCTION private.fitpro_coach_students_page(p_offset integer DEFAULT 0,p_limit integer DEFAULT 50,p_search text DEFAULT '',p_filter text DEFAULT 'all',p_selected_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid();actor_role text:=private.fitpro_actor_role();term text:=left(btrim(coalesce(p_search,'')),200);result jsonb;
BEGIN
 IF actor IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM false OR coalesce(actor_role,'') NOT IN('admin','super_admin','professor','trainer') THEN RAISE EXCEPTION 'professional_required' USING ERRCODE='42501';END IF;
 IF p_filter NOT IN('all','active','blocked') OR p_filter IS NULL THEN RAISE EXCEPTION 'invalid_student_filter';END IF;
 WITH scope AS MATERIALIZED(SELECT a.id,a.name,a.user_id,a.activated,coalesce(a.email,a.metadata->>'email') email FROM public.athletes a WHERE a.is_test_account IS NOT TRUE AND(actor_role IN('admin','super_admin') OR a.coach_id=actor)),
 filtered AS(SELECT * FROM scope a WHERE(p_filter='all' OR(p_filter='active' AND coalesce(a.activated,false)) OR(p_filter='blocked' AND NOT coalesce(a.activated,false))) AND(term='' OR position(lower(term) IN lower(coalesce(a.name,'')||E'\n'||coalesce(a.email,'')))>0)),
 page AS(SELECT * FROM filtered ORDER BY name,id LIMIT least(greatest(coalesce(p_limit,50),1),100) OFFSET least(greatest(coalesce(p_offset,0),0),100000))
 SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'students',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'user_id',coalesce(a.user_id,(SELECT l.user_id FROM public.athlete_auth_link l WHERE l.athlete_id=a.id ORDER BY l.created_at LIMIT 1)),'goal',private.fitpro_athlete_goal(a.id)->>'value','active',coalesce(a.activated,false)) ORDER BY a.name,a.id) FROM page a),'[]'),
 'selected',(SELECT jsonb_build_object('id',a.id,'name',a.name,'user_id',coalesce(a.user_id,(SELECT l.user_id FROM public.athlete_auth_link l WHERE l.athlete_id=a.id ORDER BY l.created_at LIMIT 1)),'goal',private.fitpro_athlete_goal(a.id)->>'value','active',coalesce(a.activated,false)) FROM scope a WHERE a.id=p_selected_id)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_coach_students_page(integer,integer,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.fitpro_coach_students_page(integer,integer,text,text,uuid) TO authenticated;
CREATE FUNCTION public.fn_coach_students_page(p_offset integer DEFAULT 0,p_limit integer DEFAULT 50,p_search text DEFAULT '',p_filter text DEFAULT 'all',p_selected_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT private.fitpro_coach_students_page(p_offset,p_limit,p_search,p_filter,p_selected_id)$$;
REVOKE ALL ON FUNCTION public.fn_coach_students_page(integer,integer,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_coach_students_page(integer,integer,text,text,uuid) TO authenticated;

-- Calendar scope is resolved in SQL, never a URL containing the entire roster.
CREATE FUNCTION private.fitpro_coach_agenda(p_month date,p_athlete_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid();actor_role text:=private.fitpro_actor_role();starts timestamptz;ends timestamptz;result jsonb;
BEGIN
 IF actor IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM false OR coalesce(actor_role,'') NOT IN('admin','super_admin','professor','trainer') THEN RAISE EXCEPTION 'professional_required' USING ERRCODE='42501';END IF;
 IF p_month IS NULL THEN RAISE EXCEPTION 'month_required';END IF;
 IF p_athlete_id IS NOT NULL AND NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 starts:=date_trunc('month',p_month::timestamp) AT TIME ZONE 'America/Sao_Paulo';
 ends:=(date_trunc('month',p_month::timestamp)+interval '1 month') AT TIME ZONE 'America/Sao_Paulo';
 WITH scope AS MATERIALIZED(SELECT a.id,a.name,a.email,coalesce(a.user_id,(SELECT l.user_id FROM public.athlete_auth_link l WHERE l.athlete_id=a.id ORDER BY l.created_at LIMIT 1)) user_id FROM public.athletes a WHERE a.is_test_account IS NOT TRUE AND(actor_role IN('admin','super_admin') OR a.coach_id=actor) AND(p_athlete_id IS NULL OR a.id=p_athlete_id))
 SELECT jsonb_build_object('athletes',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'email',email) ORDER BY name,id) FROM scope),'[]'),
 'appointments',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY scheduled_at,id) FROM(SELECT ap.id,ap.student_id,ap.title,ap.description,ap.scheduled_at,ap.status,ap.appointment_type,ap.duration,ap.location,s.name student_name FROM public.appointments ap JOIN scope s ON s.id=ap.student_id WHERE ap.scheduled_at>=starts AND ap.scheduled_at<ends)t),'[]'),
 'bookings',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY booking_time,id) FROM(SELECT b.id,b.class_id,b.user_email,b.status,b.booking_time,b.check_in_at,jsonb_build_object('class_name',g.class_name,'class_datetime',g.class_datetime,'location',g.location,'instructor_name',g.instructor_name) gym_classes FROM public.class_bookings b JOIN public.gym_classes g ON g.id=b.class_id WHERE b.user_id IN(SELECT user_id FROM scope WHERE user_id IS NOT NULL) AND g.class_datetime>=starts AND g.class_datetime<ends)t),'[]')) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_coach_agenda(date,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.fitpro_coach_agenda(date,uuid) TO authenticated;
CREATE FUNCTION public.fn_coach_agenda(p_month date,p_athlete_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT private.fitpro_coach_agenda(p_month,p_athlete_id)$$;
REVOKE ALL ON FUNCTION public.fn_coach_agenda(date,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_coach_agenda(date,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
