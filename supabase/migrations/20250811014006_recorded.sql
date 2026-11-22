-- Server actions para compatibilidade e criação de planos
-- Primeiro vamos garantir que temos as colunas necessárias na tabela athletes

-- Adicionar colunas necessárias na tabela athletes se não existirem
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS training_level TEXT,
ADD COLUMN IF NOT EXISTS injuries JSONB DEFAULT '[]';

-- Adicionar colunas necessárias na tabela periodizations se não existirem  
ALTER TABLE periodizations 
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;;
