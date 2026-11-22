CREATE TABLE public.confirmed_strength_references (
 athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE, reference_key text NOT NULL,
 kg numeric NOT NULL CHECK(kg>0), reference_date date NOT NULL,
 confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, confirmed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(athlete_id,reference_key)
);
CREATE INDEX confirmed_strength_confirmer_idx ON public.confirmed_strength_references(confirmed_by);
ALTER TABLE public.confirmed_strength_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.confirmed_strength_references FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.confirmed_strength_references TO authenticated;
CREATE POLICY strength_references_own_or_coach ON public.confirmed_strength_references FOR SELECT TO authenticated
 USING(athlete_id=(SELECT public.fn_current_athlete_id()) OR private.fitpro_can_manage_athlete(athlete_id));
CREATE FUNCTION public.fn_confirm_strength_reference(p_athlete_id uuid,p_reference_key text,p_kg numeric,p_reference_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ref jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR NOT coalesce(public.fn_assessment_can_read(p_athlete_id),false) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_reference_key NOT IN('rm1_empurrar_superior','rm1_empurrar_perna','rm1_puxar_costas','rm1_puxar_inferior') THEN RAISE EXCEPTION 'invalid_reference';END IF;
 ref:=public.fn_athlete_capacity_core(p_athlete_id)#>ARRAY['rm1_refs',p_reference_key];
 IF ref IS NULL OR p_kg IS NULL OR p_reference_date IS NULL OR abs((ref->>'kg')::numeric-p_kg)>.001 OR (ref->>'date')::date<>p_reference_date THEN RAISE EXCEPTION 'reference_changed';END IF;
 INSERT INTO public.confirmed_strength_references(athlete_id,reference_key,kg,reference_date,confirmed_by) VALUES(p_athlete_id,p_reference_key,(ref->>'kg')::numeric,p_reference_date,auth.uid())
 ON CONFLICT(athlete_id,reference_key) DO UPDATE SET kg=excluded.kg,reference_date=excluded.reference_date,confirmed_by=auth.uid(),confirmed_at=now();
 RETURN jsonb_build_object('saved',true);
END $$;
REVOKE ALL ON FUNCTION public.fn_confirm_strength_reference(uuid,text,numeric,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_confirm_strength_reference(uuid,text,numeric,date) TO authenticated;
CREATE FUNCTION public.fn_get_strength_reference_hints(p_athlete_id uuid,p_percentage numeric DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE cap jsonb; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR NOT coalesce(public.fn_assessment_can_read(p_athlete_id),false) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_percentage IS NOT NULL AND p_percentage NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_percentage';END IF;
 cap:=public.fn_athlete_capacity_core(p_athlete_id);
 SELECT coalesce(jsonb_agg(jsonb_build_object('key',r.key,'kg',(r.value->>'kg')::numeric,'date',r.value->>'date','source',r.value->>'source',
 'confirmed',r.value->>'source'='professor' OR c.athlete_id IS NOT NULL,
 'load_hint_kg',CASE WHEN r.value->>'source'='professor' OR c.athlete_id IS NOT NULL THEN round((r.value->>'kg')::numeric*p_percentage/100,1) END) ORDER BY r.key),'[]') INTO result
 FROM jsonb_each(coalesce(cap->'rm1_refs','{}')) r LEFT JOIN public.confirmed_strength_references c ON c.athlete_id=p_athlete_id AND c.reference_key=r.key AND c.kg=(r.value->>'kg')::numeric AND c.reference_date=(r.value->>'date')::date;
 RETURN jsonb_build_object('references',result,'percentage',p_percentage,'source','confirmed_reference','changes_prescription',false);
END $$;
REVOKE ALL ON FUNCTION public.fn_get_strength_reference_hints(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_get_strength_reference_hints(uuid,numeric) TO authenticated;
NOTIFY pgrst,'reload schema';
