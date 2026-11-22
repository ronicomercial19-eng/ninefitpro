-- prescrever_treino (gerador automático da semana, usado por fn_generate_periodized_week):
-- os blocos neural/integração/reset do protocolo são TEXTO de instrução ("Mobilidade global + Estabilização core"),
-- e fn_montar_bloco_exercicios só aceita nome exato de exercício do catálogo -> retornava [] para quase todos os protocolos,
-- e qualquer bloco vazio suspendia o dia inteiro (unmatched_prescription_requires_review) / derrubava a semana.
-- Agora: só o bloco principal (bloco9) é obrigatório; nos demais entram apenas exercícios do catálogo que passem na regra de foco.
-- Nada é sorteado nem inventado: instrução sem exercício correspondente simplesmente não vira exercício.
DO $mig$
DECLARE
  v_def text;
  v_new text;
  v_old text := 'IF EXISTS(SELECT 1 FROM jsonb_each(v_dia_treino) b WHERE jsonb_array_length(b.value)=0)';
  v_repl text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p WHERE p.proname='prescrever_treino' AND p.pronamespace='public'::regnamespace;
  IF v_def IS NULL THEN RAISE EXCEPTION 'prescrever_treino not found'; END IF;

  v_repl := $r$v_dia_treino := jsonb_build_object(
    'neural', (SELECT coalesce(jsonb_agg(t.x ORDER BY t.ord),'[]'::jsonb)
               FROM jsonb_array_elements(v_dia_treino->'neural') WITH ORDINALITY AS t(x,ord)
               JOIN public.exercises e ON e.id=(t.x->>'id')::uuid
               WHERE public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)), v_grupos)),
    'integracao', (SELECT coalesce(jsonb_agg(t.x ORDER BY t.ord),'[]'::jsonb)
               FROM jsonb_array_elements(v_dia_treino->'integracao') WITH ORDINALITY AS t(x,ord)
               JOIN public.exercises e ON e.id=(t.x->>'id')::uuid
               WHERE public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)), v_grupos)),
    'bloco9', coalesce(v_dia_treino->'bloco9','[]'::jsonb),
    'reset', (SELECT coalesce(jsonb_agg(t.x ORDER BY t.ord),'[]'::jsonb)
               FROM jsonb_array_elements(v_dia_treino->'reset') WITH ORDINALITY AS t(x,ord)
               JOIN public.exercises e ON e.id=(t.x->>'id')::uuid
               WHERE public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)), v_grupos))
  );
  IF jsonb_array_length(coalesce(v_dia_treino->'bloco9','[]'::jsonb))=0$r$;

  v_new := replace(v_def, v_old, v_repl);
  IF v_new = v_def THEN RAISE EXCEPTION 'pattern not found in prescrever_treino'; END IF;
  EXECUTE v_new;
END
$mig$;;
