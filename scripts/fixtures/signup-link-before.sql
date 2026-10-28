CREATE OR REPLACE FUNCTION public.auto_link_athlete_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_athlete_id uuid;
BEGIN
  SELECT id INTO v_athlete_id
  FROM public.athletes
  WHERE email = NEW.email
  AND (user_id IS NULL OR user_id != NEW.id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_athlete_id IS NOT NULL THEN
    UPDATE public.athletes
    SET user_id = NEW.id, activated = true
    WHERE id = v_athlete_id;

    BEGIN
      DELETE FROM public.athlete_auth_link
      WHERE athlete_id = v_athlete_id OR user_id = NEW.id;

      INSERT INTO public.athlete_auth_link (athlete_id, user_id)
      VALUES (v_athlete_id, NEW.id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN NEW;
END;
$function$
