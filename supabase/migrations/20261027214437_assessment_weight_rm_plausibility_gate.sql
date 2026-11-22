
-- Plausibilidade de 1RM por razão carga/peso corporal (limites generosos; sexo desconhecido usa o limite masculino).
CREATE OR REPLACE FUNCTION public.fn_rm_plausible(p_key text, p_kg numeric, p_peso numeric, p_gender text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE
  WHEN p_kg IS NULL OR p_kg<=0 THEN true
  WHEN coalesce(p_peso,0)<=0 THEN true
  ELSE p_kg <= p_peso * (CASE
    WHEN p_key='rm1_empurrar_superior' THEN CASE WHEN lower(coalesce(p_gender,'')) LIKE 'f%' THEN 1.6 ELSE 2.5 END
    WHEN p_key='rm1_empurrar_perna'    THEN CASE WHEN lower(coalesce(p_gender,'')) LIKE 'f%' THEN 4.0 ELSE 5.0 END
    WHEN p_key='rm1_puxar_costas'      THEN CASE WHEN lower(coalesce(p_gender,'')) LIKE 'f%' THEN 1.5 ELSE 2.2 END
    WHEN p_key='rm1_puxar_inferior'    THEN CASE WHEN lower(coalesce(p_gender,'')) LIKE 'f%' THEN 2.8 ELSE 3.5 END
    ELSE 5.0 END)
 END
$$;

CREATE OR REPLACE FUNCTION public.fn_assessment_weight(p_row jsonb) RETURNS numeric
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
 SELECT CASE
  WHEN coalesce((p_row->>'score_global')::numeric,0) <= 0 THEN 0::numeric
  WHEN public.fn_assessment_is_official(p_row) THEN 1.0::numeric
  WHEN coalesce(p_row->>'origem','') IN ('avaliacao_guiada','autoavaliacao') THEN
   CASE
    WHEN EXISTS (
      SELECT 1 FROM unnest(ARRAY['rm1_empurrar_superior','rm1_empurrar_perna','rm1_puxar_costas','rm1_puxar_inferior']) k
      WHERE NOT public.fn_rm_plausible(k, nullif(p_row->>k,'')::numeric,
            coalesce(nullif(p_row->>'peso','')::numeric,(SELECT a.peso_kg FROM public.athletes a WHERE a.id=nullif(p_row->>'athlete_id','')::uuid)),
            (SELECT a.gender FROM public.athletes a WHERE a.id=nullif(p_row->>'athlete_id','')::uuid))
    ) THEN 0::numeric
    WHEN coalesce(p_row#>>'{dados_adicionais,confianca_score}','')='ESTIMADO' THEN 0.24::numeric
    ELSE 0.4::numeric
   END
  ELSE 0::numeric
 END
$$;
;
