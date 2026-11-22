-- QA 14/09: CheckinCorporalCard tentava completar o %gordura do check-in com um
-- UPDATE direto na tabela via client, mas não existe nenhuma policy de UPDATE
-- pra atleta em avaliacoes_unificadas — a RLS bloqueia silenciosamente (sem
-- erro visível pro usuário) e o campo nunca era salvo. Corrigido movendo a
-- gravação de %gordura pra dentro da própria função SECURITY DEFINER, que já
-- bypassa RLS por natureza.
CREATE OR REPLACE FUNCTION public.fn_registrar_peso_avulso(
  p_athlete_id uuid,
  p_peso numeric,
  p_data date DEFAULT CURRENT_DATE,
  p_gordura numeric DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND a.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.athlete_auth_link al WHERE al.athlete_id = p_athlete_id AND al.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_peso IS NULL OR p_peso <= 0 THEN
    RAISE EXCEPTION 'Peso inválido';
  END IF;

  INSERT INTO public.avaliacoes_unificadas (athlete_id, aluno_id, origem, data_avaliacao, peso, gordura_corporal)
  VALUES (p_athlete_id, NULL, 'peso_avulso', p_data, p_peso, p_gordura)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;;
