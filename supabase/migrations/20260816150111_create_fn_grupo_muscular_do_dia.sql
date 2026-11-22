-- Split científico (push/pull/legs + core) para decidir o grupo muscular do dia
-- quando o protocolo (estrutural/longevidade) não especifica alvo muscular.
-- PPL é o padrão com melhor respaldo para frequência 3-6x/semana (Schoenfeld et al., dose-resposta de volume).
CREATE OR REPLACE FUNCTION public.fn_grupo_muscular_do_dia(p_aluno_id uuid, p_data date, p_frequencia int DEFAULT 4)
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_ciclo_dia int;
  v_freq int := GREATEST(1, LEAST(COALESCE(p_frequencia, 4), 6));
BEGIN
  -- posição do dia dentro do ciclo de treino (não da semana civil), baseada em quantos
  -- dias se passaram desde uma âncora fixa, módulo a frequência semanal
  v_ciclo_dia := (p_data - DATE '2026-01-05')::int % v_freq;

  RETURN CASE v_freq
    WHEN 1 THEN ARRAY['peitoral','dorsais','membros inferiores','deltoides']  -- full body
    WHEN 2 THEN CASE v_ciclo_dia WHEN 0 THEN ARRAY['peitoral','deltoides','tríceps']
                                  ELSE ARRAY['dorsais','bíceps','membros inferiores'] END
    WHEN 3 THEN CASE v_ciclo_dia
                  WHEN 0 THEN ARRAY['peitoral','deltoides','tríceps']      -- push
                  WHEN 1 THEN ARRAY['dorsais','bíceps']                    -- pull
                  ELSE ARRAY['membros inferiores','core']                  -- legs
                END
    ELSE CASE v_ciclo_dia
                  WHEN 0 THEN ARRAY['peitoral','deltoides','tríceps']      -- push
                  WHEN 1 THEN ARRAY['dorsais','bíceps']                    -- pull
                  WHEN 2 THEN ARRAY['membros inferiores']                  -- legs
                  ELSE ARRAY['core','deltoides','membros inferiores']      -- 4º dia: core+acessório
                END
  END;
END;
$function$;;
