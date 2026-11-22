-- QA Fase F (16/09): mesmo bug do Ranking Global (OSDashboard.tsx) achado
-- também em Social.tsx (aba Comunidade > Ranking) — select direto em
-- athletes bloqueado pela RLS pra qualquer atleta que não seja o próprio
-- dono da linha. Estende fn_get_leaderboard com "id" e "level" (Social.tsx
-- usa os dois) em vez de criar uma segunda função.
DROP FUNCTION public.fn_get_leaderboard(integer);

CREATE OR REPLACE FUNCTION public.fn_get_leaderboard(p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, total_xp integer, level integer)
 LANGUAGE sql
 SECURITY DEFINER
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT a.id, a.name, COALESCE(a.total_xp, 0) AS total_xp, COALESCE(a.level, 1) AS level
  FROM public.athletes a
  WHERE a.is_test_account = false
    AND COALESCE(a.total_xp, 0) > 0
  ORDER BY COALESCE(a.total_xp, 0) DESC
  LIMIT p_limit;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_get_leaderboard(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_get_leaderboard(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_leaderboard(integer) TO authenticated;;
