
-- ============================================================
-- RPC prescrever_treino — Motor SmartTreino 9FIT
-- ============================================================

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_historico_aluno_data
  ON public.historico_treinos_realizados(aluno_id, data_treino DESC);
CREATE INDEX IF NOT EXISTS idx_athlete_periodizations_status
  ON public.athlete_periodizations(athlete_id, status);
CREATE INDEX IF NOT EXISTS idx_smart_treino_macro_rules_active
  ON public.smart_treino_macro_rules(aluno_id, status);

-- ------------------------------------------------------------
-- Helper: seleciona N exercícios de um bloco para um aluno
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._selecionar_exercicios_bloco(
  p_aluno_id uuid,
  p_grupos text[],
  p_qtd integer,
  p_dias_anti_repeticao integer DEFAULT 7
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_excluir uuid[];
  v_result jsonb := '[]'::jsonb;
BEGIN
  -- IDs usados nos últimos N dias
  SELECT COALESCE(array_agg(DISTINCT (ex->>'id')::uuid), ARRAY[]::uuid[])
  INTO v_excluir
  FROM public.historico_treinos_realizados h,
       jsonb_array_elements(COALESCE(h.exercicios_realizados, '[]'::jsonb)) ex
  WHERE h.aluno_id = p_aluno_id
    AND h.data_treino >= CURRENT_DATE - p_dias_anti_repeticao
    AND ex ? 'id';

  -- Seleção: prioriza grupos solicitados, randomiza, exclui recentes
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', e.id,
      'nome', e.nome,
      'grupo_muscular', e.grupo_muscular,
      'video_url', e.video_url
    ) AS t
    FROM public.exercicios_novos e
    WHERE (p_grupos IS NULL OR cardinality(p_grupos) = 0
           OR EXISTS (SELECT 1 FROM unnest(p_grupos) g
                      WHERE lower(e.grupo_muscular) ILIKE '%' || lower(g) || '%'))
      AND NOT (e.id = ANY(v_excluir))
    ORDER BY random()
    LIMIT p_qtd
  ) sub;

  -- Fallback: se não retornou nada, pega qualquer exercício
  IF jsonb_array_length(v_result) = 0 THEN
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT jsonb_build_object(
        'id', e.id,
        'nome', e.nome,
        'grupo_muscular', e.grupo_muscular,
        'video_url', e.video_url
      ) AS t
      FROM public.exercicios_novos e
      ORDER BY random()
      LIMIT p_qtd
    ) sub;
  END IF;

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------
-- RPC principal: prescrever_treino
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prescrever_treino(
  p_aluno_id uuid DEFAULT NULL,
  p_data date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_aluno_id uuid;
  v_aluno record;
  v_periodizacao record;
  v_annual record;
  v_macro record;
  v_protocol record;
  v_semana int;
  v_fase text;
  v_rpe_base numeric;
  v_descanso text;
  v_neural jsonb;
  v_integracao jsonb;
  v_bloco9 jsonb;
  v_reset jsonb;
  v_treino jsonb;
  v_grupos_foco text[];
  v_block9_items jsonb;
  v_block9_count int;
  v_is_admin boolean;
  v_history_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'motivo', 'nao_autenticado');
  END IF;

  -- Resolução do aluno
  v_aluno_id := p_aluno_id;
  IF v_aluno_id IS NULL THEN
    SELECT athlete_id INTO v_aluno_id
    FROM public.athlete_auth_link
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;

  IF v_aluno_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'motivo', 'aluno_nao_resolvido');
  END IF;

  -- Carrega perfil
  SELECT * INTO v_aluno FROM public.alunos WHERE id = v_aluno_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'motivo', 'aluno_inexistente');
  END IF;

  -- Validação: admin OU professor do aluno OU o próprio aluno
  v_is_admin := public.has_role(v_user_id, 'admin'::app_role)
              OR public.has_role(v_user_id, 'super_admin'::app_role);
  IF NOT v_is_admin
     AND v_aluno.professor_id IS DISTINCT FROM v_user_id
     AND NOT EXISTS (SELECT 1 FROM public.athlete_auth_link
                     WHERE athlete_id = v_aluno_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('sucesso', false, 'motivo', 'sem_permissao');
  END IF;

  -- Periodização ativa
  SELECT * INTO v_periodizacao
  FROM public.athlete_periodizations
  WHERE athlete_id = v_aluno_id
    AND status IN ('in_progress', 'assigned', 'active')
  ORDER BY assigned_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'motivo', 'sem_periodizacao_ativa',
      'sugestao_cta', 'gerar_smart_treino',
      'aluno_id', v_aluno_id
    );
  END IF;

  -- Plano anual (opcional)
  IF v_periodizacao.annual_plan_id IS NOT NULL THEN
    SELECT * INTO v_annual
    FROM public.periodization_annual_plans
    WHERE id = v_periodizacao.annual_plan_id;
  END IF;

  -- Calcula semana atual
  v_semana := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p_data::timestamp - v_periodizacao.assigned_at)) / 604800.0)::int);
  v_fase := CASE
    WHEN v_semana <= 4 THEN 'acumulacao'
    WHEN v_semana <= 8 THEN 'intensificacao'
    WHEN v_semana <= 11 THEN 'realizacao'
    ELSE 'deload'
  END;

  -- Macro rule + Protocolo
  SELECT * INTO v_macro
  FROM public.smart_treino_macro_rules
  WHERE aluno_id = v_aluno_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND AND v_macro.protocol_code IS NOT NULL THEN
    SELECT * INTO v_protocol FROM public.smart_treino_protocols WHERE id = v_macro.protocol_code;
  END IF;

  v_rpe_base := COALESCE(v_macro.rpe_target, 7);
  v_descanso := COALESCE(v_macro.descanso_compostos, '90s');

  -- Grupos foco da semana
  v_grupos_foco := CASE
    WHEN v_aluno.foco_muscular IS NOT NULL THEN string_to_array(v_aluno.foco_muscular, ',')
    ELSE ARRAY['peito','dorsais','quadriceps','gluteos','core']
  END;

  -- BLOCOS — usa template do protocolo + seleção real
  v_neural := public._selecionar_exercicios_bloco(v_aluno_id, ARRAY['core','ombros','quadril']::text[], 2);
  v_integracao := public._selecionar_exercicios_bloco(v_aluno_id, ARRAY['core','dorsais','gluteos']::text[], 2);

  -- Block 9: tenta extrair quantidade do template
  v_block9_count := 4;
  IF v_protocol.block_9_template IS NOT NULL THEN
    IF jsonb_typeof(v_protocol.block_9_template->'exercicios') = 'array' THEN
      v_block9_count := LEAST(4, GREATEST(3, jsonb_array_length(v_protocol.block_9_template->'exercicios')));
    END IF;
  END IF;
  v_bloco9 := public._selecionar_exercicios_bloco(v_aluno_id, v_grupos_foco, v_block9_count);

  v_reset := public._selecionar_exercicios_bloco(v_aluno_id, ARRAY['core','panturrilhas']::text[], 2);

  -- Aplica parâmetros (séries/reps/RPE) em cada exercício
  WITH apply_params AS (
    SELECT 'neural' AS bloco, v_neural AS items, 2 AS series, '6-8' AS reps, 3 AS rpe, '60s' AS descanso, 'controlada' AS cadencia
    UNION ALL SELECT 'integracao', v_integracao, 2, '8-10', 5, '60s', 'fluida'
    UNION ALL SELECT 'bloco9', v_bloco9, 4, COALESCE(v_macro.reps_range, '8-12'), v_rpe_base::int, v_descanso, '2-0-1-0'
    UNION ALL SELECT 'reset', v_reset, 2, '30-60s', 2, '30s', 'lenta'
  )
  SELECT jsonb_object_agg(bloco, items_enriquecidos)
  INTO v_treino
  FROM (
    SELECT
      ap.bloco,
      COALESCE(jsonb_agg(
        ex || jsonb_build_object(
          'series', ap.series,
          'reps', ap.reps,
          'rpe', ap.rpe,
          'descanso', ap.descanso,
          'cadencia', ap.cadencia,
          'carga', 'autorregulada',
          'nota_tecnica', CASE ap.bloco
            WHEN 'neural' THEN 'Ativação neuromuscular — foco em qualidade e velocidade'
            WHEN 'integracao' THEN 'Conexão cinética multiplanar'
            WHEN 'bloco9' THEN 'Estímulo principal — RPE controlado'
            ELSE 'Recuperação ativa e mobilidade'
          END
        )
      ), '[]'::jsonb) AS items_enriquecidos
    FROM apply_params ap, jsonb_array_elements(ap.items) ex
    GROUP BY ap.bloco
  ) z;

  -- Persistência no histórico
  INSERT INTO public.historico_treinos_realizados(
    aluno_id, plano_treino_id, data_treino, semana_treino, dia_treino,
    exercicios_realizados, notas_professor
  ) VALUES (
    v_aluno_id,
    v_periodizacao.annual_plan_id,
    p_data,
    v_semana,
    EXTRACT(DOW FROM p_data)::int,
    COALESCE(v_treino, '{}'::jsonb),
    'Prescrito automaticamente pela RPC prescrever_treino'
  ) RETURNING id INTO v_history_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'data', p_data,
    'historico_id', v_history_id,
    'contexto', jsonb_build_object(
      'aluno_id', v_aluno_id,
      'aluno_nome', v_aluno.nome,
      'periodizacao_id', v_periodizacao.id,
      'annual_plan_id', v_periodizacao.annual_plan_id,
      'semana_atual', v_semana,
      'fase', v_fase,
      'protocolo', v_protocol.protocol_name,
      'protocol_code', v_protocol.id,
      'variacao', v_protocol.variation_name,
      'pillar', v_protocol.pillar_label
    ),
    'parametros', jsonb_build_object(
      'rpe_alvo', COALESCE(v_protocol.rpe_range, v_rpe_base::text),
      'descanso_padrao', v_descanso,
      'cadencia_padrao', '2-0-1-0',
      'duracao_estimada', COALESCE(v_aluno.tempo_disponivel_min, 60) || ' min',
      'reps_range', COALESCE(v_macro.reps_range, '8-12'),
      'progressao', COALESCE(v_macro.progression_type, 'load')
    ),
    'treino', COALESCE(v_treino, jsonb_build_object('neural','[]','integracao','[]','bloco9','[]','reset','[]')),
    'rationale', format(
      'Treino prescrito para %s (semana %s, fase %s) — Protocolo %s · %s. Anti-repetição: 7 dias.',
      v_aluno.nome, v_semana, v_fase,
      COALESCE(v_protocol.protocol_name,'-'), COALESCE(v_protocol.variation_name,'-')
    )
  );
