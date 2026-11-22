
-- Create table for periodization variations to avoid repetitions
CREATE TABLE public.periodization_variations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  duration_months integer NOT NULL,
  variation_name text NOT NULL, -- 'A', 'B', etc.
  structure_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create table to track generated plans and avoid repetitions
CREATE TABLE public.generated_workout_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  duration_months integer NOT NULL,
  variation_used text NOT NULL,
  plan_data jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  feedback_data jsonb DEFAULT NULL,
  status text DEFAULT 'active'
);

-- Enable RLS
ALTER TABLE public.periodization_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_workout_plans ENABLE ROW LEVEL SECURITY;

-- Policies for periodization_variations (public read)
CREATE POLICY "Everyone can view periodization variations" 
ON public.periodization_variations 
FOR SELECT 
USING (true);

-- Policies for generated_workout_plans (user-specific)
CREATE POLICY "Users can view their own generated plans" 
ON public.generated_workout_plans 
FOR SELECT 
USING (user_profile_id IN (
  SELECT id FROM user_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create their own generated plans" 
ON public.generated_workout_plans 
FOR INSERT 
WITH CHECK (user_profile_id IN (
  SELECT id FROM user_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can update their own generated plans" 
ON public.generated_workout_plans 
FOR UPDATE 
USING (user_profile_id IN (
  SELECT id FROM user_profiles WHERE user_id = auth.uid()
));

-- Insert 3-month variations
INSERT INTO public.periodization_variations (duration_months, variation_name, structure_data) VALUES (
  3,
  'A',
  '{
    "name": "Estrutura 3 Meses - Variação A",
    "description": "Foco em fundamentos com progressão step-wise para linear",
    "months": [
      {
        "month": 1,
        "periodization": "step-wise",
        "focus": "Adaptação Anatômica",
        "rationale": "Construção de base técnica e condicionamento"
      },
      {
        "month": 2,
        "periodization": "linear",
        "focus": "Hipertrofia Progressiva",
        "rationale": "Desenvolvimento sistemático de massa muscular"
      },
      {
        "month": 3,
        "periodization": "ondulatoria-semanal",
        "focus": "Consolidar Força + Volume",
        "rationale": "Variação semanal para evitar platôs"
      }
    ]
  }'
);

INSERT INTO public.periodization_variations (duration_months, variation_name, structure_data) VALUES (
  3,
  'B',
  '{
    "name": "Estrutura 3 Meses - Variação B",
    "description": "Abordagem com variação diária e organização por movimento",
    "months": [
      {
        "month": 1,
        "periodization": "ondulatoria-diaria",
        "focus": "Técnica com Variação",
        "rationale": "Variação diária para aprendizado motor acelerado"
      },
      {
        "month": 2,
        "periodization": "escada",
        "focus": "Progresso Constante",
        "rationale": "Progressão gradual e sustentável"
      },
      {
        "month": 3,
        "periodization": "niveis",
        "focus": "Organização por Movimento",
        "rationale": "Estrutura hierárquica de exercícios"
      }
    ]
  }'
);

-- Insert 6-month variations
INSERT INTO public.periodization_variations (duration_months, variation_name, structure_data) VALUES (
  6,
  'A',
  '{
    "name": "Estrutura 6 Meses - Variação A",
    "description": "Progressão clássica com foco em autorregulação final",
    "months": [
      {
        "month": 1,
        "periodization": "step-wise",
        "focus": "Base e Adaptação",
        "rationale": "Estabelecer fundamentos sólidos"
      },
      {
        "month": 2,
        "periodization": "linear",
        "focus": "Hipertrofia Fundamental",
        "rationale": "Construção progressiva de massa"
      },
      {
        "month": 3,
        "periodization": "ondulatoria-diaria",
        "focus": "Aceleração de Ganhos",
        "rationale": "Variação diária para quebrar platôs"
      },
      {
        "month": 4,
        "periodization": "pendular",
        "focus": "Equilíbrio Força-Hipertrofia",
        "rationale": "Oscilação estratégica de estímulos"
      },
      {
        "month": 5,
        "periodization": "niveis",
        "focus": "Desenvolvimento Equilibrado",
        "rationale": "Organização por padrões de movimento"
      },
      {
        "month": 6,
        "periodization": "autoregulacao",
        "focus": "Consolidação e Autonomia",
        "rationale": "Ensinar autorregulação baseada em prontidão"
      }
    ]
  }'
);

INSERT INTO public.periodization_variations (duration_months, variation_name, structure_data) VALUES (
  6,
  'B',
  '{
    "name": "Estrutura 6 Meses - Variação B",
    "description": "Abordagem híbrida com conjugação e polarização",
    "months": [
      {
        "month": 1,
        "periodization": "linear",
        "focus": "Base Linear",
        "rationale": "Progressão sistemática inicial"
      },
      {
        "month": 2,
        "periodization": "escada",
        "focus": "Progresso Escalonado",
        "rationale": "Incrementos constantes e seguros"
      },
      {
        "month": 3,
        "periodization": "hibrida",
        "focus": "Combinação de Métodos",
        "rationale": "Otimização através de abordagem mista"
      },
      {
        "month": 4,
        "periodization": "conjugada",
        "focus": "Força Dinâmica",
        "rationale": "Desenvolvimento de força explosiva"
      },
      {
        "month": 5,
        "periodization": "polarizada",
        "focus": "Intensidades Extremas",
        "rationale": "Alta e baixa intensidade alternadas"
      },
      {
        "month": 6,
        "periodization": "ondulatoria-diaria",
        "focus": "DUP com Autorregulação",
        "rationale": "Variação diária com ajustes individuais"
      }
    ]
  }'
);

