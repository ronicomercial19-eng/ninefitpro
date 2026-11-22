-- Achado 15/09: dev sênior criou uma segunda versão de fn_registrar_peso_avulso
-- (com parâmetro p_gordura extra + checagem de auth.uid()) sem remover a
-- versão antiga (3 parâmetros) — ficou ambíguo, qualquer chamada com só
-- (athlete_id, peso) falha com "function is not unique". Remove a versão
-- antiga, mantém só a nova (estritamente melhor: tem autorização e aceita
-- gordura opcional).

DROP FUNCTION IF EXISTS public.fn_registrar_peso_avulso(uuid, numeric, date);;
