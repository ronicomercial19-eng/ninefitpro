-- Escrita: "Registrar meu peso hoje (entre avaliações)" do print. Reaproveita
-- avaliacoes_unificadas (já é a fonte de tendência/histórico) com uma origem
-- própria para não confundir com avaliação completa do professor.
-- trg_resolve_athlete_id_avaliacoes já cobre a resolução de identidade
-- automaticamente neste insert, sem trabalho extra.

CREATE OR REPLACE FUNCTION public.fn_registrar_peso_avulso(p_athlete_id uuid, p_peso numeric, p_data date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF p_peso IS NULL OR p_peso <= 0 THEN
    RAISE EXCEPTION 'Peso inválido';
  END IF;

  INSERT INTO public.avaliacoes_unificadas (athlete_id, aluno_id, origem, data_avaliacao, peso)
  VALUES (p_athlete_id, NULL, 'peso_avulso', p_data, p_peso)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;;
