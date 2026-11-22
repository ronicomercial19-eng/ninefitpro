-- QA Fase F (16/09): varredura completa achou ~40 funções SECURITY DEFINER
-- com o mesmo padrão de falha das 5 já corrigidas hoje (fn_get_ron_progresso_screen,
-- fn_registrar_peso_avulso, fn_get_athlete_timeline, fn_get_leaderboard[não
-- se aplica, é pública de propósito], fn_ajustar_treino_dia). Helper
-- reutilizável pra não duplicar a checagem de posse em cada função — chamar
-- `PERFORM public.fn_assert_athlete_owner(p_athlete_id);` no topo de cada uma.
CREATE OR REPLACE FUNCTION public.fn_assert_athlete_owner(p_athlete_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND a.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.athlete_auth_link al WHERE al.athlete_id = p_athlete_id AND al.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.athletes a
    JOIN auth.users u ON u.email = a.email
    WHERE a.id = p_athlete_id AND u.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_assert_athlete_owner(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_assert_athlete_owner(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_assert_athlete_owner(uuid) TO authenticated;;
