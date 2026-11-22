-- The already-published wizard required a consent checkbox before sending photos,
-- but did not send a separate boolean. Keep that contract during rollout and
-- record its provenance. Legacy calls can never grant professional sharing.
ALTER TABLE public.student_photos ADD COLUMN IF NOT EXISTS consent_source text NOT NULL DEFAULT 'legacy_unrecorded';
DO $$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef('public.fn_salvar_avaliacao_guiada_v2(uuid,jsonb,boolean,date)'::regprocedure) INTO v_def;
 IF strpos(v_def,'photo_consent_required')=0 THEN RAISE EXCEPTION 'photo_rollout_anchor_missing'; END IF;
 v_def:=replace(v_def,'IF jsonb_array_length(v_fotos)>0 AND coalesce((p_data->>''photo_consent'')::boolean,false) IS NOT TRUE',
 'IF jsonb_array_length(v_fotos)>0 AND p_data ? ''photo_consent'' AND coalesce((p_data->>''photo_consent'')::boolean,false) IS NOT TRUE');
 v_def:=replace(v_def,'taken_date,consented_at,share_with_coach)', 'taken_date,consented_at,share_with_coach,consent_source)');
 v_def:=replace(v_def,'now(),coalesce((p_data->>''share_photos_with_coach'')::boolean,false)',
 'now(),(coalesce((p_data->>''photo_consent'')::boolean,false) AND coalesce((p_data->>''share_photos_with_coach'')::boolean,false)),CASE WHEN p_data ? ''photo_consent'' THEN ''explicit_v1'' ELSE ''legacy_wizard_checkbox'' END');
 EXECUTE v_def;
END $$;
NOTIFY pgrst,'reload schema';