-- Insert 12-month variations (Variation A)
INSERT INTO public.periodization_variations (duration_months, variation_name, structure_data) VALUES (
  12,
  'A',
  '{
    "name": "Estrutura 12 Meses - Variação A",
    "description": "Macrociclo completo com pico de performance",
    "months": [
      {"month": 1, "periodization": "linear", "focus": "Volume e Hipertrofia", "rationale": "Base de volume para capacidade de trabalho"},
      {"month": 2, "periodization": "ondulatoria-diaria", "focus": "Força e Hipertrofia", "rationale": "Variação diária mantendo hipertrofia"},
      {"month": 3, "periodization": "hibrida", "focus": "Transição para Força", "rationale": "Combinação linear-ondulatória"},
      {"month": 4, "periodization": "conjugada", "focus": "Força Máxima", "rationale": "Desenvolvimento de força pura"},
      {"month": 5, "periodization": "potencia-velocidade", "focus": "Conversão para Potência", "rationale": "Transformar força em explosão"},
      {"month": 6, "periodization": "blocos", "focus": "Pico de Performance", "rationale": "Tapering para recordes pessoais"},
      {"month": 7, "periodization": "reversa", "focus": "Recuperação Ativa", "rationale": "Descanso do sistema nervoso"},
      {"month": 8, "periodization": "pendular", "focus": "Re-acumulação", "rationale": "Reinício de ganhos equilibrados"},
      {"month": 9, "periodization": "niveis", "focus": "Pontos Fracos", "rationale": "Correção de desequilíbrios"},
      {"month": 10, "periodization": "polarizada", "focus": "Capacidade de Trabalho", "rationale": "Otimização recuperação-performance"},
      {"month": 11, "periodization": "autoregulacao", "focus": "Sustentabilidade", "rationale": "Prevenção de overtraining"},
      {"month": 12, "periodization": "ciclica", "focus": "Consolidação", "rationale": "Manutenção e preparação para próximo ciclo"}
    ]
  }'
);

-- Insert 12-month variations (Variation B)
INSERT INTO public.periodization_variations (duration_months, variation_name, structure_data) VALUES (
  12,
  'B',
  '{
    "name": "Estrutura 12 Meses - Variação B",
    "description": "Abordagem alternativa com foco em blocos funcionais",
    "months": [
      {"month": 1, "periodization": "escada", "focus": "Base Escalonada", "rationale": "Progressão segura e constante"},
      {"month": 2, "periodization": "ondulatoria-diaria", "focus": "Variação Técnica", "rationale": "Aprendizado motor otimizado"},
      {"month": 3, "periodization": "niveis", "focus": "Organização Funcional", "rationale": "Hierarquia de movimentos"},
      {"month": 4, "periodization": "hibrida", "focus": "Combinação Avançada", "rationale": "Múltiplos estímulos simultâneos"},
      {"month": 5, "periodization": "blocos", "focus": "Acumulação ATR", "rationale": "Bloco específico de acumulação"},
      {"month": 6, "periodization": "blocos", "focus": "Transmutação", "rationale": "Conversão de capacidades"},
      {"month": 7, "periodization": "ondulatoria-diaria", "focus": "DUP Autorregulada", "rationale": "Variação com ajustes individuais"},
      {"month": 8, "periodization": "conjugada", "focus": "Alta Intensidade", "rationale": "Força explosiva máxima"},
      {"month": 9, "periodization": "pendular", "focus": "Equilíbrio Dinâmico", "rationale": "Oscilação estratégica"},
      {"month": 10, "periodization": "potencia-velocidade", "focus": "Explosão Máxima", "rationale": "Pico de potência"},
      {"month": 11, "periodization": "ciclica", "focus": "Integração", "rationale": "Consolidação de todas as qualidades"},
      {"month": 12, "periodization": "autoregulacao", "focus": "Reteste Final", "rationale": "Avaliação e planejamento futuro"}
    ]
  }'
);

