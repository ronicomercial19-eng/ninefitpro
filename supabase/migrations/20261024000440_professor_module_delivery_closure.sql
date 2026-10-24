-- Complete reusable training models and atomic Skill publication.
CREATE OR REPLACE FUNCTION private.fitpro_staff_active() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL
 AND NOT coalesce(((SELECT auth.jwt())->>'is_anonymous')::boolean,false)
 AND coalesce(private.fitpro_actor_role() IN('professor','trainer','admin','super_admin'),false)
$$;
REVOKE ALL ON FUNCTION private.fitpro_staff_active() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.fitpro_staff_active() TO authenticated;

CREATE OR REPLACE FUNCTION private.validate_training_template() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE e jsonb; v uuid; n integer;
BEGIN
 IF nullif(btrim(NEW.name),'') IS NULL OR length(NEW.name)>120 OR jsonb_typeof(NEW.exercises) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_template'; END IF;
 n:=jsonb_array_length(NEW.exercises);
 IF n NOT BETWEEN 1 AND 40 OR (TG_TABLE_NAME='super_sets' AND n<2) THEN RAISE EXCEPTION 'template_requires_exercises'; END IF;
 FOR e IN SELECT value FROM jsonb_array_elements(NEW.exercises) LOOP
  v:=(e->>'exercise_id')::uuid;
  IF v IS NULL OR NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=v)
    OR (e->>'sets') IS NULL OR (e->>'sets') !~ '^\d+$' OR (e->>'sets')::integer NOT BETWEEN 1 AND 20
    OR nullif(btrim(e->>'reps_range'),'') IS NULL OR length(e->>'reps_range')>80
    OR (e->>'rest_seconds') IS NULL OR (e->>'rest_seconds') !~ '^\d+$' OR (e->>'rest_seconds')::integer NOT BETWEEN 0 AND 600
    OR length(coalesce(e->>'notes',''))>1000 THEN RAISE EXCEPTION 'invalid_template_exercise'; END IF;
 END LOOP;
 IF TG_OP='UPDATE' AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'template_owner_immutable'; END IF;
 IF TG_TABLE_NAME='super_sets' THEN NEW.exercise_count:=n; END IF;
 NEW.updated_at:=clock_timestamp(); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.validate_training_template() FROM PUBLIC;
CREATE TRIGGER validate_super_set BEFORE INSERT OR UPDATE ON public.super_sets FOR EACH ROW EXECUTE FUNCTION private.validate_training_template();
CREATE TRIGGER validate_reference_series BEFORE INSERT OR UPDATE ON public.reference_series FOR EACH ROW EXECUTE FUNCTION private.validate_training_template();
DROP POLICY IF EXISTS "Trainers can manage super_sets" ON public.super_sets;
DROP POLICY IF EXISTS "Authenticated read reference series" ON public.reference_series;
DROP POLICY IF EXISTS "Owner manage reference series" ON public.reference_series;
CREATE POLICY training_models_read ON public.super_sets FOR SELECT TO authenticated USING(private.fitpro_staff_active());
CREATE POLICY training_models_write ON public.super_sets FOR ALL TO authenticated
 USING(private.fitpro_staff_active() AND(created_by=(SELECT auth.uid()) OR private.fitpro_actor_role() IN('admin','super_admin')))
 WITH CHECK(private.fitpro_staff_active() AND(created_by=(SELECT auth.uid()) OR private.fitpro_actor_role() IN('admin','super_admin')));
CREATE POLICY reference_models_read ON public.reference_series FOR SELECT TO authenticated USING(private.fitpro_staff_active());
CREATE POLICY reference_models_write ON public.reference_series FOR ALL TO authenticated
 USING(private.fitpro_staff_active() AND(created_by=(SELECT auth.uid()) OR private.fitpro_actor_role() IN('admin','super_admin')))
 WITH CHECK(private.fitpro_staff_active() AND(created_by=(SELECT auth.uid()) OR private.fitpro_actor_role() IN('admin','super_admin')));

CREATE OR REPLACE FUNCTION private.sync_global_skill_activation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' THEN DELETE FROM public.skill_activations WHERE skill_id=OLD.id; RETURN OLD; END IF;
 UPDATE public.skill_activations SET active=(NEW.status='active'),activated_by=(SELECT auth.uid()),activated_at=now()
 WHERE skill_id=NEW.id AND scope='global' AND target_id IS NULL;
 IF NOT FOUND THEN INSERT INTO public.skill_activations(skill_id,scope,active,activated_by) VALUES(NEW.id,'global',NEW.status='active',(SELECT auth.uid())); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.sync_global_skill_activation() FROM PUBLIC;
CREATE TRIGGER global_skill_lifecycle AFTER INSERT OR UPDATE OF status ON public.skills FOR EACH ROW EXECUTE FUNCTION private.sync_global_skill_activation();
CREATE TRIGGER global_skill_removal BEFORE DELETE ON public.skills FOR EACH ROW EXECUTE FUNCTION private.sync_global_skill_activation();
CREATE OR REPLACE FUNCTION private.skill_content_version() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF ROW(NEW.content,NEW.description,NEW.name,NEW.category,NEW.tags) IS DISTINCT FROM ROW(OLD.content,OLD.description,OLD.name,OLD.category,OLD.tags) THEN NEW.version:=greatest(coalesce(NEW.version,1),coalesce(OLD.version,1)+1); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.skill_content_version() FROM PUBLIC;
CREATE TRIGGER skill_content_version BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION private.skill_content_version();
-- Existing rows retain their content and status; reconcile only stale activation flags.
UPDATE public.skill_activations a SET active=(s.status='active') FROM public.skills s WHERE a.skill_id=s.id AND a.scope='global' AND a.target_id IS NULL;
INSERT INTO public.skill_activations(skill_id,scope,active)
 SELECT s.id,'global',s.status='active' FROM public.skills s WHERE NOT EXISTS(SELECT 1 FROM public.skill_activations a WHERE a.skill_id=s.id AND a.scope='global' AND a.target_id IS NULL);

