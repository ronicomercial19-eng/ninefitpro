-- QA Fase F (16/09): OSDashboard.tsx (Ranking Global) fazia
-- select name,total_xp direto em athletes, mas a RLS de athletes só permite
-- ver a própria linha (athlete_own_record: user_id=auth.uid()) — nenhuma
-- política deixa um atleta ver o XP de outro. Na prática, o "Ranking Global"
-- nunca mostrou concorrentes reais pra ninguém, só a própria linha do
-- chamador (quando batia). Função dedicada, deliberadamente pública dentro
-- do app (expõe só nome + xp, nada sensível), pra sustentar um leaderboard
-- de verdade.
CREATE OR REPLACE FUNCTION public.fn_get_leaderboard(p_limit integer DEFAULT 20)
 RETURNS TABLE(name text, total_xp integer)
 LANGUAGE sql
 SECURITY DEFINER
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT a.name, COALESCE(a.total_xp, 0) AS total_xp
  FROM public.athletes a
  WHERE a.is_test_account = false
  ORDER BY COALESCE(a.total_xp, 0) DESC
  LIMIT p_limit;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_get_leaderboard(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_get_leaderboard(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_leaderboard(integer) TO authenticated;;
