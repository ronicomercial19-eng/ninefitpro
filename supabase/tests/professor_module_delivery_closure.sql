-- Append after professor_student_workspace.sql in the same BEGIN/ROLLBACK.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',coach_a::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',coach_a,'role','authenticated','is_anonymous',false)::text,true) FROM qa_workspace;
DO $$ DECLARE v uuid:=gen_random_uuid();e uuid;payload jsonb;BEGIN
 SELECT id INTO e FROM qa_exercise;payload:=jsonb_build_array(jsonb_build_object('exercise_id',e,'sets',3,'reps_range','8-12','rest_seconds',60));
 INSERT INTO public.reference_series(id,name,exercises,created_by)VALUES(v,'QA reference',payload,(SELECT coach_a FROM qa_workspace));
 IF NOT EXISTS(SELECT 1 FROM public.reference_series WHERE id=v)THEN RAISE EXCEPTION 'template_not_visible';END IF;
 INSERT INTO public.super_sets(name,exercises,created_by)VALUES('QA super',payload||payload,(SELECT coach_a FROM qa_workspace));
 IF NOT EXISTS(SELECT 1 FROM public.super_sets WHERE name='QA super' AND created_by=(SELECT coach_a FROM qa_workspace)AND exercise_count=2)THEN RAISE EXCEPTION 'super_set_count_not_derived';END IF;
 BEGIN INSERT INTO public.reference_series(name,exercises,created_by)VALUES('QA empty','[]',(SELECT coach_a FROM qa_workspace));RAISE EXCEPTION 'empty_template_allowed';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'template_requires_exercises' THEN RAISE;END IF;END;
 BEGIN PERFORM public.fn_save_api_connector('qa_forbidden','QA','https://example.com','apikey',NULL,'qa-not-real');RAISE EXCEPTION 'staff_saved_global_secret';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.fn_review_ninefit_template(gen_random_uuid(),'draft');RAISE EXCEPTION 'staff_changed_admin_model';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 IF has_function_privilege('authenticated','public.fn_connector_vault_secret(text)','EXECUTE')THEN RAISE EXCEPTION 'client_can_read_secrets';END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',coach_b::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',coach_b,'role','authenticated','is_anonymous',false)::text,true) FROM qa_workspace;
DO $$ BEGIN UPDATE public.reference_series SET name='QA stolen' WHERE created_by=(SELECT coach_a FROM qa_workspace);IF FOUND THEN RAISE EXCEPTION 'foreign_template_modified';END IF;END $$;
SELECT set_config('request.jwt.claim.sub',student_user::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',student_user,'role','authenticated','is_anonymous',false)::text,true) FROM qa_workspace;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.reference_series) OR EXISTS(SELECT 1 FROM public.super_sets)THEN RAISE EXCEPTION 'student_can_read_professional_models';END IF;END $$;
RESET ROLE;
UPDATE public.profiles SET role='admin' WHERE user_id=(SELECT coach_b FROM qa_workspace);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',coach_b::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',coach_b,'role','authenticated','is_anonymous',false)::text,true) FROM qa_workspace;
DO $$ DECLARE v uuid:=gen_random_uuid();k text:='qa_'||replace(v::text,'-','');r jsonb;BEGIN
 INSERT INTO public.skills(id,slug,name,category,status,content,version)VALUES(v,k,'QA atomic skill','general','active','{}',1);
 IF(SELECT count(*) FROM public.skill_activations WHERE skill_id=v AND scope='global' AND active)<>1 THEN RAISE EXCEPTION 'activation_not_atomic';END IF;
 UPDATE public.skills SET status='draft' WHERE id=v;
 IF EXISTS(SELECT 1 FROM public.skill_activations WHERE skill_id=v AND active)THEN RAISE EXCEPTION 'activation_not_disabled';END IF;
 UPDATE public.skills SET status='active' WHERE id=v;
 UPDATE public.skills SET content='{"qa":"new"}',version=1 WHERE id=v;
 IF(SELECT version FROM public.skills WHERE id=v)<2 THEN RAISE EXCEPTION 'skill_version_did_not_change';END IF;
 IF(SELECT count(*) FROM public.skill_activations WHERE skill_id=v AND scope='global')<>1 THEN RAISE EXCEPTION 'activation_duplicated';END IF;
 DELETE FROM public.skills WHERE id=v;
 IF EXISTS(SELECT 1 FROM public.skill_activations WHERE skill_id=v)THEN RAISE EXCEPTION 'activation_not_removed';END IF;
 r:=public.fn_save_api_connector(k,'QA','https://example.com','apikey',NULL,'qa-not-a-real-secret');
 IF NOT(r->>'saved')::boolean THEN RAISE EXCEPTION 'connector_not_saved';END IF;
 PERFORM public.fn_save_api_connector(k,'QA','https://example.com','apikey',NULL,'qa-rotated-fake-secret');
END $$;
RESET ROLE;
DO $$ DECLARE k text;BEGIN
 SELECT key INTO k FROM public.api_connectors WHERE provider='QA' AND key LIKE 'qa_%' ORDER BY created_at DESC LIMIT 1;
 IF public.fn_connector_vault_secret(k) IS DISTINCT FROM 'qa-rotated-fake-secret' THEN RAISE EXCEPTION 'vault_secret_not_rotated';END IF;
END $$;
SELECT jsonb_build_object('templates_store_exercises',true,'derived_super_count',true,'empty_template_blocked',true,'foreign_model_write_blocked',true,'student_models_hidden',true,'skill_activation_atomic',true,'skill_deactivation_atomic',true,'skill_activation_not_duplicated',true,'skill_delete_cleans_activation',true,'connector_admin_only',true,'secret_hidden_from_browser',true,'vault_rotation',true,'model_review_admin_only',true,'skill_version_monotonic',true) module_checks;
