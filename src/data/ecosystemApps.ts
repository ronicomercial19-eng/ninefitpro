import { COMMUNITY_URL } from "../lib/communityUrl";
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

export const EMBEDDED_APPS: Record<string, EmbeddedApp> = {
  store: {
    key: "store",
    label: "Store",
    url: "https://ninefit.lovable.app",
    description: "Catálogo e ofertas da 9FIT Store",
    allow: "clipboard-write; fullscreen; payment",
  },
  "fitness-place": {
    key: "fitness-place",
    label: "Fitness Place",
    url: "https://fitnessplace.lovable.app",
    allow: "clipboard-write; fullscreen; payment",
  },
  staff: {
    key: "staff",
    label: "9FIT Staff",
    url: "https://stevent.lovable.app/fitpro-staff",
    description: "Matching e agendamento de profissionais",
    allow: "clipboard-write; geolocation; fullscreen",
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
  academy: {
    key: "academy",
    label: "Academy",
    url: ACADEMY_URL,
    description: "Formações e cursos do professor",
    allow: "clipboard-write; fullscreen",
  },
  events: {
    key: "events",
    label: "Eventos Nine",
    url: EVENTS_URL,
    description: "Eventos, desafios e encontros",
    allow: "clipboard-write; fullscreen",
  },
  community: {
    key: "community",
    label: "Comunidade",
    url: COMMUNITY_URL,
    description: "Feed e tribos do aluno",
    allow: "clipboard-write; fullscreen",
  },
    "9zap": {
    key: "9zap",
    label: "9Zap",
    // Página de "em integração" com fallback WhatsApp — sem URL externa válida ainda
    url: "",
    description: "Mensageria e ofertas (em integração)",
    fallback: {
      type: "whatsapp",
      phone: "",
      message: "Olá! Quero suporte 9FIT PRO.",
    },
  },
};

export function getEmbeddedApp(key?: string | null): EmbeddedApp | null {
  if (!key) return null;
  return EMBEDDED_APPS[key] ?? null;
}
