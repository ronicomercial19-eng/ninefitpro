CREATE TABLE IF NOT EXISTS private.ninefit_customer_entry_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  coach_id uuid NOT NULL REFERENCES auth.users(id),
  enabled boolean NOT NULL DEFAULT true
);
REVOKE ALL ON private.ninefit_customer_entry_config FROM PUBLIC, anon, authenticated;
ALTER TABLE private.ninefit_customer_entry_config ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE v_coach uuid; v_count integer;
BEGIN
  SELECT count(*), min(user_id::text)::uuid INTO v_count, v_coach
  FROM public.profiles
  WHERE full_name='roni' AND role::text='admin' AND is_active=true;
  IF v_count<>1 THEN RAISE EXCEPTION 'ninefit_team_requires_unique_verified_owner'; END IF;
  INSERT INTO private.ninefit_customer_entry_config(singleton,coach_id)
  VALUES(true,v_coach) ON CONFLICT(singleton) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.fn_ensure_ninefit_customer()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_uid uuid:=auth.uid(); v_id uuid; v_coach uuid; v_email text; v_name text;
BEGIN
  IF v_uid IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN
    RAISE EXCEPTION 'verified_account_required' USING ERRCODE='42501';
  END IF;
  SELECT email,coalesce(nullif(raw_user_meta_data->>'full_name',''),nullif(raw_user_meta_data->>'name',''),'Atleta 9FIT')
  INTO v_email,v_name FROM auth.users WHERE id=v_uid AND email_confirmed_at IS NOT NULL;
  IF v_email IS NULL THEN RAISE EXCEPTION 'confirmed_email_required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=v_uid AND role::text='student' AND is_active=true) THEN
    RAISE EXCEPTION 'student_account_required' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ninefit_customer:'||v_uid::text,0));
  v_id:=public.fn_current_athlete_id();
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  -- Never reclaim an existing athlete by an email match.
  IF EXISTS(SELECT 1 FROM public.athletes WHERE lower(email)=lower(v_email)) THEN
    RAISE EXCEPTION 'existing_profile_requires_team_review' USING ERRCODE='42501';
  END IF;
  SELECT c.coach_id INTO v_coach FROM private.ninefit_customer_entry_config c
  JOIN public.profiles p ON p.user_id=c.coach_id
  WHERE c.singleton AND c.enabled AND p.is_active=true AND p.role::text IN('admin','professor','trainer');
  IF v_coach IS NULL THEN RAISE EXCEPTION 'ninefit_team_unavailable'; END IF;
  INSERT INTO public.athletes(coach_id,user_id,name,email,activated,password_changed)
  VALUES(v_coach,v_uid,left(v_name,120),v_email,true,true)
  RETURNING id INTO v_id;
  -- A self-created verified account already chose its credential or used OAuth.
  UPDATE public.profiles SET first_access_completed=true,updated_at=now() WHERE user_id=v_uid;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.fn_ensure_ninefit_customer() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_ensure_ninefit_customer() TO authenticated;
