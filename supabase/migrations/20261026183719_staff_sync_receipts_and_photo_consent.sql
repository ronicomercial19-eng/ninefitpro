ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS staff_status text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS staff_synced_at timestamptz;
CREATE OR REPLACE FUNCTION public.fn_record_staff_sync(p_appointment_id uuid,p_booking_id text,p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row public.appointments;v_user uuid;
BEGIN
 IF p_status NOT IN ('pendente','confirmado','rejeitado','cancelado','concluido') OR nullif(p_booking_id,'') IS NULL THEN RAISE EXCEPTION 'invalid_staff_receipt'; END IF;
 SELECT * INTO v_row FROM public.appointments WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND OR v_row.staff_professional_id IS NULL THEN RAISE EXCEPTION 'staff_appointment_required'; END IF;
 IF v_row.staff_booking_id IS NOT NULL AND v_row.staff_booking_id<>p_booking_id THEN RAISE EXCEPTION 'staff_receipt_conflict'; END IF;
 UPDATE public.appointments SET staff_booking_id=p_booking_id,staff_status=p_status,staff_synced_at=now(),integration_status='sent' WHERE id=p_appointment_id;
 IF v_row.staff_status IS DISTINCT FROM p_status THEN
  SELECT coalesce(a.user_id,(SELECT l.user_id FROM public.athlete_auth_link l WHERE l.athlete_id=a.id LIMIT 1)) INTO v_user FROM public.athletes a WHERE a.id=v_row.student_id;
  IF v_user IS NOT NULL THEN
   INSERT INTO public.notifications(user_id,title,message,type,action_url,related_id,related_table)
   VALUES(v_user,'Reserva Staff atualizada','Status da sua reserva: '||p_status||'.','info','/9fit/aulas-creditos?tab=schedule',p_appointment_id,'appointments');
  END IF;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.fn_record_staff_sync(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_record_staff_sync(uuid,text,text) TO service_role;

ALTER TABLE public.student_photos ADD COLUMN IF NOT EXISTS consented_at timestamptz;
ALTER TABLE public.student_photos ADD COLUMN IF NOT EXISTS share_with_coach boolean NOT NULL DEFAULT false;
-- Legacy photos remain private; lack of a consent record never implies sharing.
DROP POLICY IF EXISTS "FitPro linked photo read" ON public.student_photos;
DROP POLICY IF EXISTS "FitPro linked photo insert" ON public.student_photos;
DROP POLICY IF EXISTS "FitPro linked photo delete" ON public.student_photos;
CREATE POLICY "FitPro consent photo read" ON public.student_photos FOR SELECT TO authenticated USING(
 athlete_id=(SELECT public.fn_current_athlete_id()) OR (share_with_coach AND consented_at IS NOT NULL AND private.fitpro_can_manage_athlete(athlete_id)));
CREATE POLICY "FitPro owner photo insert" ON public.student_photos FOR INSERT TO authenticated WITH CHECK(
 athlete_id=(SELECT public.fn_current_athlete_id()) AND photo_url LIKE athlete_id::text||'/%' AND consented_at IS NOT NULL);
CREATE POLICY "FitPro owner photo delete" ON public.student_photos FOR DELETE TO authenticated USING(athlete_id=(SELECT public.fn_current_athlete_id()));
CREATE POLICY "FitPro owner photo sharing" ON public.student_photos FOR UPDATE TO authenticated
 USING(athlete_id=(SELECT public.fn_current_athlete_id())) WITH CHECK(athlete_id=(SELECT public.fn_current_athlete_id()) AND photo_url LIKE athlete_id::text||'/%');
GRANT UPDATE(share_with_coach) ON public.student_photos TO authenticated;

DROP POLICY IF EXISTS "FitPro student photo read" ON storage.objects;
DROP POLICY IF EXISTS "FitPro student photo upload" ON storage.objects;
DROP POLICY IF EXISTS "FitPro student photo delete" ON storage.objects;
CREATE POLICY "FitPro consent storage read" ON storage.objects FOR SELECT TO authenticated USING(
 bucket_id='student-photos' AND (
 (storage.foldername(name))[1]=(SELECT public.fn_current_athlete_id())::text OR
 EXISTS(SELECT 1 FROM public.student_photos p WHERE p.photo_url=name AND p.share_with_coach AND p.consented_at IS NOT NULL AND private.fitpro_can_manage_athlete(p.athlete_id))));
CREATE POLICY "FitPro owner storage upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK(
 bucket_id='student-photos' AND (storage.foldername(name))[1]=(SELECT public.fn_current_athlete_id())::text);
CREATE POLICY "FitPro owner storage delete" ON storage.objects FOR DELETE TO authenticated USING(
 bucket_id='student-photos' AND (storage.foldername(name))[1]=(SELECT public.fn_current_athlete_id())::text);

DO $patch$
DECLARE v_def text;v_anchor text:='  -- registra as fotos no histórico do atleta (bucket privado student-photos)';
BEGIN
 SELECT pg_get_functiondef('public.fn_salvar_avaliacao_guiada_v2(uuid,jsonb,boolean,date)'::regprocedure) INTO v_def;
 IF strpos(v_def,v_anchor)=0 THEN RAISE EXCEPTION 'photo_consent_patch_anchor_missing'; END IF;
 v_def:=replace(v_def,v_anchor,$guard$
 IF jsonb_array_length(v_fotos)>0 AND coalesce((p_data->>'photo_consent')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'photo_consent_required'; END IF;
 $guard$||v_anchor);
 v_def:=replace(v_def,'(athlete_id, photo_url, photo_type, photo_category, description, taken_date)',
 '(athlete_id, photo_url, photo_type, photo_category, description, taken_date,consented_at,share_with_coach)');
 v_def:=replace(v_def,'''Avaliação guiada'', p_data_avaliacao',
 '''Avaliação guiada'', p_data_avaliacao,now(),coalesce((p_data->>''share_photos_with_coach'')::boolean,false)');
 EXECUTE v_def;
END $patch$;
NOTIFY pgrst,'reload schema';
