CREATE OR REPLACE FUNCTION public.fn_ensure_progress_athlete(p_student_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid; n int; s public.alunos%rowtype;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 a:=public.fn_resolve_progress_athlete(p_student_id);
 IF a IS NOT NULL THEN RETURN a;END IF;
 SELECT * INTO s FROM public.alunos WHERE id=p_student_id AND professor_id=auth.uid();
 IF NOT FOUND OR NOT coalesce(private.fitpro_actor_role() IN('professor','trainer','admin','super_admin'),false) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('progress-identity:'||p_student_id::text,0));
 SELECT count(*),(array_agg(id))[1] INTO n,a FROM public.athletes WHERE aluno_id=p_student_id;
 IF n>1 THEN RAISE EXCEPTION 'Vínculo ambíguo: solicite revisão do cadastro.';END IF;
 IF a IS NULL THEN
  INSERT INTO public.athletes(aluno_id,coach_id,name,email,phone,activated)
   VALUES(s.id,auth.uid(),s.nome,s.email,s.telefone,false) RETURNING id INTO a;
 END IF;
 UPDATE public.avaliacoes_unificadas SET athlete_id=a,updated_at=now()
 WHERE aluno_id=s.id AND athlete_id IS NULL;
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.fn_ensure_progress_athlete(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_ensure_progress_athlete(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.fn_professor_progress_assessment_count(p_days integer DEFAULT 30)
RETURNS bigint LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); total bigint;
BEGIN
 IF actor IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 SELECT count(*) INTO total FROM public.avaliacoes_unificadas v
 LEFT JOIN public.athletes a ON a.id=v.athlete_id LEFT JOIN public.alunos s ON s.id=v.aluno_id
 WHERE (a.coach_id=actor OR s.professor_id=actor)
 AND v.created_at>=now()-make_interval(days=>greatest(1,least(coalesce(p_days,30),3660)))
 AND NOT EXISTS(SELECT 1 FROM public.athlete_data_sources ds WHERE ds.athlete_id=v.athlete_id AND ds.tipo=v.origem AND NOT ds.escopo_professor);
 RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_progress_assessment_count(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_progress_assessment_count(integer) TO authenticated;