DROP POLICY IF EXISTS "Trainers manage library" ON public.library_items;
CREATE POLICY staff_manage_library ON public.library_items FOR ALL TO authenticated
 USING(private.fitpro_staff_active()) WITH CHECK(private.fitpro_staff_active());

-- API keys are encrypted by Vault, never stored as pretend environment references.
CREATE OR REPLACE FUNCTION public.fn_save_api_connector(p_key text,p_provider text,p_endpoint text,p_auth_mode text,p_iframe_url text,p_api_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_existing public.api_connectors; v_secret uuid; v_ref text; v_config jsonb;
BEGIN
 IF NOT private.fitpro_staff_active() OR private.fitpro_actor_role() NOT IN('admin','super_admin') THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501'; END IF;
 IF p_key !~ '^[a-z][a-z0-9_-]{1,80}$' OR p_auth_mode NOT IN('none','apikey','oauth','iframe_sso') OR p_auth_mode IS NULL THEN RAISE EXCEPTION 'invalid_connector'; END IF;
 IF p_endpoint IS NOT NULL AND p_endpoint !~ '^https://[^/@[:space:]]+' THEN RAISE EXCEPTION 'https_endpoint_required'; END IF;
 IF p_iframe_url IS NOT NULL AND p_iframe_url !~ '^https://[^/@[:space:]]+' THEN RAISE EXCEPTION 'https_iframe_required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('connector:'||p_key,0));
 SELECT * INTO v_existing FROM public.api_connectors WHERE key=p_key FOR UPDATE;
 v_ref:=v_existing.secret_ref; v_config:=coalesce(v_existing.config,'{}'::jsonb);
 IF p_key='healthflix' THEN v_config:=v_config||'{"api_key_header":"x-api-key","api_key_prefix":""}'::jsonb; END IF;
 IF nullif(p_api_key,'') IS NOT NULL THEN
  IF length(p_api_key)>8192 THEN RAISE EXCEPTION 'invalid_api_key'; END IF;
  IF v_ref LIKE 'vault:%' THEN v_secret:=substring(v_ref FROM 7)::uuid; END IF;
  IF v_secret IS NULL THEN v_secret:=vault.create_secret(p_api_key,'fitpro.connector.'||p_key,'FitPro connector secret');
  ELSE PERFORM vault.update_secret(v_secret,p_api_key); END IF;
  v_ref:='vault:'||v_secret; v_config:=v_config||jsonb_build_object('apikey_hint',right(p_api_key,4));
 END IF;
 IF p_auth_mode='apikey' AND v_ref IS NULL THEN RAISE EXCEPTION 'api_key_required'; END IF;
 INSERT INTO public.api_connectors(key,provider,endpoint,auth_mode,iframe_url,status,secret_ref,config)
 VALUES(p_key,p_provider,p_endpoint,p_auth_mode,p_iframe_url,'active',v_ref,v_config)
 ON CONFLICT(key) DO UPDATE SET provider=excluded.provider,endpoint=excluded.endpoint,auth_mode=excluded.auth_mode,iframe_url=excluded.iframe_url,status='active',secret_ref=excluded.secret_ref,config=excluded.config,updated_at=now();
 RETURN jsonb_build_object('saved',true,'key',p_key);
END $$;
REVOKE ALL ON FUNCTION public.fn_save_api_connector(text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_save_api_connector(text,text,text,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_connector_vault_secret(p_key text) RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT d.decrypted_secret FROM public.api_connectors c JOIN vault.decrypted_secrets d ON c.secret_ref='vault:'||d.id::text WHERE c.key=p_key AND c.status='active'
$$;
REVOKE ALL ON FUNCTION public.fn_connector_vault_secret(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_connector_vault_secret(text) TO service_role;

DROP POLICY IF EXISTS "offers writable by admin" ON public.monetization_offers;
CREATE POLICY offers_admin_manage ON public.monetization_offers FOR ALL TO authenticated
 USING(private.fitpro_staff_active() AND private.fitpro_actor_role() IN('admin','super_admin'))
 WITH CHECK(private.fitpro_staff_active() AND private.fitpro_actor_role() IN('admin','super_admin'));
DROP POLICY IF EXISTS "Staff manage NineFit template library" ON public.ninefit_template_library;
CREATE POLICY staff_read_ninefit_models ON public.ninefit_template_library FOR SELECT TO authenticated USING(private.fitpro_staff_active());
CREATE POLICY admin_manage_ninefit_models ON public.ninefit_template_library FOR ALL TO authenticated
 USING(private.fitpro_staff_active() AND private.fitpro_actor_role() IN('admin','super_admin'))
 WITH CHECK(private.fitpro_staff_active() AND private.fitpro_actor_role() IN('admin','super_admin'));
CREATE OR REPLACE FUNCTION public.fn_review_ninefit_template(p_template_id uuid,p_status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT private.fitpro_staff_active() OR private.fitpro_actor_role() NOT IN('admin','super_admin') THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501'; END IF;
 IF p_status IS NULL OR p_status NOT IN('draft','approved','archived') THEN RAISE EXCEPTION 'invalid_template_status'; END IF;
 UPDATE public.ninefit_template_library SET status=p_status,updated_at=now(),metadata=jsonb_set(coalesce(metadata,'{}'::jsonb),'{reviewed_by}',to_jsonb((SELECT auth.uid())::text),true) WHERE id=p_template_id;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.fn_review_ninefit_template(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_review_ninefit_template(uuid,text) TO authenticated;
