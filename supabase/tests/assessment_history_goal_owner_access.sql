BEGIN;
DO $test$
DECLARE a uuid; u uuid; v_goal_id uuid; cnt int;
BEGIN
 SELECT x.id,x.user_id INTO a,u FROM athletes x WHERE x.user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM athlete_auth_link l WHERE l.athlete_id=x.id AND l.user_id=x.user_id) ORDER BY x.id LIMIT 1;
 IF a IS NULL THEN RAISE EXCEPTION 'Need direct-owner case'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 INSERT INTO public.metas_progresso(athlete_id,titulo,metrica,valor_inicial,valor_atual,valor_meta,unidade,status) VALUES(a,'QA rollback - goal','peso',80,80,75,'kg','ativa') RETURNING metas_progresso.id INTO v_goal_id;
 UPDATE public.metas_progresso SET valor_atual=79 WHERE metas_progresso.id=v_goal_id;
 SELECT count(*) INTO cnt FROM public.metas_progresso m WHERE m.id=v_goal_id AND valor_atual=79;
 IF cnt<>1 THEN RAISE EXCEPTION 'Direct owner goal write/read failed'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','is_anonymous',true)::text,true);
 IF public.fn_assessment_can_read(a) THEN RAISE EXCEPTION 'Anonymous sign-in accepted'; END IF;
 RESET ROLE;
END;
$test$;
SELECT 'direct owner goals CRUD and anonymous sign-in denial: PASS (rollback)' result;

ROLLBACK;
