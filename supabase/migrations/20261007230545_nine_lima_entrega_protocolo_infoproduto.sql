-- NINE/LIMA: além de aplicar o treino do dia, entrega o protocolo como infoproduto na área Protocolo do aluno
-- (neural -> integração -> bloco 9 -> reset, com foco, descrição e RPE alvo), usando o visualizador de infoproduto já existente.
-- Idempotente por (athlete_id, 'infoproduto', 'nine_lima:<id do protocolo>'). Falha na entrega nunca desfaz o treino.
DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.fn_aplicar_nine_lima(uuid,date)'::regprocedure) INTO d;
  IF d NOT LIKE E'%  v_res := public.fn_aplicar_protocolo_9x9x9(p_athlete_id, v_protocol_id, p_data);\n  return v_res;%' THEN
    RAISE EXCEPTION 'fn_aplicar_nine_lima fora do estado esperado';
  END IF;
  d := replace(d,
    E'  v_res := public.fn_aplicar_protocolo_9x9x9(p_athlete_id, v_protocol_id, p_data);\n  return v_res;',
    $r$  v_res := public.fn_aplicar_protocolo_9x9x9(p_athlete_id, v_protocol_id, p_data);

  IF coalesce((v_res->>'success')::boolean, false) THEN
    BEGIN
      INSERT INTO public.student_library_assignments (athlete_id, content_type, content_ref, content_title, notes, status, payload)
      SELECT p_athlete_id, 'infoproduto', 'nine_lima:' || p.id,
             'NINE/LIMA · ' || p.protocol_name || ' — ' || coalesce(p.variation_name, ''),
             'Protocolo entregue pelo NINE/LIMA',
             'active',
             jsonb_build_object(
               'source', 'nine_lima',
               'level', v_level,
               'modules', jsonb_build_array(
                 jsonb_build_object('title', 'Neural · ' || coalesce(p.block_neural, '—')),
                 jsonb_build_object('title', 'Integração · ' || coalesce(p.block_integration, '—')),
                 jsonb_build_object('title', 'Bloco 9 · ' || coalesce(p.block_9_template->>'sets', '?') || 'x' || coalesce(p.block_9_template->>'reps', '?') || ' · descanso ' || coalesce(p.block_9_template->>'rest', '?') || 's · cadência ' || coalesce(p.block_9_template->>'cadence', 'livre')),
                 jsonb_build_object('title', 'Reset · ' || coalesce(p.block_reset, '—'))
               ),
               'guidelines', jsonb_build_array(
                 'Pilar: ' || coalesce(p.pillar_label, p.pillar),
                 'Foco: ' || coalesce(p.variation_focus, '—'),
                 'Descrição: ' || coalesce(p.model_description, '—'),
                 'RPE alvo: ' || coalesce(p.rpe_range, '—')
               )
             )
      FROM public.smart_treino_protocols p
      WHERE p.id = v_protocol_id
      ON CONFLICT (athlete_id, content_type, content_ref) DO UPDATE
        SET payload = EXCLUDED.payload,
            content_title = EXCLUDED.content_title,
            status = CASE WHEN public.student_library_assignments.status = 'cancelled' THEN 'active' ELSE public.student_library_assignments.status END;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  return v_res;$r$);
  IF d NOT LIKE '%nine_lima:%' THEN RAISE EXCEPTION 'substituicao falhou'; END IF;
  EXECUTE d;
END
$mig$;;
