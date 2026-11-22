-- Create table for long-term training structures
CREATE TABLE public.training_structures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  duration_months integer NOT NULL,
  target_level text NOT NULL, -- 'iniciante', 'intermediario', 'avancado'
  description text,
  structure_data jsonb NOT NULL, -- Will contain the month-by-month plan
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_structures ENABLE ROW LEVEL SECURITY;

-- Create policy for reading training structures
CREATE POLICY "Everyone can view training structures" 
ON public.training_structures 
FOR SELECT 
USING (true);

-- Insert 3-month structure (Beginner focus)
INSERT INTO public.training_structures (name, duration_months, target_level, description, structure_data) VALUES (
  'Estrutura de 3 Meses - Fundamentos',
  3,
  'iniciante',
  'Plano ideal para iniciantes ou para quem está retornando aos treinos, focando em construir uma base sólida.',
  '{
    "months": [
      {
        "month": 1,
        "weeks": "1-4",
        "periodization_model": "escada",
        "focus": "Adaptação Anatômica e Técnica",
        "rationale": "Criar uma base de condicionamento, aprender a técnica dos exercícios e promover uma progressão de carga segura e constante. Ideal para iniciantes."
      },
      {
        "month": 2,
        "weeks": "5-8", 
        "periodization_model": "linear",
        "focus": "Transição para Hipertrofia e Força",
        "rationale": "Iniciar o desenvolvimento de massa muscular (fase de hipertrofia) e, em seguida, começar a aumentar a carga para ganhos de força (fase de força)."
      },
      {
        "month": 3,
        "weeks": "9-12",
        "periodization_model": "ondulatoria-semanal",
        "focus": "Otimização de Hipertrofia e Força", 
        "rationale": "Introduzir variação semanal para evitar platôs, alternando semanas com foco em volume (hipertrofia) e intensidade (força), consolidando os ganhos."
      }
    ]
  }'
);

-- Insert 6-month structure (Intermediate development)
INSERT INTO public.training_structures (name, duration_months, target_level, description, structure_data) VALUES (
  'Estrutura de 6 Meses - Desenvolvimento Intermediário',
  6,
  'intermediario', 
  'Este plano leva o usuário do nível básico ao intermediário, introduzindo conceitos mais avançados.',
  '{
    "months": [
      {
        "month": 1,
        "weeks": "1-4",
        "periodization_model": "escada",
        "focus": "Base e Adaptação",
        "rationale": "Estabelecer uma base sólida e preparar o corpo para as fases mais intensas."
      },
      {
        "month": 2,
        "weeks": "5-8",
        "periodization_model": "linear", 
        "focus": "Hipertrofia e Força Fundamental",
        "rationale": "Construir massa muscular e força de maneira progressiva e estruturada."
      },
      {
        "month": 3,
        "weeks": "9-12",
        "periodization_model": "ondulatoria-diaria",
        "focus": "Aceleração de Ganhos",
        "rationale": "Introduzir maior variação de estímulos para quebrar platôs e otimizar ganhos simultâneos de força e hipertrofia."
      },
      {
        "month": 4,
        "weeks": "13-16", 
        "periodization_model": "pendular",
        "focus": "Equilíbrio Força-Hipertrofia",
        "rationale": "Focar de forma oscilante entre volume e intensidade para maximizar ambas as qualidades de forma sinérgica."
      },
      {
        "month": 5,
        "weeks": "17-20",
        "periodization_model": "niveis",
        "focus": "Desenvolvimento Funcional e Equilibrado",
        "rationale": "Organizar o treino por padrões de movimento, garantindo que todos os grupos musculares e qualidades (força, suplementar, acessório) sejam trabalhados de forma equilibrada."
      },
      {
        "month": 6,
        "weeks": "21-24",
        "periodization_model": "autoregulacao",
        "focus": "Consolidação e Autonomia", 
        "rationale": "Ensinar o usuário a ouvir o próprio corpo, ajustando o treino com base na prontidão diária. Consolida os ganhos e prepara para treinos mais avançados."
      }
    ]
  }'
);

