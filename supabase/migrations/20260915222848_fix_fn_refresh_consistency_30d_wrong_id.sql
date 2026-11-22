-- Achado 15/09: fn_refresh_consistency_30d (trigger em ninefit_checkins,
-- outro dev) usava NEW.aluno_id como se fosse athletes.id — mesmo padrão
-- de bug já corrigido em fn_notify_avaliacao_pronta e trg_resolver_aluno_id.
-- ninefit_checkins já tem coluna athlete_id própria; corrigido para usá-la
-- diretamente, sem depender de aluno_id. Tabela estava vazia (0 linhas) —
-- bug latente, sem dado poluído ainda.

CREATE OR REPLACE FUNCTION public.fn_refresh_consistency_30d()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_athlete_id uuid;
  v_auth_user uuid;
  v_pct numeric;
BEGIN
  v_athlete_id := NEW.athlete_id;
  IF v_athlete_id IS NULL THEN RETURN NEW; END IF;

  SELECT user_id INTO v_auth_user FROM athletes WHERE id = v_athlete_id;
  IF v_auth_user IS NULL THEN RETURN NEW; END IF;

  SELECT (count(DISTINCT date_trunc('day', created_at)) * 100.0 / 30.0)
    INTO v_pct
  FROM public.ninefit_checkins
  WHERE athlete_id = v_athlete_id AND created_at >= now() - interval '30 days';

  INSERT INTO public.user_parameters (user_id, consistency_30d)
    VALUES (v_auth_user, COALESCE(v_pct,0))
    ON CONFLICT (user_id) DO UPDATE SET consistency_30d = EXCLUDED.consistency_30d, updated_at = now();

  RETURN NEW;
END;
$function$;;
