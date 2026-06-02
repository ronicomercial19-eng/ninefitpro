/**
 * 9FIT · Skill Bible v1.0 — array tipado das 19 skills autônomas.
 * Fonte: 9FIT_SKILL_BIBLE_v1.md
 */
export type SkillTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface SkillSpec {
  id: string;          // SKILL-01
  slug: string;        // ron-realtime
  tier: SkillTier;
  name: string;
  mission: string;
  inputs: string[];
  outputs: string[];
  category: string;
}

export const SKILLS_BIBLE: SkillSpec[] = [
  {
    id: "SKILL-01", slug: "ron-realtime", tier: 1, category: "core",
    name: "RON Real-Time Intelligence",
    mission: "Sistema nervoso central. Processa estado fisiológico em tempo real e transforma dados brutos em linguagem humana acionável.",
    inputs: ["HRV", "BPM", "Sono", "Calorias", "Água", "Treino + RPE", "Check-in emocional", "Baseline pessoal", "Fase de periodização", "Status de sensores"],
    outputs: ["Mensagem de presença na home", "Alerta de intervenção urgente", "Recomendação contextual", "Sumário diário às 21h"],
  },
  {
    id: "SKILL-02", slug: "smartperiodizer", tier: 1, category: "core",
    name: "SmartPeriodizer Autônomo",
    mission: "Gerar e adaptar a periodização do treino em tempo real com base em performance, recuperação e meta.",
    inputs: ["Histórico de carga", "RPE", "1RM estimado", "Fadiga", "Sono"],
    outputs: ["Plano de mesociclo", "Ajustes de carga", "Recomendação de deload"],
  },
  {
    id: "SKILL-03", slug: "radar-5d", tier: 2, category: "intelligence",
    name: "Radar 5D Inteligente",
    mission: "Visualizar 5 dimensões: treino, nutrição, sono, mobilidade, hidratação como um score vivo.",
    inputs: ["Logs de treino", "Logs de nutrição", "Sono", "Mobilidade", "Hidratação"],
    outputs: ["Score 5D", "Alerta de dimensão crítica"],
  },
  {
    id: "SKILL-04", slug: "neural-os-calibration", tier: 2, category: "intelligence",
    name: "Calibração Contínua — Neural OS",
    mission: "Atualizar o baseline pessoal diariamente cruzando comportamento, fisiologia e contexto.",
    inputs: ["Todos os eventos do app", "Histórico"],
    outputs: ["Baseline atualizado", "Insights de desvio"],
  },
  {
    id: "SKILL-05", slug: "sensorium", tier: 2, category: "intelligence",
    name: "Sensorium Fisiológico Completo",
    mission: "Orquestrar todos os sensores (wearables, manual, voz) em um único stream coerente.",
    inputs: ["BLE wearables", "HealthKit/GoogleFit", "Manual log"],
    outputs: ["Stream unificado bio_*"],
  },
  {
    id: "SKILL-06", slug: "daily-protocol", tier: 3, category: "protocol",
    name: "Daily Protocol Generator",
    mission: "Gerar o protocolo diário personalizado (intervenções curtas) com base no estado atual.",
    inputs: ["RON intelligence", "Disponibilidade do dia"],
    outputs: ["Protocolo diário ordenado"],
  },
  {
    id: "SKILL-07", slug: "posturapro", tier: 3, category: "protocol",
    name: "PosturaPro — Scanner de Técnica",
    mission: "Analisar vídeo do treino e detectar falhas técnicas críticas.",
    inputs: ["Vídeo do aluno", "Exercício alvo"],
    outputs: ["Score técnico", "Marcações de correção"],
  },
  {
    id: "SKILL-08", slug: "9fitkitchen", tier: 3, category: "protocol",
    name: "IA Nutricional — 9FitKitchen",
    mission: "Sugerir refeições e ajustar macros em tempo real com base no gasto e meta.",
    inputs: ["Macros consumidos", "Treino do dia", "Meta de composição"],
    outputs: ["Receitas sugeridas", "Lista de compras"],
  },
  {
    id: "SKILL-09", slug: "streaks-gamification", tier: 4, category: "engagement",
    name: "Streaks Inteligente & Gamification",
    mission: "Gerenciar XP, level, classes e streaks com lógica anti-burnout.",
    inputs: ["Eventos completados"],
    outputs: ["XP", "Level", "Streak", "Conquistas"],
  },
  {
    id: "SKILL-10", slug: "squads-analytics", tier: 4, category: "engagement",
    name: "Squads Behavior Analytics",
    mission: "Detectar padrões comportamentais coletivos para insights de coorte.",
    inputs: ["Eventos de squad", "Performance individual"],
    outputs: ["Insights de squad", "Comparativos"],
  },
  {
    id: "SKILL-11", slug: "ron-conversational", tier: 4, category: "engagement",
    name: "RON Conversational",
    mission: "Camada de diálogo natural sobre RON intelligence.",
    inputs: ["Mensagem do usuário", "Contexto RON"],
    outputs: ["Resposta natural", "Ações sugeridas"],
  },
  {
    id: "SKILL-12", slug: "9fitbio", tier: 5, category: "bio",
    name: "9FitBio — DNA & Biomarcadores",
    mission: "Integrar exames genéticos e biomarcadores para personalização profunda.",
    inputs: ["Upload exames", "DNA reports"],
    outputs: ["Recomendações genéticas", "Alertas de biomarcador"],
  },
  {
    id: "SKILL-13", slug: "9fitrecovery", tier: 5, category: "bio",
    name: "9FitRecovery — Clínica Inteligente",
    mission: "Orquestrar terapias de recuperação (massagem, crio, sauna) on-demand.",
    inputs: ["Carga de treino", "Marcadores de fadiga"],
    outputs: ["Recomendação de terapia", "Agendamento"],
  },
  {
    id: "SKILL-14", slug: "fitflow", tier: 5, category: "bio",
    name: "FitFlow — Cross-Product Integration",
    mission: "Conectar todos os módulos do ecossistema em fluxo único.",
    inputs: ["Eventos cross-product"],
    outputs: ["Handoffs", "Sync entre módulos"],
  },
  {
    id: "SKILL-15", slug: "credit-classes", tier: 6, category: "monetization",
    name: "Créditos de Aula Inteligente",
    mission: "Gerir créditos, prever consumo e sugerir recargas.",
    inputs: ["Créditos atuais", "Histórico de uso"],
    outputs: ["Previsão de zerar", "Sugestão de pacote"],
  },
  {
    id: "SKILL-16", slug: "9pay", tier: 6, category: "monetization",
    name: "9PAY — Billing & Recorrência",
    mission: "Gestão completa de assinaturas, cobranças e renovação.",
    inputs: ["Plano ativo", "Status pagamento"],
    outputs: ["Cobrança automática", "Alertas de falha"],
  },
  {
    id: "SKILL-17", slug: "smart-notifications", tier: 6, category: "monetization",
    name: "Notificação Contextual",
    mission: "Disparar a mensagem certa, no canal certo, no momento certo.",
    inputs: ["Estado RON", "Janela ideal do usuário"],
    outputs: ["Push", "WhatsApp", "In-app"],
  },
  {
    id: "SKILL-18", slug: "9flix", tier: 7, category: "content",
    name: "9FLIX — Video Library com IA",
    mission: "Biblioteca de vídeos com classificação semântica e recomendação.",
    inputs: ["Catálogo", "Histórico de play"],
    outputs: ["Recomendação", "Continue assistindo"],
  },
  {
    id: "SKILL-19", slug: "content-recommendation", tier: 7, category: "content",
    name: "Content Recommendation Engine",
    mission: "Engine de recomendação cross-content (vídeo, artigos, protocolos).",
    inputs: ["Perfil", "Histórico", "Objetivo"],
    outputs: ["Carrosséis personalizados"],
  },
];

export const SKILL_CATEGORIES = [
  { key: "core", label: "Núcleo · RON / Neural OS" },
  { key: "intelligence", label: "Inteligência" },
  { key: "protocol", label: "Protocolo" },
  { key: "engagement", label: "Engajamento" },
  { key: "bio", label: "Bio" },
  { key: "monetization", label: "Monetização" },
  { key: "content", label: "Conteúdo" },
];