-- Insert 24-month structure (Ano 1 - Opção A)
INSERT INTO public.periodization_variations (duration_months, variation_name, structure_data) VALUES (
  24,
  'A',
  '{
    "name": "Estrutura 24 Meses - Variação A",
    "description": "Macrociclo bienal com foco em desenvolvimento geral no primeiro ano",
    "year_1": {
      "description": "Desenvolvimento Geral - Base Ampla",
      "months": [
        {"month": 1, "periodization": "linear", "focus": "Volume e Hipertrofia"},
        {"month": 2, "periodization": "ondulatoria-diaria", "focus": "Força e Hipertrofia"},
        {"month": 3, "periodization": "hibrida", "focus": "Transição para Força"},
        {"month": 4, "periodization": "conjugada", "focus": "Força Máxima"},
        {"month": 5, "periodization": "potencia-velocidade", "focus": "Conversão para Potência"},
        {"month": 6, "periodization": "blocos", "focus": "Pico de Performance"},
        {"month": 7, "periodization": "reversa", "focus": "Recuperação Ativa"},
        {"month": 8, "periodization": "pendular", "focus": "Re-acumulação"},
        {"month": 9, "periodization": "niveis", "focus": "Pontos Fracos"},
        {"month": 10, "periodization": "polarizada", "focus": "Capacidade de Trabalho"},
        {"month": 11, "periodization": "autoregulacao", "focus": "Sustentabilidade"},
        {"month": 12, "periodization": "ciclica", "focus": "Consolidação"}
      ]
    },
    "year_2": {
      "description": "Especialização em Performance",
      "months": [
        {"month": 13, "periodization": "blocos", "focus": "ATR Especializado"},
        {"month": 14, "periodization": "conjugada", "focus": "Força Específica"},
        {"month": 15, "periodization": "potencia-velocidade", "focus": "Potência Máxima"},
        {"month": 16, "periodization": "autoregulacao", "focus": "Gerenciamento Avançado"},
        {"month": 17, "periodization": "reversa", "focus": "Deload Estratégico"},
        {"month": 18, "periodization": "hibrida", "focus": "Re-pico Performance"},
        {"month": 19, "periodization": "blocos", "focus": "Tapering Final"},
        {"month": 20, "periodization": "ciclica", "focus": "Manutenção Ativa"},
        {"month": 21, "periodization": "autoregulacao", "focus": "Reavaliação"},
        {"month": 22, "periodization": "linear", "focus": "Novo Ciclo Base"},
        {"month": 23, "periodization": "hibrida", "focus": "Preparação Final"},
        {"month": 24, "periodization": "ciclica", "focus": "Consolidação Bienal"}
      ]
    }
  }'
);

-- Insert 24-month structure (Ano 1 - Opção B)
INSERT INTO public.periodization_variations (duration_months, variation_name, structure_data) VALUES (
  24,
  'B',
  '{
    "name": "Estrutura 24 Meses - Variação B",
    "description": "Abordagem alternativa com segundo ano focado em estética",
    "year_1": {
      "description": "Base Alternativa - Variação Ampliada",
      "months": [
        {"month": 1, "periodization": "ondulatoria-diaria", "focus": "DUP Inicial"},
        {"month": 2, "periodization": "hibrida", "focus": "Combinação Precoce"},
        {"month": 3, "periodization": "niveis", "focus": "Estrutura Funcional"},
        {"month": 4, "periodization": "ondulatoria-semanal", "focus": "Variação Semanal"},
        {"month": 5, "periodization": "polarizada", "focus": "Extremos Controlados"},
        {"month": 6, "periodization": "blocos", "focus": "ATR Intermediário"},
        {"month": 7, "periodization": "escada", "focus": "Progresso Graduado"},
        {"month": 8, "periodization": "blocos", "focus": "Blocos Funcionais"},
        {"month": 9, "periodization": "potencia-velocidade", "focus": "Força-Velocidade"},
        {"month": 10, "periodization": "pendular", "focus": "Oscilação Estratégica"},
        {"month": 11, "periodization": "reversa", "focus": "Inversão de Foco"},
        {"month": 12, "periodization": "ciclica", "focus": "Fechamento de Ciclo"}
      ]
    },
    "year_2": {
      "description": "Especialização Estética",
      "months": [
        {"month": 13, "periodization": "linear", "focus": "Linear Metabólica"},
        {"month": 14, "periodization": "ondulatoria-diaria", "focus": "DUP Estético"},
        {"month": 15, "periodization": "blocos", "focus": "Alta Densidade"},
        {"month": 16, "periodization": "niveis", "focus": "Tier Estético"},
        {"month": 17, "periodization": "polarizada", "focus": "Polarizada Estética"},
        {"month": 18, "periodization": "escada", "focus": "Definição Gradual"},
        {"month": 19, "periodization": "autoregulacao", "focus": "Autorregulação Estética"},
        {"month": 20, "periodization": "ondulatoria-diaria", "focus": "DUP Avançado"},
        {"month": 21, "periodization": "ciclica", "focus": "Cíclica com PRs"},
        {"month": 22, "periodization": "reversa", "focus": "Mini-corte"},
        {"month": 23, "periodization": "hibrida", "focus": "Consolidação Híbrida"},
        {"month": 24, "periodization": "ciclica", "focus": "Manutenção Final"}
      ]
    }
  }'
);
;
