/**
 * Catálogo dos métodos da avaliação guiada, com a base científica de cada um.
 * Princípio: protocolos de campo publicados, executados sempre do mesmo jeito, para você se comparar com você mesmo.
 */
import type { Test } from "./guidedAssessment";

export interface MethodCard {
  id: string;
  title: string;
  measures: string;
  evidence: string;
  time: string;
  needs: string;
  optional?: boolean;
}

export const METHOD_CARDS: MethodCard[] = [
  {
    id: "dados", title: "1. Dados e triagem de saúde",
    measures: "Idade, sexo, objetivo, peso, altura e prontidão para exercício (PAR-Q).",
    evidence: "A triagem segue o modelo do PAR-Q+ (CSEP), usado no mundo todo para identificar quem deve ter liberação médica antes de testes de esforço. Peso e altura medidos em duplicata reduzem o erro de medição.",
    time: "5 min", needs: "Balança e parede",
  },
  {
    id: "rml", title: "2. Resistência muscular localizada",
    measures: "Quantas repetições completas você faz em 1 minuto: agachamento, flexão, elevação pélvica e abdominal. Prancha: tempo até a técnica quebrar.",
    evidence: "Testes de repetições máximas em tempo fixo são métodos de campo consagrados (ACSM; PROESP-BR para o abdominal de 1 minuto) e são reprodutíveis quando o protocolo é repetido igual. Os testes de resistência do core (prancha) têm boa confiabilidade (McGill et al., 1999). Tabelas de referência variam por idade e sexo, e não há tabela amplamente aceita para elevação pélvica: por isso o foco é acompanhar a sua evolução.",
    time: "10 a 15 min (com descansos)", needs: "Cronômetro do app, colchonete",
  },
  {
    id: "corpo", title: "3. Composição corporal",
    measures: "Circunferências, relações cintura/altura e cintura/quadril, estimativa de gordura corporal e fotos padronizadas de antes e depois.",
    evidence: "Cintura e relação cintura/altura predizem risco cardiometabólico melhor que o IMC isolado (Ashwell et al., 2012). A gordura corporal é estimada pelo método da Marinha dos EUA (Hodgdon & Beckett, 1984), com margem de alguns pontos percentuais. Fotos padronizadas mostram mudanças que a balança não mostra.",
    time: "8 min", needs: "Fita métrica flexível, celular",
  },
  {
    id: "alem", title: "4. Ir além (opcional)",
    measures: "Condicionamento aeróbio (teste do degrau), equilíbrio em uma perna, mobilidade (sentar e alcançar), força de pernas funcional, FC de repouso e, para experientes, força estimada.",
    evidence: "Teste do degrau YMCA de 3 minutos: submáximo, seguro para leigos; quanto menor a FC de recuperação, melhor o condicionamento. Equilíbrio unipodal: a incapacidade de ficar 10 s em uma perna se associou a maior mortalidade em adultos de 51 a 75 anos (Araujo et al., BJSM, 2022). Sentar e alcançar tem validade limitada para flexibilidade; serve para você se comparar com você mesmo. Força estimada por repetições (Brzycki, 1993) é mais segura que testar 1RM.",
    time: "5 a 20 min, a sua escolha", needs: "Degrau (~30 cm), régua", optional: true,
  },
];

export const GOALS = ["Saúde e Bem-estar", "Emagrecimento", "Hipertrofia e Definição", "Força", "Condicionamento"] as const;

