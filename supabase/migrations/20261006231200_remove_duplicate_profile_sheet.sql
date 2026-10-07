-- A ficha dinâmica já existe no app (DynamicPDI + fn_save_pdi + user_parameters/athlete_pdi_history, com declarado/observado/inferido,
-- conforme docs/macro01/data-contracts.md). As tabelas athlete_profile_sheet e athlete_preference_counters (migration ...230600)
-- duplicavam essa fonte e nunca foram ligadas ao app: removidas para manter uma única fonte de verdade.
-- Só continham o backfill do PDI legado (cópia de athlete_pdi_history, que permanece intacto).
-- O assert de posse usado por fn_library_progress vira função própria e independente.
CREATE OR REPLACE FUNCTION public.fn_assert_athlete_access(p_athlete_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND (a.user_id = auth.uid() OR a.coach_id = auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = p_athlete_id AND l.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE = '42501';
  END IF;
END; $function$;
REVOKE ALL ON FUNCTION public.fn_assert_athlete_access(uuid) FROM PUBLIC, anon, authenticated;

DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.fn_library_progress(uuid,integer,integer,integer)'::regprocedure) INTO d;
  IF d NOT LIKE '%public.fn_sheet_assert(v_a.athlete_id)%' THEN RAISE EXCEPTION 'fn_library_progress fora do estado esperado'; END IF;
  d := replace(d, 'public.fn_sheet_assert(v_a.athlete_id)', 'public.fn_assert_athlete_access(v_a.athlete_id)');
  EXECUTE d;
END
$mig$;

DROP TABLE IF EXISTS public.athlete_preference_counters;
DROP TABLE IF EXISTS public.athlete_profile_sheet;
DROP FUNCTION IF EXISTS public.fn_sheet_get(uuid);
DROP FUNCTION IF EXISTS public.fn_sheet_patch(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.fn_pref_bump(uuid, text, text);
DROP FUNCTION IF EXISTS public.trg_loop_emit_sheet();
DROP FUNCTION IF EXISTS public.fn_sheet_assert(uuid);

-- Funções duplicadas/legadas sem chamador no repositório nem em outras funções: marcadas, não removidas
-- (ausência no repositório não prova ausência em parceiros externos).
COMMENT ON FUNCTION public.get_week_workouts(uuid) IS 'LEGADO: o app usa fn_get_week_workouts(uuid,date).';
COMMENT ON FUNCTION public.get_workout_of_day(uuid, date) IS 'LEGADO: sem chamador no repositório; verificar parceiros antes de remover.';
COMMENT ON FUNCTION public.fn_get_treino_dia(uuid, date) IS 'Sem chamador no repositório; verificar parceiros antes de remover.';
COMMENT ON FUNCTION public.aplicar_ajuste_treino_dia(uuid, date, jsonb) IS 'LEGADO: o app usa fn_ajustar_treino_dia(uuid,date,jsonb).';
COMMENT ON FUNCTION public.fn_ajustar_treino_real(uuid, uuid) IS 'Sem chamador no repositório; verificar parceiros antes de remover.';
COMMENT ON FUNCTION public.deprecated_prescrever_treino_rapido(uuid, text, integer, text) IS 'DEPRECADA: substituída por fn_treino_rapido. Sem permissão para anon/authenticated.';
COMMENT ON FUNCTION public.gerar_blocos_protocolo_dia(uuid, date) IS 'ÓRFÃ: sem trigger nem chamador; daily_protocol_blocks está vazia.';
COMMENT ON FUNCTION public.fn_reward_share(uuid, text, text, integer) IS 'LEGADO: o XP de compartilhamento é pago pelo trigger trg_share_events_reward. Não chamar do cliente.';
