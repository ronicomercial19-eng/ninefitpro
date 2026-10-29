-- Keep the activation gate and login aligned with the existing canonical resolver.
-- No athlete/link is created, merged, transferred or deleted.
CREATE OR REPLACE VIEW public.vw_current_identity WITH (security_invoker=true) AS
SELECT p.user_id,p.email,p.full_name,p.role AS profile_role,p.is_active,p.first_access_completed,
       aal.athlete_id,ath.aluno_id,ath.coach_id,ath.name AS athlete_name,
       ath.email AS athlete_email,ath.activated AS athlete_activated,
       a.professor_id AS aluno_professor_id,a.nome AS aluno_name,a.email AS aluno_email,
       coalesce((SELECT jsonb_agg(jsonb_build_object('role',ur.role::text) ORDER BY ur.role::text)
                 FROM public.user_roles ur WHERE ur.user_id=p.user_id),'[]'::jsonb) AS roles
FROM public.profiles p
LEFT JOIN LATERAL (SELECT public.fn_current_athlete_id() AS athlete_id) aal ON true
LEFT JOIN public.athletes ath ON ath.id=aal.athlete_id
LEFT JOIN public.alunos a ON a.id=ath.aluno_id
WHERE p.user_id=auth.uid();
NOTIFY pgrst,'reload schema';