END;
$$;

-- ------------------------------------------------------------
-- RPC HTML: prescrever_treino_html
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prescrever_treino_html(
  p_aluno_id uuid DEFAULT NULL,
  p_data date DEFAULT CURRENT_DATE
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_html text := '';
  v_bloco text;
  v_titulo text;
  v_ex jsonb;
BEGIN
  v_payload := public.prescrever_treino(p_aluno_id, p_data);

  IF NOT COALESCE((v_payload->>'sucesso')::boolean, false) THEN
    RETURN format('<section class="treino-9fit treino-erro"><p>Sem treino disponível: %s</p></section>',
                  v_payload->>'motivo');
  END IF;

  v_html := format(
    '<section class="treino-9fit" data-data="%s" data-aluno="%s"><header class="treino-header"><h2 class="treino-titulo">Treino %s</h2><p class="treino-sub">Semana %s · Fase %s · %s</p><dl class="treino-params"><dt>RPE</dt><dd>%s</dd><dt>Descanso</dt><dd>%s</dd><dt>Duração</dt><dd>%s</dd></dl></header>',
    v_payload->>'data',
    v_payload->'contexto'->>'aluno_id',
    v_payload->'contexto'->>'aluno_nome',
    v_payload->'contexto'->>'semana_atual',
    v_payload->'contexto'->>'fase',
    COALESCE(v_payload->'contexto'->>'protocolo','Protocolo livre'),
    v_payload->'parametros'->>'rpe_alvo',
    v_payload->'parametros'->>'descanso_padrao',
    v_payload->'parametros'->>'duracao_estimada'
  );

  FOR v_bloco, v_titulo IN
    SELECT * FROM (VALUES
      ('neural','Neural'),('integracao','Integração'),('bloco9','Bloco 9'),('reset','Reset')
    ) AS t(b,n)
  LOOP
    v_html := v_html || format('<div class="bloco-treino" data-bloco="%s"><h3 class="bloco-titulo">%s</h3><ul class="lista-exercicios">', v_bloco, v_titulo);
    FOR v_ex IN SELECT * FROM jsonb_array_elements(COALESCE(v_payload->'treino'->v_bloco, '[]'::jsonb))
    LOOP
      v_html := v_html || format(
        '<li class="exercicio" data-rpe="%s"><span class="ex-nome">%s</span><span class="ex-params">%sx%s · RPE %s · %s</span><small class="ex-nota">%s</small></li>',
        v_ex->>'rpe',
        v_ex->>'nome',
        v_ex->>'series', v_ex->>'reps', v_ex->>'rpe', v_ex->>'descanso',
        COALESCE(v_ex->>'nota_tecnica','')
      );
    END LOOP;
    v_html := v_html || '</ul></div>';
  END LOOP;

  v_html := v_html || format('<footer class="treino-rationale"><p>%s</p></footer></section>', v_payload->>'rationale');
  RETURN v_html;
END;
$$;

GRANT EXECUTE ON FUNCTION public.prescrever_treino(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prescrever_treino_html(uuid, date) TO authenticated;
;
