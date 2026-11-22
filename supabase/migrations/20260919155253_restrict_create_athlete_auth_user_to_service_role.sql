-- create_athlete_auth_user é passo interno do fluxo de ativação (chamado por
-- edge function com service role) — não deveria ser chamável direto do
-- browser por ninguém, nem autenticado. Hoje anon/authenticated podiam
-- sobrescrever auto_password_temp/activated de QUALQUER atleta.
REVOKE EXECUTE ON FUNCTION public.create_athlete_auth_user(uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_athlete_auth_user(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_athlete_auth_user(uuid, text, text, text) FROM authenticated;;
