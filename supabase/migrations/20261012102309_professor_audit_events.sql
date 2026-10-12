-- Server-authored, minimal audit trail for access and delivery changes.
CREATE TABLE IF NOT EXISTS public.fitpro_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  actor_source text NOT NULL CHECK (actor_source IN ('user','service')),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  old_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_fields jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_fitpro_audit_entity ON public.fitpro_audit_events(entity_type,entity_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitpro_audit_actor ON public.fitpro_audit_events(actor_user_id,occurred_at DESC);
ALTER TABLE public.fitpro_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fitpro_audit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.fitpro_audit_events TO authenticated;
CREATE POLICY "FitPro admins read audit" ON public.fitpro_audit_events FOR SELECT TO authenticated
USING ((SELECT private.fitpro_actor_role()) IN ('admin','super_admin'));

CREATE OR REPLACE FUNCTION private.fitpro_record_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_before jsonb := CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  v_after jsonb := CASE WHEN TG_OP='DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
  v_keys text[];
  v_old jsonb;
  v_new jsonb;
BEGIN
  v_keys := CASE TG_TABLE_NAME
    WHEN 'profiles' THEN ARRAY['role','is_active','status','subscription_expires_at','first_access_completed']
    WHEN 'athletes' THEN ARRAY['coach_id','user_id']
    WHEN 'appointments' THEN ARRAY['teacher_id','student_id','scheduled_at','status']
    WHEN 'student_training_assignments' THEN ARRAY['student_id','created_by','training_name']
    WHEN 'athlete_periodizations' THEN ARRAY['athlete_id','status','current_phase']
    WHEN 'fitpro_smartperiodizer_periodizations' THEN ARRAY['fitpro_student_id','status']
    WHEN 'postura_scans' THEN ARRAY['athlete_id','status']
    WHEN 'student_photos' THEN ARRAY['athlete_id']
    WHEN 'student_pdf_assessments' THEN ARRAY['student_id']
    WHEN 'user_assessments' THEN ARRAY['athlete_id']
    ELSE ARRAY[]::text[] END;
  SELECT COALESCE(jsonb_object_agg(k,v_before->k) FILTER (WHERE v_before ? k),'{}'::jsonb),
         COALESCE(jsonb_object_agg(k,v_after->k) FILTER (WHERE v_after ? k),'{}'::jsonb)
  INTO v_old,v_new FROM unnest(v_keys) AS k;
  IF TG_OP <> 'UPDATE' OR v_old IS DISTINCT FROM v_new THEN
    INSERT INTO public.fitpro_audit_events
      (actor_user_id,actor_source,entity_type,entity_id,operation,old_fields,new_fields)
    VALUES
      (auth.uid(),CASE WHEN auth.uid() IS NULL THEN 'service' ELSE 'user' END,
       TG_TABLE_NAME,COALESCE(v_after->>'id',v_before->>'id',v_after->>'user_id',v_before->>'user_id','unknown'),
       TG_OP,v_old,v_new);
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.fitpro_record_audit() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','athletes','appointments','student_training_assignments',
    'athlete_periodizations','fitpro_smartperiodizer_periodizations','postura_scans',
    'student_photos','student_pdf_assessments','user_assessments'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS fitpro_audit_change ON public.%I',t);
    EXECUTE format('CREATE TRIGGER fitpro_audit_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.fitpro_record_audit()',t);
  END LOOP;
END $$;

-- The legacy log accepted client-authored events, so it cannot attest to server changes.
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Admins podem ver audit log" ON public.audit_log;
CREATE POLICY "FitPro admins read legacy audit" ON public.audit_log FOR SELECT TO authenticated
USING ((SELECT private.fitpro_actor_role()) IN ('admin','super_admin'));
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.log_audit(text,text,text) FROM PUBLIC, anon, authenticated;
