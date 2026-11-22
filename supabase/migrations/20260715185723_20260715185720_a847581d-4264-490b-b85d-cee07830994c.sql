-- Ensure a single, unambiguous overload of sync_fitpro_planejamento exists
-- and force PostgREST to reload its schema cache.

-- Drop any legacy single-arg overload that might linger causing
-- "function public.sync_fitpro_planejamento(uuid) is not unique"
DROP FUNCTION IF EXISTS public.sync_fitpro_planejamento(uuid);

-- The two-arg version (with default) already exists from the previous migration.
-- Re-grant to make sure privileges are correct.
GRANT EXECUTE ON FUNCTION public.sync_fitpro_planejamento(uuid, text)
  TO authenticated, service_role;

-- Force PostgREST to reload its schema cache so the RPC resolves cleanly.
NOTIFY pgrst, 'reload schema';;
