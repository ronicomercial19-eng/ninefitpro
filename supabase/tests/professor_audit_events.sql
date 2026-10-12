-- Run after professor_access_boundaries.sql in the same BEGIN/ROLLBACK transaction.
UPDATE public.athletes SET user_id=NULL WHERE id=(SELECT athlete_a FROM qa_professor_ids);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.fitpro_audit_events WHERE entity_type='athletes' AND operation='UPDATE') THEN
    RAISE EXCEPTION 'Athlete change was not audited';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fitpro_audit_events WHERE old_fields ? 'email' OR new_fields ? 'email' OR new_fields ? 'name') THEN
    RAISE EXCEPTION 'Audit copied personal content';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',coach_a::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.fitpro_audit_events) THEN
    RAISE EXCEPTION 'Coach can read global audit';
  END IF;
  BEGIN
    INSERT INTO public.fitpro_audit_events (actor_source,entity_type,entity_id,operation)
    VALUES ('user','athletes','forged','UPDATE');
    RAISE EXCEPTION 'Client forged audit event';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SELECT set_config('request.jwt.claim.sub',admin_user::text,true) FROM qa_professor_ids;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.fitpro_audit_events WHERE entity_type='athletes') THEN
    RAISE EXCEPTION 'Admin cannot inspect audit';
  END IF;
END $$;
RESET ROLE;
