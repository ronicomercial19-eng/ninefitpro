-- Remove policy bypass que expunha nome+XP de todos os atletas para qualquer usuário autenticado,
-- sem filtro de organização/coach. Policies granulares corretas já existem (admin_all, 
-- athlete_own_record, coach_manage_own, service_role_all) e cobrem os casos legítimos.
DROP POLICY IF EXISTS "read_all_authenticated" ON public.athletes;;