-- Insert 12-month structure (Performance and specialization)
INSERT INTO public.training_structures (name, duration_months, target_level, description, structure_data) VALUES (
  'Estrutura de 12 Meses - Performance e Especialização',
  12,
  'avancado',
  'Plano anual projetado para um usuário dedicado que busca atingir um pico de performance ou uma transformação corporal significativa.',
  '{
    "months": [
      {
        "month": 1,
        "periodization_model": "linear",
        "focus": "Volume e Hipertrofia",
        "rationale": "Iniciar o macrociclo com uma base de volume para aumentar a capacidade de trabalho e a massa muscular."
      },
      {
        "month": 2,
        "periodization_model": "ondulatoria-diaria",
        "focus": "Força e Hipertrofia",
        "rationale": "Aumentar a intensidade enquanto mantém estímulos de hipertrofia através da variação diária."
      },
      {
        "month": 3,
        "periodization_model": "hibrida",
        "focus": "Transição para Força Máxima",
        "rationale": "Combinar uma progressão linear de longo prazo com ondulações semanais para maximizar a adaptação à força."
      },
      {
        "month": 4,
        "periodization_model": "conjugada",
        "focus": "Força Máxima (Max Effort)",
        "rationale": "Focar no desenvolvimento de força pura, utilizando os princípios de esforço máximo e dinâmico."
      },
      {
        "month": 5,
        "periodization_model": "potencia-velocidade",
        "focus": "Conversão para Potência",
        "rationale": "Transformar a força adquirida em potência explosiva, crucial para performance atlética."
      },
      {
        "month": 6,
        "periodization_model": "blocos",
        "focus": "Pico de Performance e Testes",
        "rationale": "Reduzir o volume drasticamente (tapering) para atingir o pico de força e potência, ideal para testar recordes pessoais."
      },
      {
        "month": 7,
        "periodization_model": "reversa",
        "focus": "Recuperação Ativa e Resistência",
        "rationale": "Mudar o foco para maior volume e menor intensidade, permitindo a recuperação do sistema nervoso e melhorando a resistência muscular."
      },
      {
        "month": 8,
        "periodization_model": "pendular",
        "focus": "Re-acumulação de Volume/Força",
        "rationale": "Reiniciar um ciclo de ganhos equilibrados entre massa muscular e força."
      },
      {
        "month": 9,
        "periodization_model": "niveis",
        "focus": "Foco em Pontos Fracos e Simetria",
        "rationale": "Utilizar uma abordagem estruturada para corrigir desequilíbrios musculares e trabalhar pontos fracos."
      },
      {
        "month": 10,
        "periodization_model": "polarizada",
        "focus": "Maximização da Capacidade de Trabalho",
        "rationale": "Focar em dias de altíssima intensidade e dias de baixíssima intensidade/recuperação para otimizar a recuperação e o desempenho."
      },
      {
        "month": 11,
        "periodization_model": "autoregulacao",
        "focus": "Otimização e Sustentabilidade",
        "rationale": "Usar a prontidão individual para guiar o treino, garantindo progresso contínuo sem overtraining antes do final do ciclo."
      },
      {
        "month": 12,
        "periodization_model": "ciclica",
        "focus": "Manutenção e Consolidação",
        "rationale": "Focar na manutenção dos ganhos, testando novos PRs e preparando para o próximo macrociclo anual."
      }
    ]
  }'
);

-- Insert 24-month structure (Mastery and long-term potential)  
INSERT INTO public.training_structures (name, duration_months, target_level, description, structure_data) VALUES (
  'Estrutura de 24 Meses - Maestria e Potencial de Longo Prazo',
  24,
  'avancado',
  'Plano bienal para o atleta ou entusiasta sério, estruturado como dois macrociclos anuais distintos: Ano 1 (Desenvolvimento) e Ano 2 (Especialização).',
  '{
    "year_1": {
      "description": "Foco no Desenvolvimento Geral",
      "months": [
        {"month": 1, "periodization_model": "linear", "focus": "Volume e Hipertrofia"},
        {"month": 2, "periodization_model": "ondulatoria-diaria", "focus": "Força e Hipertrofia"},
        {"month": 3, "periodization_model": "hibrida", "focus": "Transição para Força Máxima"},
        {"month": 4, "periodization_model": "conjugada", "focus": "Força Máxima (Max Effort)"},
        {"month": 5, "periodization_model": "potencia-velocidade", "focus": "Conversão para Potência"},
        {"month": 6, "periodization_model": "blocos", "focus": "Pico de Performance e Testes"},
        {"month": 7, "periodization_model": "reversa", "focus": "Recuperação Ativa e Resistência"},
        {"month": 8, "periodization_model": "pendular", "focus": "Re-acumulação de Volume/Força"},
        {"month": 9, "periodization_model": "niveis", "focus": "Foco em Pontos Fracos e Simetria"},
        {"month": 10, "periodization_model": "polarizada", "focus": "Maximização da Capacidade de Trabalho"},
        {"month": 11, "periodization_model": "autoregulacao", "focus": "Otimização e Sustentabilidade"},
        {"month": 12, "periodization_model": "ciclica", "focus": "Manutenção e Consolidação"}
      ]
    },
    "year_2": {
      "description": "Foco na Especialização e Refinamento",
      "months": [
        {"month": 13, "periodization_model": "blocos", "focus": "Acumulação e Transmutação", "rationale": "Iniciar o ano com um bloco focado em acumular volume em exercícios específicos para o objetivo"},
        {"month": 14, "periodization_model": "blocos", "focus": "Acumulação e Transmutação"},
        {"month": 15, "periodization_model": "blocos", "focus": "Acumulação e Transmutação"},
        {"month": 16, "periodization_model": "conjugada", "focus": "Força Máxima e Velocidade", "rationale": "Manter a variação de estímulos para evitar acomodação, focando em quebrar recordes nos levantamentos principais"},
        {"month": 17, "periodization_model": "potencia-velocidade", "focus": "Especialização em Explosão", "rationale": "Dedicar um bloco inteiro para maximizar a taxa de desenvolvimento de força (RFD)"},
        {"month": 18, "periodization_model": "potencia-velocidade", "focus": "Especialização em Explosão"},
        {"month": 19, "periodization_model": "autoregulacao", "focus": "Gerenciamento de Fadiga e Pico", "rationale": "Com o aumento da intensidade e da fadiga acumulada, a autorregulação se torna essencial"},
        {"month": 20, "periodization_model": "reversa", "focus": "Deload Estratégico e Hipertrofia", "rationale": "Inverter o estímulo para dar ao sistema nervoso uma pausa da alta intensidade"},
        {"month": 21, "periodization_model": "hibrida", "focus": "Re-pico de Performance", "rationale": "Iniciar a subida final para um pico de performance"},
        {"month": 22, "periodization_model": "hibrida", "focus": "Re-pico de Performance"},
        {"month": 23, "periodization_model": "blocos", "focus": "Pico Anual (Tapering)", "rationale": "Fase final de polimento e recuperação para atingir o máximo potencial"},
        {"month": 24, "periodization_model": "ciclica", "focus": "Manutenção Ativa e Planejamento", "rationale": "Manter os ganhos com um volume reduzido, avaliar os resultados dos 2 anos"}
      ]
    }
  }'
);;