/** Resistência muscular localizada — ordem alterna membros inferiores/superiores/core para reduzir fadiga local. */
export const RML_TESTS: Test[] = [
  {
    id: "agachamento", title: "Agachamento livre — máximo em 1 minuto",
    why: "Resistência de pernas e glúteos, sem carga.",
    how: ["Pés na largura dos ombros, calcanhares no chão, tronco firme.", "Desça até as coxas ficarem paralelas ao chão (ou o mais perto sem dor) e suba até estender o quadril.", "Conte só repetições completas e mantenha ritmo constante por 60 s."],
    stop: "Pare se sentir dor no joelho, quadril ou lombar, ou tontura.",
    fields: [{ key: "rml_agachamento", label: "Repetições em 60 s", unit: "reps", min: 0, max: 500 }],
  },
  {
    id: "flexao", title: "Flexão de braço — máximo em 1 minuto",
    why: "Resistência de peito, ombros e tríceps. Use sempre a mesma variação para poder comparar.",
    how: ["Escolha a variação abaixo (na dúvida, a mais fácil em que consegue fazer 5 repetições boas).", "Corpo alinhado, peito quase toca o chão (ou o apoio), cotovelos a ~45° do tronco.", "Conte só repetições completas por 60 s. Pode pausar na posição alta, sem apoiar o corpo."],
    stop: "Pare se sentir dor no ombro, punho ou peito.",
    variations: { key: "flexao_variacao", options: ["Na parede", "Inclinada (banco)", "De joelhos", "Padrão"] },
    fields: [{ key: "rml_flexao", label: "Repetições em 60 s", unit: "reps", min: 0, max: 300 }],
  },
  {
    id: "elevacao_pelvica", title: "Elevação pélvica — máximo em 1 minuto",
    why: "Resistência de glúteos e posteriores de coxa.",
    how: ["Deitado de costas, joelhos a ~90°, pés apoiados na largura do quadril, braços ao lado do corpo.", "Eleve o quadril até formar uma linha ombros-quadril-joelhos e aperte o glúteo no topo; desça sem relaxar de vez.", "Conte só repetições completas por 60 s. Sem arquear a lombar no topo."],
    stop: "Pare se sentir dor na lombar, cãibra forte ou dor na parte de trás da coxa.",
    fields: [{ key: "rml_elevacao_p", label: "Repetições em 60 s", unit: "reps", min: 0, max: 500 }],
  },
  {
    id: "abdominal", title: "Abdominal — máximo em 1 minuto",
    why: "Resistência da musculatura abdominal (protocolo de campo do PROESP-BR).",
    how: ["Deitado, joelhos a ~90°, pés apoiados (pode pedir para segurarem), braços cruzados no peito.", "Suba até os cotovelos tocarem as coxas e volte até as escápulas encostarem no chão.", "Conte só repetições completas por 60 s. Não puxe o pescoço com as mãos."],
    stop: "Pare se sentir dor no pescoço ou na lombar.",
    fields: [{ key: "rml_abs", label: "Repetições em 60 s", unit: "reps", min: 0, max: 500 }],
  },
  {
    id: "prancha", title: "Prancha — tempo até a técnica quebrar",
    why: "Resistência do core (McGill et al., 1999). Aqui é tempo, não repetições.",
    how: ["Antebraços e pontas dos pés no chão, cotovelos sob os ombros.", "Corpo em linha reta da cabeça aos calcanhares, abdômen firme, sem afundar o quadril.", "Pare o cronômetro quando o quadril cair ou subir. Se chegar a 5 minutos, pode parar."],
    stop: "Pare se sentir dor na lombar ou nos ombros.",
    fields: [{ key: "core_prancha_seg", label: "Tempo", unit: "seg", min: 0, max: 1800 }],
  },
];

export const STEP_TEST_FIELD = { key: "step_test_fc_1min", label: "Batimentos em 1 minuto de recuperação", unit: "bpm", min: 40, max: 220 } as const;

export const BALANCE_TEST: Test = {
  id: "equilibrio_unipodal", title: "Equilíbrio em uma perna",
  why: "Equilíbrio e controle neuromuscular. Ficar 10 s ou mais em uma perna é um marcador simples associado a saúde e longevidade (Araujo et al., 2022).",
  how: ["Mãos na cintura, olhos abertos, olhando para um ponto fixo.", "Levante um pé do chão sem encostar na outra perna.", "Pare o cronômetro ao apoiar o pé, mexer o pé de apoio ou ao chegar a 60 s. Teste cada lado, perto de uma parede para segurança."],
  stop: "Faça perto de uma parede ou móvel firme. Pare se sentir tontura.",
  fields: [
    { key: "equilibrio_unipodal_esq_seg", label: "Perna esquerda no chão (apoio esquerdo)", unit: "seg", min: 0, max: 120 },
    { key: "equilibrio_unipodal_dir_seg", label: "Perna direita no chão (apoio direito)", unit: "seg", min: 0, max: 120 },
  ],
};

export const REACH_TEST: Test = {
  id: "sentar_alcancar", title: "Sentar e alcançar (mobilidade)",
  why: "Flexibilidade de posteriores de coxa e lombar. Validade limitada: use para se comparar com você mesmo.",
  how: ["Sentado no chão, pernas estendidas, pés apoiados na parede. Coloque uma régua no chão, com o zero na linha dos seus dedos do pé.", "Inspire e, ao expirar, deslize as mãos juntas sobre a régua o mais longe que conseguir, sem quicar.", "Anote a distância. Se não alcançar os pés, use número negativo (ex.: -10). Se passar dos pés, positivo."],
  stop: "Pare se sentir dor na lombar ou atrás do joelho. Evite este teste com hérnia ou lesão lombar recente.",
  fields: [{ key: "sentar_alcancar_cm", label: "Alcance", unit: "cm", min: -40, max: 60 }],
};

export const PHOTO_VIEWS = [
  { id: "frente", label: "Frente" },
  { id: "lado", label: "Lado" },
  { id: "costas", label: "Costas" },
] as const;
export type PhotoView = (typeof PHOTO_VIEWS)[number]["id"];

export const PHOTO_PROTOCOL: string[] = [
  "Roupa de baixo ou roupa justa, sem acessórios.",
  "Luz frontal difusa, fundo liso e sem sombras fortes.",
  "Celular na altura do umbigo, a 2 a 3 m, apoiado e com timer de 10 s.",
  "Pose relaxada, braços levemente afastados do corpo, pés na largura do quadril.",
  "Repita sempre no mesmo horário (de manhã, em jejum), no mesmo lugar e com a mesma luz: só assim o antes e depois é comparável.",
];
