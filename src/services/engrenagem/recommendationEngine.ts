/**
 * Recommendation Engine — Squad Insights.
 * Reads athlete state + recent bio logs and outputs prioritized recommendations
 * for the OS dashboard and Hub. Mirrors the v2 prototype's agentService.
 */
import { supabase } from '@/integrations/supabase/client';
import { fetchDailyContext } from '@/services/dailyContext';

export type Squad = 'EPSILON' | 'BETA' | 'ZETA' | 'OMEGA' | 'SIGMA';
export type InsightPriority = 'high' | 'medium' | 'low';

export interface SquadInsight {
  id: string;
  squad: Squad;
  title: string;
  message: string;
  cta?: { label: string; route: string };
  priority: InsightPriority;
  icon: 'recovery' | 'training' | 'nutrition' | 'mindset' | 'premium' | 'analytics';
}

interface EngrenagemContext {
  athleteId: string | null;
  totalXp: number;
  level: number;
  syncScore: number;
  streak: number;
  lastHrv?: number | null;
  lastSleepH?: number | null;
  hasActiveProtocol?: boolean;
  isPremium?: boolean;
}

export async function loadEngrenagemContext(): Promise<EngrenagemContext> {
  const { data: { user } } = await supabase.auth.getUser();
  const ctx: EngrenagemContext = {
    athleteId: null, totalXp: 0, level: 1, syncScore: 0, streak: 0,
  };
  if (!user) return ctx;

  const { data: canonicalId } = await supabase.rpc("fn_current_athlete_id");
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, total_xp, level, sync_score')
    .eq('id', canonicalId || '')
    .maybeSingle();
  if (athlete) {
    ctx.athleteId = (athlete as any).id;
    ctx.totalXp = (athlete as any).total_xp ?? 0;
    ctx.level = (athlete as any).level ?? 1;
    ctx.syncScore = (athlete as any).sync_score ?? 0;
  }

  try {
    const { data: hrv } = await supabase
      .from('bio_hrv_logs' as any)
      .select('hrv_ms').eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    ctx.lastHrv = (hrv as any)?.hrv_ms ?? null;
  } catch { /* table may not exist */ }

  try {
    const { data: sleep } = await supabase
      .from('bio_sleep_logs' as any)
      .select('hours, duration_min').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    ctx.lastSleepH = (sleep as any)?.hours ?? ((sleep as any)?.duration_min == null ? null : (sleep as any).duration_min / 60) ?? null;
  } catch { /* ignore */ }

  if (ctx.athleteId) {
    const { count } = await supabase
      .from('student_library_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', ctx.athleteId)
      .is('completed_at', null);
    ctx.hasActiveProtocol = (count ?? 0) > 0;
  }

  try { const day = await fetchDailyContext(); ctx.syncScore = day.sync.value ?? 0; ctx.streak = day.streak; } catch { /* Do not infer new readiness from failed context reads. */ ctx.syncScore = 0; }
  return ctx;
}

export function getSquadInsights(ctx: EngrenagemContext): SquadInsight[] {
  const insights: SquadInsight[] = [];

  // EPSILON — recorded routine; the score never authorizes a load change
  if (ctx.syncScore >= 70) {
    insights.push({
      id: 'epsilon-progress',
      squad: 'EPSILON',
      title: 'Confira seu treino de hoje',
      message: 'Seus sinais e registros estão disponíveis. Siga a prescrição e revise qualquer dor antes de começar.',
      cta: { label: 'Iniciar treino', route: '/9fit/train' },
      priority: 'high',
      icon: 'training',
    });
  } else if (ctx.syncScore < 45) {
    insights.push({
      id: 'epsilon-deload',
      squad: 'EPSILON',
      title: 'Confira seus sinais de hoje',
      message: 'A leitura pede atenção. Revise a calibração e seu plano com o profissional antes de mudar cargas.',
      cta: { label: 'Ver protocolo leve', route: '/9fit/protocolo' },
      priority: 'high',
      icon: 'recovery',
    });
  }

  // BETA — recovery
  if (ctx.lastSleepH != null && ctx.lastSleepH < 6.5) {
    insights.push({
      id: 'beta-sleep',
      squad: 'BETA',
      title: 'Dívida de sono detectada',
      message: `Últ. noite ${ctx.lastSleepH.toFixed(1)}h. Antecipe rotina noturna em 45min.`,
      cta: { label: 'Protocolo de sono', route: '/9fit/protocolo' },
      priority: 'high',
      icon: 'recovery',
    });
  }

  // ZETA — nutrition
  insights.push({
    id: 'zeta-nutrition',
    squad: 'ZETA',
    title: 'Registro nutricional do dia',
    message: 'Logue suas refeições para alimentar o motor de recomendação.',
    cta: { label: 'Abrir dieta', route: '/9fit/dieta' },
    priority: 'medium',
    icon: 'nutrition',
  });

  // OMEGA — mindset / check-in
  if (ctx.streak === 0) {
    insights.push({
      id: 'omega-streak',
      squad: 'OMEGA',
      title: 'Comece uma sequência',
      message: 'Um check-in agora abre seu primeiro streak.',
      cta: { label: 'Check-in rápido', route: '/9fit/os' },
      priority: 'medium',
      icon: 'mindset',
    });
  }

  // SIGMA — premium
  if (!ctx.isPremium && ctx.level >= 3) {
    insights.push({
      id: 'sigma-prime',
      squad: 'SIGMA',
      title: 'Você é candidato ao PRIME',
      message: 'Protocolos elite + RON ilimitado liberam sua próxima curva.',
      cta: { label: 'Explorar PRIME', route: '/9fit/prime' },
      priority: 'medium',
      icon: 'premium',
    });
  }

  return insights.sort((a, b) => {
    const w = { high: 0, medium: 1, low: 2 };
    return w[a.priority] - w[b.priority];
  }).slice(0, 5);
}

export const RecommendationEngine = { loadEngrenagemContext, getSquadInsights };
