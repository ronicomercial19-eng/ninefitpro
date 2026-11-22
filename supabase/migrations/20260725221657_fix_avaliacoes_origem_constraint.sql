
-- Adiciona 'avaliacao_guiada' e 'fitpro' como origens válidas
ALTER TABLE avaliacoes_unificadas 
  DROP CONSTRAINT avaliacoes_unificadas_origem_check;

ALTER TABLE avaliacoes_unificadas 
  ADD CONSTRAINT avaliacoes_unificadas_origem_check 
  CHECK (origem = ANY (ARRAY[
    'base44'::text, 
    'manual'::text, 
    'importado'::text,
    'avaliacao_guiada'::text,
    'fitpro'::text,
    'coach'::text
  ]));
;
