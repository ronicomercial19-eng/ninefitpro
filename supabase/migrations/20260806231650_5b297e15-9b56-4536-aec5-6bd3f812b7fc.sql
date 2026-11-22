
CREATE OR REPLACE FUNCTION public.muscle_group_synonyms(p_group text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(translate(trim(p_group),'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ','aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
    WHEN 'peito' THEN ARRAY['peito','peitoral','chest']
    WHEN 'costas' THEN ARRAY['costas','latissimo','dorsal','romboide','trapezio','back']
    WHEN 'ombro' THEN ARRAY['ombro','deltoide','shoulder']
    WHEN 'ombros' THEN ARRAY['ombro','deltoide','shoulder']
    WHEN 'triceps' THEN ARRAY['triceps']
    WHEN 'biceps' THEN ARRAY['biceps','braquial']
    WHEN 'antebraco' THEN ARRAY['antebraco','forearm','braquiorradial']
    WHEN 'quadriceps' THEN ARRAY['quadriceps','quadril','perna','coxa']
    WHEN 'posterior_coxa' THEN ARRAY['isquiotibiais','posterior','hamstring']
    WHEN 'gluteo' THEN ARRAY['gluteo','gluteos']
    WHEN 'panturrilha' THEN ARRAY['panturrilha','soleo','gastrocnemio','calf']
    WHEN 'core' THEN ARRAY['core','abdomen','abdominal','oblique','lombar','eretores','erectores']
    WHEN 'abdomen' THEN ARRAY['core','abdomen','abdominal']
    ELSE ARRAY[lower(translate(trim(p_group),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'))]
  END;
$$;

GRANT EXECUTE ON FUNCTION public.muscle_group_synonyms(text) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.find_exercises_for_groups(p_groups jsonb, p_limit int DEFAULT 6)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH terms AS (
    SELECT DISTINCT unnest(public.muscle_group_synonyms(g)) AS t
    FROM jsonb_array_elements_text(COALESCE(p_groups,'[]'::jsonb)) g
  ),
  cand AS (
    SELECT e.id, e.name, e.target_muscles, e.equipment, e.video_url
    FROM public.exercises e
    WHERE EXISTS (
      SELECT 1 FROM terms
      WHERE lower(translate(COALESCE(array_to_string(e.target_muscles,' '),'') || ' ' || COALESCE(e.name,''),
            'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')) LIKE '%'||terms.t||'%'
    )
    LIMIT 120
  )
  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  FROM (SELECT * FROM cand ORDER BY random() LIMIT p_limit) x;
$$;

GRANT EXECUTE ON FUNCTION public.find_exercises_for_groups(jsonb, int) TO authenticated, anon, service_role;
;
