// Mapeamento canônico de apps externos integrados de forma nativa (iframe embed)
// usado por /9fit/native-system?app=<key>

export interface EmbeddedApp {
  key: string;
  label: string;
  url: string;
  description?: string;
  /** Se true, o card mostra fallback para WhatsApp enquanto API não está pronta */
  fallback?: { type: "whatsapp"; phone: string; message: string };
  /** Permissões do iframe */
  allow?: string;
}

// NOTA: "staff" foi removido daqui de propósito (25/08/2026).
// Apontava para https://stevent.lovable.app/fitpro-staff — um app externo/demo
// sem nenhuma conexão com o banco de profissionais real do FitPro (tela de
// "Iniciar Matching" fake). O Staff de verdade vive em /9fit/staff (Staff.tsx),
// que lê a tabela `profiles` e grava agendamentos reais em `appointments`.
// physio_modules.cta_route da key 'staff' já foi atualizado no banco para /9fit/staff.

export const EMBEDDED_APPS: Record<string, EmbeddedApp> = {
  store: {
    key: "store",
    label: "Store",
    url: "https://fitnessplace.lovable.app",
    description: "E-commerce e dropshipping 9FIT",
    allow: "clipboard-write; fullscreen; payment",
  },
  "fitness-place": {
    key: "fitness-place",
    label: "Fitness Place",
    url: "https://fitnessplace.lovable.app",
    allow: "clipboard-write; fullscreen; payment",
  },
  "avaliacao-guiada": {
    key: "avaliacao-guiada",
    label: "Avaliação Guiada",
    url: "https://nineprogresstracker.lovable.app/avaliacao-guiada/select",
    description: "Questionário 360 → ProgressTracker",
    allow: "clipboard-write; fullscreen",
  },
  smartreino: {
    key: "smartreino",
    label: "SmartTreino",
    url: "https://smartreino.lovable.app",
    allow: "clipboard-write; fullscreen",
  },
  periodizer: {
    key: "periodizer",
    label: "SmartPeriodizer",
    url: "https://treino-smart-periodizer.lovable.app",
    allow: "clipboard-write; fullscreen",
  },
  "postura-pro": {
    key: "postura-pro",
    label: "Postura Pro",
    url: "https://postura-pro-analyzer.lovable.app",
    allow: "camera; clipboard-write; fullscreen",
  },
  healthflix: {
    key: "healthflix",
    label: "HealthFlix",
    url: "https://healthflixnine.lovable.app",
    allow: "autoplay; encrypted-media; fullscreen",
  },
  "9zap": {
    key: "9zap",
    label: "9Zap",
    // Página de "em integração" com fallback WhatsApp — sem URL externa válida ainda
    url: "",
    description: "Mensageria e ofertas (em integração)",
    fallback: {
      type: "whatsapp",
      phone: "5500000000000",
      message: "Olá! Quero suporte 9FIT PRO.",
    },
  },
};

export function getEmbeddedApp(key?: string | null): EmbeddedApp | null {
  if (!key) return null;
  return EMBEDDED_APPS[key] ?? null;
}
