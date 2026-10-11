CREATE OR REPLACE FUNCTION public.complete_first_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  UPDATE public.profiles
    SET first_access_completed = true, updated_at = now()
    WHERE user_id = v_uid;
  UPDATE public.athletes
    SET password_changed = true, updated_at = now()
    WHERE user_id = v_uid;
END;
$function$;