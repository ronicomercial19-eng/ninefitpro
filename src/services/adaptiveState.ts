/**
 * Adaptive State Engine — infere Power / Low / Balanced sem rótulos neuro.
 * Baseado em Sync Score, tendência (3-5d), consistência e feedback textual.
 */
export type UserState = 'power' | 'low' | 'balanced';

export interface StateSignals {
  syncScore: number;             // 0-10 (ou 0-100 normalizado)
  recentScores?: number[];       // últimos 3-5 valores cronológicos
  recentConsistencyPct?: number; // 0-100
  feedbackText?: string | null;
}

export interface StateResult {
  state: UserState;
  reasoning: string;
  confidence: number; // 0-1
}

const NEGATIVE_KW = ['cansad', 'exaust', 'fadiga', 'dor ', 'sem energia', 'estafad', 'lesion', 'overtrain'];
const POSITIVE_KW = ['ótimo', 'otimo', 'animad', 'forte', 'energi', 'recuperad', 'leve'];

function normalizeScore(s: number): number {
  if (s > 10) return s / 10; // 0-100 → 0-10
  return s;
}

function detectTrend(scores: number[]): 'up' | 'down' | 'flat' {
  if (!scores || scores.length < 2) return 'flat';
  const recent = scores.slice(-3);
  if (recent.length < 2) return 'flat';
  const first = recent[0];
  const last = recent[recent.length - 1];
  const diff = last - first;
  if (Math.abs(diff) < 0.5) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

function feedbackSentiment(text?: string | null): 'positive' | 'negative' | 'neutral' {
  if (!text) return 'neutral';
  const t = text.toLowerCase();
  if (NEGATIVE_KW.some((k) => t.includes(k))) return 'negative';
  if (POSITIVE_KW.some((k) => t.includes(k))) return 'positive';
  return 'neutral';
}

export function inferUserState(signals: StateSignals): StateResult {
  const score = normalizeScore(signals.syncScore || 0);
  const trend = detectTrend((signals.recentScores || []).map(normalizeScore));
  const consistency = signals.recentConsistencyPct ?? 50;
  const sentiment = feedbackSentiment(signals.feedbackText);

  // Low Mode forçado
  if (sentiment === 'negative') {
    return { state: 'low', reasoning: 'Feedback indica fadiga/cansaço.', confidence: 0.85 };
  }
  if (trend === 'down' && score < 6) {
    return { state: 'low', reasoning: 'Sync caindo nos últimos dias.', confidence: 0.8 };
  }
  if (score < 5.5) {
    return { state: 'low', reasoning: 'Sync abaixo da média de operação.', confidence: 0.75 };
  }

  // Power Mode
  if (score > 7.5 && consistency >= 60 && sentiment !== 'negative') {
    return { state: 'power', reasoning: 'Sync alto + boa consistência.', confidence: 0.85 };
  }
  if (score > 8 && trend === 'up') {
    return { state: 'power', reasoning: 'Sync alto e em alta.', confidence: 0.8 };
  }

  return { state: 'balanced', reasoning: 'Sinais estáveis.', confidence: 0.7 };
}

export const STATE_LABEL: Record<UserState, string> = {
  power: 'POWER',
  low: 'LOW',
  balanced: 'BALANCED',
};

export const STATE_COLOR: Record<UserState, string> = {
  power: 'hsl(142 72% 50%)',
  low: 'hsl(38 92% 55%)',
  balanced: 'hsl(220 9% 65%)',
};

export const STATE_INSIGHT: Record<UserState, string[]> = {
  power: [
    'Você está operando acima da média. Hoje é dia de progressão.',
    'Sistema calibrado. Aumente um pouco o desafio.',
    'Tudo verde. Empilhe um bloco extra hoje.',
  ],
  low: [
    'Sistema pedindo recuperação. Vamos no leve hoje.',
    'Dia de manter consistência, não intensidade.',
    'Reduzir é estratégia. Faça o mínimo viável e descanse.',
  ],
  balanced: [
    'Estado equilibrado. Mantenha o ritmo.',
    'Tudo dentro do esperado. Foco na execução.',
    'Sistema estável. Hora de evoluir com calma.',
  ],
};
