SET LOCAL lock_timeout='2s';
-- Existing auth trigger follows the function OID when moved to private.
ALTER FUNCTION public.auto_link_athlete_on_signup() SET SCHEMA private;
CREATE OR REPLACE FUNCTION private.auto_link_athlete_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target_text text:=NEW.raw_app_meta_data->>'fitpro_athlete_id';target_id uuid;a public.athletes;
BEGIN
 -- A user-editable athlete_id or a plain email match is never an invitation.
 IF NEW.is_anonymous IS TRUE OR NEW.email_confirmed_at IS NULL OR nullif(btrim(NEW.email),'') IS NULL
 OR target_text IS NULL OR target_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RETURN NEW;END IF;
 target_id:=target_text::uuid;
 PERFORM pg_advisory_xact_lock(hashtextextended('fitpro-athlete-identity:'||target_id::text,0));
 SELECT * INTO a FROM public.athletes WHERE id=target_id FOR UPDATE;
 IF NOT FOUND OR a.user_id IS NOT NULL OR a.is_test_account IS TRUE OR lower(btrim(a.email)) IS DISTINCT FROM lower(btrim(NEW.email)) THEN RETURN NEW;END IF;
 IF EXISTS(SELECT 1 FROM public.athlete_auth_link WHERE athlete_id=target_id OR user_id=NEW.id)
 OR EXISTS(SELECT 1 FROM public.athletes WHERE user_id=NEW.id) THEN RETURN NEW;END IF;
 BEGIN
  UPDATE public.athletes SET user_id=NEW.id,activated=true WHERE id=target_id AND user_id IS NULL;
  IF FOUND THEN
   INSERT INTO public.athlete_auth_link(athlete_id,user_id)VALUES(target_id,NEW.id) ON CONFLICT DO NOTHING;
   IF NOT EXISTS(SELECT 1 FROM public.athlete_auth_link WHERE athlete_id=target_id AND user_id=NEW.id) THEN RAISE EXCEPTION 'athlete_link_conflict' USING ERRCODE='23505';END IF;
  END IF;
 EXCEPTION WHEN unique_violation THEN
  -- Roll back this claim only. Leave a created account for administrative
  -- review rather than replacing another account's existing relationship.
  NULL;
 END;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.auto_link_athlete_on_signup() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER fitpro_link_confirmed_athlete
 AFTER UPDATE OF email_confirmed_at,email ON auth.users
 FOR EACH ROW WHEN(NEW.email_confirmed_at IS NOT NULL AND(OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at OR OLD.email IS DISTINCT FROM NEW.email))
 EXECUTE FUNCTION private.auto_link_athlete_on_signup();
