
-- Criar tabelas conforme especificação
CREATE TABLE IF NOT EXISTS estudantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    data_nascimento DATE,
    altura NUMERIC,
    peso NUMERIC,
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modelos_de_treino (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    duracao_em_semanas INT,
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercicios_novos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    grupo_muscular TEXT NOT NULL,
    video_url TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estruturas_de_treinamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modelo_id UUID REFERENCES modelos_de_treino(id) ON DELETE CASCADE,
    dia INT NOT NULL,
    ordem INT NOT NULL,
    exercicio_id UUID REFERENCES exercicios_novos(id) ON DELETE CASCADE,
    series INT,
    repeticoes TEXT,
    carga NUMERIC
);

CREATE TABLE IF NOT EXISTS periodizacoes_novas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudante_id UUID REFERENCES estudantes(id) ON DELETE CASCADE,
    semana INT NOT NULL,
    carga_prevista NUMERIC,
    carga_real NUMERIC,
    criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planos_de_treino_gerados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudante_id UUID REFERENCES estudantes(id) ON DELETE CASCADE,
    modelo_id UUID REFERENCES modelos_de_treino(id) ON DELETE CASCADE,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Função para calcular periodização
CREATE OR REPLACE FUNCTION calcular_periodizacao_correspondencia(estudante UUID)
RETURNS TABLE (
    semana INT,
    carga_prevista NUMERIC,
    carga_real NUMERIC,
    diferenca NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.semana,
        p.carga_prevista,
        p.carga_real,
        (p.carga_real - p.carga_prevista) AS diferenca
    FROM periodizacoes_novas p
    WHERE p.estudante_id = estudante
    ORDER BY p.semana;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS nas novas tabelas
ALTER TABLE estudantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelos_de_treino ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercicios_novos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estruturas_de_treinamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodizacoes_novas ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_de_treino_gerados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas
CREATE POLICY "Everyone can view estudantes" ON estudantes FOR SELECT USING (true);
CREATE POLICY "Everyone can manage estudantes" ON estudantes FOR ALL USING (true);

CREATE POLICY "Everyone can view modelos_de_treino" ON modelos_de_treino FOR SELECT USING (true);
CREATE POLICY "Everyone can manage modelos_de_treino" ON modelos_de_treino FOR ALL USING (true);

CREATE POLICY "Everyone can view exercicios_novos" ON exercicios_novos FOR SELECT USING (true);
CREATE POLICY "Everyone can manage exercicios_novos" ON exercicios_novos FOR ALL USING (true);

CREATE POLICY "Everyone can view estruturas_de_treinamento" ON estruturas_de_treinamento FOR SELECT USING (true);
CREATE POLICY "Everyone can manage estruturas_de_treinamento" ON estruturas_de_treinamento FOR ALL USING (true);

CREATE POLICY "Everyone can view periodizacoes_novas" ON periodizacoes_novas FOR SELECT USING (true);
CREATE POLICY "Everyone can manage periodizacoes_novas" ON periodizacoes_novas FOR ALL USING (true);

CREATE POLICY "Everyone can view planos_de_treino_gerados" ON planos_de_treino_gerados FOR SELECT USING (true);
CREATE POLICY "Everyone can manage planos_de_treino_gerados" ON planos_de_treino_gerados FOR ALL USING (true);
;
