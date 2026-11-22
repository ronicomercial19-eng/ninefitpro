-- Limpar dados fake (apenas em dev)
DELETE FROM planos_de_treino_gerados WHERE criado_em < now() - interval '90 days';
DELETE FROM periodizacoes_novas WHERE criado_em < now() - interval '90 days';

-- Tabela para controle de ambiente
CREATE TABLE IF NOT EXISTS ambiente_config (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

-- Tabela uploads_periodizacao
CREATE TABLE IF NOT EXISTS uploads_periodizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estudante_id uuid NOT NULL REFERENCES estudantes(id) ON DELETE CASCADE,
  arquivo_url text NOT NULL,
  nome_arquivo text,
  criado_em timestamptz DEFAULT now(),
  meta jsonb DEFAULT '{}'::jsonb
);

-- Adicionar colunas aos modelos de treino
ALTER TABLE modelos_de_treino 
ADD COLUMN IF NOT EXISTS estudante_id uuid,
ADD COLUMN IF NOT EXISTS objetivo text,
ADD COLUMN IF NOT EXISTS nivel text,
ADD COLUMN IF NOT EXISTS periodizacao jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS tag text DEFAULT 'manual';

-- Adicionar FK para estudante em planos gerados
ALTER TABLE planos_de_treino_gerados
ADD COLUMN IF NOT EXISTS estudante_id_ref uuid;

-- Procedure para gerar modelo de treino
CREATE OR REPLACE FUNCTION gerar_modelo_treino(
  p_estudante_id uuid,
  p_objetivo text,
  p_nivel text,
  p_periodizacao jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE(modelo_id uuid) AS $$
DECLARE
  novo_id uuid := gen_random_uuid();
BEGIN
  -- Valida estudante
  IF NOT EXISTS (SELECT 1 FROM estudantes WHERE id = p_estudante_id) THEN
    RAISE EXCEPTION 'Estudante não encontrado';
  END IF;

  -- Insere novo modelo
  INSERT INTO modelos_de_treino (id, estudante_id, objetivo, nivel, periodizacao, criado_em, tag, nome, descricao)
  VALUES (novo_id, p_estudante_id, p_objetivo, p_nivel, p_periodizacao, now(), 'gerado_programa', 
          CONCAT('Modelo ', p_objetivo, ' - ', p_nivel), 
          CONCAT('Modelo gerado para ', p_objetivo, ' nível ', p_nivel));

  RETURN QUERY SELECT novo_id;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS nas novas tabelas
ALTER TABLE ambiente_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads_periodizacao ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Everyone can view ambiente_config" ON ambiente_config FOR SELECT USING (true);
CREATE POLICY "Everyone can view uploads_periodizacao" ON uploads_periodizacao FOR SELECT USING (true);
CREATE POLICY "Everyone can manage uploads_periodizacao" ON uploads_periodizacao FOR ALL USING (true);;
