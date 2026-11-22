-- QA (14/09): metas_progresso.aluno_id é NOT NULL sem default/trigger, mas o
-- botão "Nova meta" (MetasSection.tsx) só conhece athlete_id (via useAthleteId)
-- e nunca preenche aluno_id — toda criação de meta falhava com violação de
-- not-null constraint. Confirmado com insert de teste reproduzindo o erro
-- exato. Corrigido alinhando com o padrão já usado em avaliacoes_unificadas,
-- onde aluno_id é opcional e athlete_id é a chave canônica.
ALTER TABLE public.metas_progresso ALTER COLUMN aluno_id DROP NOT NULL;;
