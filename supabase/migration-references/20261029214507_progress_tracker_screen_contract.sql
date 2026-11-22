CREATE OR REPLACE FUNCTION public.fn_get_ron_progresso_screen(p_athlete_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_atual record;
  v_primeira_score numeric;
  v_forca_total numeric;
  v_gordura_atual numeric;
  v_gordura_primeira numeric;
  v_ultimo_pr record;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR NOT EXISTS(
   SELECT 1 FROM public.athletes a WHERE a.id=p_athlete_id AND (a.user_id=auth.uid() OR EXISTS(
    SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=a.id AND l.user_id=auth.uid()
   ))
  ) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;

  SELECT score_global, gordura_corporal, massa_muscular, data_avaliacao
  INTO v_atual
  FROM public.avaliacoes_unificadas
  WHERE athlete_id = p_athlete_id AND score_global > 0 AND public.fn_assessment_is_official(to_jsonb(avaliacoes_unificadas))
  ORDER BY data_avaliacao DESC LIMIT 1;

  SELECT score_global INTO v_primeira_score
  FROM public.avaliacoes_unificadas
  WHERE athlete_id = p_athlete_id AND score_global > 0 AND public.fn_assessment_is_official(to_jsonb(avaliacoes_unificadas))
  ORDER BY data_avaliacao ASC LIMIT 1;

  SELECT gordura_corporal INTO v_gordura_primeira
  FROM public.avaliacoes_unificadas
  WHERE athlete_id = p_athlete_id AND gordura_corporal IS NOT NULL AND gordura_corporal > 0
  ORDER BY data_avaliacao ASC LIMIT 1;

  SELECT SUM(wes.actual_weight * wes.actual_reps) INTO v_forca_total
  FROM public.workout_exercise_sets wes
  JOIN public.workout_executions we ON we.id = wes.execution_id
  WHERE we.athlete_id = p_athlete_id
    AND we.status = 'completed' AND we.completion_valid
    AND wes.completed = true
    AND wes.actual_weight IS NOT NULL
    AND wes.actual_reps IS NOT NULL;

  SELECT gordura_corporal INTO v_gordura_atual
  FROM public.avaliacoes_unificadas
  WHERE athlete_id = p_athlete_id AND gordura_corporal IS NOT NULL AND gordura_corporal > 0
  ORDER BY data_avaliacao DESC LIMIT 1;

  SELECT exercicio, data_pr INTO v_ultimo_pr
  FROM (SELECT * FROM public.personal_records WHERE NOT public.fn_assessment_record_excluded(athlete_id,data_pr,exercicio,valor)) personal_records
  WHERE athlete_id = p_athlete_id
  ORDER BY data_pr DESC LIMIT 1;

  SELECT jsonb_build_object(

    'avaliacao_atual', jsonb_build_object(
      'score_atual', v_atual.score_global,
      'score_primeira_do_periodo', v_primeira_score,
      'delta_pp', CASE WHEN v_primeira_score IS NOT NULL AND v_atual.score_global != v_primeira_score
        THEN round((v_atual.score_global - v_primeira_score)::numeric, 1)
        ELSE NULL END,
      'data', v_atual.data_avaliacao
    ),

    'composicao_corporal',(SELECT jsonb_build_object(
      'peso',a.peso,'gordura_corporal',a.gordura_corporal,'massa_muscular',a.massa_muscular,
      'data',a.data_avaliacao,'origem',a.origem,'metodo_gordura',a.dados_adicionais->>'metodo_gordura',
      'confianca_gordura',CASE WHEN a.dados_adicionais->>'metodo_gordura' ~* '(navy|estim)' THEN 'ESTIMADO' ELSE coalesce(a.dados_adicionais#>>'{confianca,gordura_corporal}','CONFIRMADO') END
     ) FROM public.avaliacoes_unificadas a WHERE a.athlete_id=p_athlete_id AND (a.peso IS NOT NULL OR a.gordura_corporal IS NOT NULL OR a.massa_muscular IS NOT NULL)
       ORDER BY a.data_avaliacao DESC,a.created_at DESC,a.id DESC LIMIT 1),

    'forca_total', jsonb_build_object(
      'total_kg', v_forca_total,
      'tem_sets_registrados', v_forca_total IS NOT NULL
    ),

    'tendencia_gordura_60d', (
      SELECT jsonb_agg(jsonb_build_object('data', data_avaliacao, 'valor', gordura_corporal) ORDER BY data_avaliacao)
      FROM public.avaliacoes_unificadas
      WHERE athlete_id = p_athlete_id
        AND gordura_corporal IS NOT NULL
        AND data_avaliacao >= CURRENT_DATE - INTERVAL '60 days'
    ),

    -- Novo: série completa de score_global, sem limite de 60 dias, pra
    -- gráfico de "Evolução do Score" na tela Progresso.
    'score_historico', (
      SELECT jsonb_agg(jsonb_build_object('data', data_avaliacao, 'valor', score_global) ORDER BY data_avaliacao)
      FROM public.avaliacoes_unificadas
      WHERE athlete_id = p_athlete_id AND score_global > 0 AND public.fn_assessment_is_official(to_jsonb(avaliacoes_unificadas))
    ),

    'progressao_forca', (
      SELECT jsonb_agg(jsonb_build_object(
        'exercicio', exercicio, 'data', data_pr, 'valor', valor, 'unidade', unidade
      ) ORDER BY data_pr)
      FROM (SELECT * FROM public.personal_records WHERE NOT public.fn_assessment_record_excluded(athlete_id,data_pr,exercicio,valor)) personal_records
      WHERE athlete_id = p_athlete_id AND tipo = 'forca'
    ),

    'recordes_recentes', (
      SELECT jsonb_agg(jsonb_build_object(
        'exercicio', exercicio, 'data', data_pr, 'valor', valor, 'unidade', unidade
      ) ORDER BY data_pr DESC)
      FROM (
        SELECT * FROM (SELECT * FROM public.personal_records WHERE NOT public.fn_assessment_record_excluded(athlete_id,data_pr,exercicio,valor)) personal_records
        WHERE athlete_id = p_athlete_id
        ORDER BY data_pr DESC LIMIT 5
      ) recentes
    ),

    'corridas_recentes', (
      SELECT jsonb_agg(jsonb_build_object(
        'data', recorded_at, 'distancia_km', round((distance_m::numeric / 1000), 2), 'fonte', source
      ) ORDER BY recorded_at DESC)
      FROM (
        SELECT bal.* FROM public.bio_activity_logs bal
        WHERE bal.source='move_gps' AND (EXISTS(SELECT 1 FROM public.athletes a WHERE a.id=p_athlete_id AND a.user_id=bal.user_id) OR EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=p_athlete_id AND l.user_id=bal.user_id))
        ORDER BY bal.recorded_at DESC LIMIT 5
      ) corridas
    ),

    'metas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'titulo', titulo, 'exercicio', exercicio, 'metrica', metrica,
        'valor_inicial', valor_inicial, 'valor_atual', valor_atual, 'valor_meta', valor_meta,
        'unidade', unidade, 'prazo', prazo, 'status', status
      ) ORDER BY prazo NULLS LAST)
      FROM public.metas_progresso
      WHERE athlete_id = p_athlete_id
    ), '[]'::jsonb),

    'insights', (
      SELECT jsonb_agg(texto) FROM (
        SELECT format('Redução de %spp de gordura corporal nas últimas avaliações.',
          round((v_gordura_primeira - v_gordura_atual)::numeric, 1)) AS texto
        WHERE v_gordura_atual IS NOT NULL AND v_gordura_primeira IS NOT NULL
          AND v_gordura_atual < v_gordura_primeira
        UNION ALL
        SELECT format('Último recorde: %s em %s.', v_ultimo_pr.exercicio, to_char(v_ultimo_pr.data_pr, 'DD/MM/YYYY'))
        WHERE v_ultimo_pr.exercicio IS NOT NULL
      ) insights_gerados
    )

  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_hub(p_athlete_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_owner boolean; v_assessments jsonb; v_sources jsonb; v_workouts jsonb; v_loads jsonb; v_records jsonb; v_age int; v_gender text; v_settings jsonb; v_stats jsonb; v_weighted jsonb; v_capacity jsonb; v_optional_errors jsonb:='[]'::jsonb; v_today date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date; v_streak int;
begin
 if not public.fn_assessment_can_read(p_athlete_id) then raise exception 'not authorized' using errcode='42501'; end if;
 select (a.user_id=auth.uid() or exists(select 1 from athlete_auth_link l where l.athlete_id=a.id and l.user_id=auth.uid())),coalesce(extract(year from age(current_date,a.birthdate))::int,a.age),lower(a.gender)
 into v_owner,v_age,v_gender from athletes a where a.id=p_athlete_id;
 select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('oficial',public.fn_assessment_is_official(to_jsonb(a)),'peso_score',public.fn_assessment_weight(to_jsonb(a))) order by a.data_avaliacao,a.created_at,a.id),'[]') into v_assessments
 from avaliacoes_unificadas a where a.athlete_id=p_athlete_id and (coalesce(v_owner,false) or not exists(select 1 from athlete_data_sources s where s.athlete_id=p_athlete_id and s.tipo=a.origem and not s.escopo_professor));
 select coalesce(jsonb_agg(x),'[]') into v_sources from (
 select o.origem tipo,o.n registros,o.ultima,coalesce(s.status,'active') status,coalesce(s.escopo_professor,true) escopo_professor,s.conectado_em
 from (select origem,count(*) n,max(data_avaliacao) ultima from avaliacoes_unificadas where athlete_id=p_athlete_id group by origem)o
 left join athlete_data_sources s on s.athlete_id=p_athlete_id and s.tipo=o.origem
 where coalesce(v_owner,false) or coalesce(s.escopo_professor,true)
 )x;
 select coalesce(jsonb_agg(x order by x.date),'[]') into v_workouts from (
 select 'fitpro:'||id id,workout_date date,coalesce(phase_name,'Treino concluído') name,total_volume_kg "volumeKg",avg_rpe rpe,'FitPro' source from workout_executions where athlete_id=p_athlete_id and status='completed' and completion_valid
 union all select 'progress:'||id,data_treino,coalesce(nome,'Treino concluído'),volume_total,pse_medio,'Progress Tracker' from treinos_realizados where athlete_id=p_athlete_id
 )x;
 select coalesce(jsonb_agg(x order by x.date),'[]') into v_loads from (
 select 'fitpro:'||s.id id,e.workout_date date,s.exercise_name exercise,s.actual_weight kg,s.actual_reps reps,'FitPro' source from workout_exercise_sets s join workout_executions e on e.id=s.execution_id where e.athlete_id=p_athlete_id and e.status='completed' and e.completion_valid and s.completed and s.actual_weight>0
 union all select 'progress:'||id,data_registro,exercicio,carga_max,reps,'Progress Tracker' from registros_carga where athlete_id=p_athlete_id and carga_max>0
 )x;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'date',r.data_pr,'exercise',r.exercicio,'value',r.valor,'unit',r.unidade,'type',r.tipo) order by r.data_pr),'[]') into v_records from personal_records r where r.athlete_id=p_athlete_id and (coalesce(v_owner,false) or not exists(select 1 from athlete_data_sources withheld where withheld.athlete_id=p_athlete_id and not withheld.escopo_professor)) and not public.fn_assessment_record_excluded(r.athlete_id,r.data_pr,r.exercicio,r.valor);
 select to_jsonb(s)-'athlete_id' into v_settings from athlete_reassessment_settings s where athlete_id=p_athlete_id;

 WITH dates AS(SELECT DISTINCT (x->>'date')::date activity_date FROM jsonb_array_elements(v_workouts)x),
 start_day AS(SELECT CASE WHEN EXISTS(SELECT 1 FROM dates WHERE activity_date=v_today) THEN v_today ELSE v_today-1 END activity_date),
 ordered AS(SELECT activity_date,row_number() OVER(ORDER BY activity_date DESC)::int seq FROM dates WHERE activity_date<=v_today)
 SELECT count(*) INTO v_streak FROM ordered,start_day WHERE ordered.activity_date=start_day.activity_date-(ordered.seq-1);
 SELECT jsonb_build_object(
  'total_treinos_geral',jsonb_array_length(v_workouts),
  'total_treinos_mes',count(*) FILTER(WHERE (x->>'date')::date>=date_trunc('month',v_today)::date AND (x->>'date')::date<=v_today),
  'kg_total_mes',CASE WHEN count(*) FILTER(WHERE (x->>'date')::date>=date_trunc('month',v_today)::date AND (x->>'date')::date<=v_today)=0 THEN 0 ELSE sum((x->>'volumeKg')::numeric) FILTER(WHERE (x->>'date')::date>=date_trunc('month',v_today)::date AND (x->>'date')::date<=v_today) END,
  'streak_dias',v_streak,'ultimo_treino',max(x->>'date'),'prs_count',jsonb_array_length(v_records),
  'fitpro_sessions',(SELECT count(*) FROM jsonb_array_elements(v_workouts)w WHERE w->>'source'='FitPro'),
  'manual_sessions',(SELECT count(*) FROM jsonb_array_elements(v_workouts)w WHERE w->>'source'='Progress Tracker')
 ) INTO v_stats FROM jsonb_array_elements(v_workouts)x;
 IF coalesce(v_owner,false) OR NOT EXISTS(SELECT 1 FROM public.athlete_data_sources s WHERE s.athlete_id=p_athlete_id AND NOT s.escopo_professor) THEN
  BEGIN v_weighted:=public.fn_assessment_weighted_score(p_athlete_id,120);
   EXCEPTION WHEN OTHERS THEN v_optional_errors:=v_optional_errors||'["weighted_score"]'::jsonb;END;
  BEGIN v_capacity:=public.fn_athlete_capacity_profile(p_athlete_id);
   EXCEPTION WHEN OTHERS THEN v_optional_errors:=v_optional_errors||'["capacity_profile"]'::jsonb;END;
 END IF;
 return jsonb_build_object('stats',v_stats,'weighted_score',v_weighted,'capacity_profile',v_capacity,'unavailable_features',v_optional_errors,'contract_version',3,'legacy_screen',case when coalesce(v_owner,false) then public.fn_get_ron_progresso_screen(p_athlete_id) else '{}'::jsonb end,'can_manage',coalesce(v_owner,false),'assessments',v_assessments,'sources',v_sources,'workouts',v_workouts,'loads',v_loads,'records',v_records,
 'goals',coalesce((select jsonb_agg(to_jsonb(m) order by prazo nulls last) from metas_progresso m where athlete_id=p_athlete_id),'[]'),
 'references',coalesce((select jsonb_agg(to_jsonb(r)) from ref_faixas r where v_age between idade_min and idade_max and lower(sexo)=v_gender),'[]'),
 'settings',coalesce(v_settings,jsonb_build_object('interval_weeks',8,'reminder_enabled',false)));
end; $function$;


CREATE OR REPLACE FUNCTION public.fn_professor_progress_assessments(p_limit int DEFAULT 50,p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); result jsonb;
BEGIN
 IF actor IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(x ORDER BY x.data_avaliacao DESC,x.id),'[]'::jsonb) INTO result FROM (
  SELECT v.*,jsonb_build_object('nome',coalesce(a.name,s.nome),'email',coalesce(a.email,s.email),'professor_id',coalesce(a.coach_id,s.professor_id)) alunos
  FROM public.avaliacoes_unificadas v LEFT JOIN public.athletes a ON a.id=v.athlete_id LEFT JOIN public.alunos s ON s.id=v.aluno_id
  WHERE (a.coach_id=actor OR s.professor_id=actor)
   AND NOT EXISTS(SELECT 1 FROM public.athlete_data_sources ds WHERE ds.athlete_id=v.athlete_id AND ds.tipo=v.origem AND NOT ds.escopo_professor)
  ORDER BY v.data_avaliacao DESC,v.id LIMIT greatest(1,least(coalesce(p_limit,50),100)) OFFSET greatest(coalesce(p_offset,0),0)
 )x;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_progress_assessments(int,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_progress_assessments(int,int) TO authenticated;

