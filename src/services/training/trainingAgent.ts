/**
 * Training Agent — orquestra ajustes adaptativos de treino consumindo
 * contexto fisiológico (HRV, sono, recovery), periodização ativa e Skills.
 * Camada cliente: monta payload e invoca a edge function `training-ai-adjust`.
 */
import { supabase } from "@/integrations/supabase/client";
import { buildSkillContext } from "@/services/skills/skillRuntime";
import { decideContextualAdjustment, type ContextualDecision } from './contextualAdjustment';

export interface AdaptiveAdjustment {
  contextual?: ContextualDecision;
  intensity: "leve" | "moderada" | "alta" | "maxima";
  intensityPct?: number; // legacy AI payload only; contextual rules do not estimate physiology
  fatigueLevel?: "baixa" | "moderada" | "alta";
  fatiguePct?: number;
  swaps: Array<{ from: string; to: string; reason: string }>;
  changes: Array<{ exercise: string; sets?: number; reps?: string; restSeconds?: number; rpe?: number; reason: string }>;
  addOns: Array<{ exercise: string; sets: number; reps: string; reason: string }>;
  rationale: string;
  recoveryForecast?: number;
  generatedAt: string;
  pdiAvailable?: boolean;
}

export interface TrainingAgentContext {
  calibration?: { sleep: number | null; energy: number | null };
  reviewRequired?: boolean;
  userId: string;
  athleteId?: string;
  workoutName?: string;
  workoutType?: string;
  recentRPE?: number;
  exercises?: string[];
  prescription?: Array<{ name: string; sets: number; reps: string; restSeconds: number; rpe?: number }>;
  date?: string;
  request?: string;
  sync?: number | null;
  dayNumber?: number | null;
  focusMuscles?: string[];
  safetyReason?: string | null;
  painRegion?: string | null;
  periodization?: { model?: string | null; status?: string | null; notes?: string | null };
}

export async function requestAdaptiveAdjustment(
  ctx: TrainingAgentContext,
): Promise<AdaptiveAdjustment | null> {
  if (ctx.prescription) {
    const decision = decideContextualAdjustment({ prescription: ctx.prescription, request: ctx.request, reviewRequired: ctx.reviewRequired || !!ctx.safetyReason || !!ctx.painRegion, calibration: ctx.calibration });
    return { intensity: 'moderada', swaps: [], changes: decision.changes, addOns: [], rationale: decision.rationale, generatedAt: new Date().toISOString(), contextual: decision };
  }
  try {
    const skillCtx = await buildSkillContext(ctx.userId, "training");
    const { data, error } = await supabase.functions.invoke("training-ai-adjust", {
      body: {
        userId: ctx.userId,
        athleteId: ctx.athleteId,
        workoutName: ctx.workoutName,
        workoutType: ctx.workoutType,
        recentRPE: ctx.recentRPE,
        exercises: ctx.exercises,
        prescription: ctx.prescription,
        date: ctx.date,
        request: ctx.request,
        sync: ctx.sync,
        dayNumber: ctx.dayNumber,
        focusMuscles: ctx.focusMuscles,
        safetyReason: ctx.safetyReason,
        painRegion: ctx.painRegion,
        periodization: ctx.periodization,
        bio: skillCtx.bio,
        profile: skillCtx.profile,
        activeSkills: skillCtx.activeSkills.map((s) => ({ slug: s.slug, category: s.category })),
      },
    });
    if (error) throw error;
    const payload = (data as any)?.data ?? data;
    if (!payload?.intensity) return null;
    return { ...payload, swaps: Array.isArray(payload.swaps) ? payload.swaps : [], changes: Array.isArray(payload.changes) ? payload.changes : [], addOns: Array.isArray(payload.addOns) ? payload.addOns : [] } as AdaptiveAdjustment;
  } catch (err) {
    console.error("[trainingAgent] adjustment failed", err);
    return null;
  }
}

/** Persiste o ajuste aceito como snapshot de contexto + evento de IA. */
export async function persistAcceptedAdjustment(
  userId: string,
  adjustment: AdaptiveAdjustment,
) {
  try {
    await supabase.from("ai_context_snapshots" as any).insert({
      user_id: userId,
      snapshot_type: "training_adjustment",
      payload: adjustment as any,
    });
  } catch (e) {
    console.warn("[trainingAgent] snapshot persist skipped", e);
  }
}
