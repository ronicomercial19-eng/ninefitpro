/**
 * Training Agent — orquestra ajustes adaptativos de treino consumindo
 * contexto fisiológico (HRV, sono, recovery), periodização ativa e Skills.
 * Camada cliente: monta payload e invoca a edge function `training-ai-adjust`.
 */
import { supabase } from "@/integrations/supabase/client";
import { buildSkillContext } from "@/services/skills/skillRuntime";

export interface AdaptiveAdjustment {
  intensity: "leve" | "moderada" | "alta" | "maxima";
  intensityPct: number; // 0-100
  fatigueLevel: "baixa" | "moderada" | "alta";
  fatiguePct: number; // 0-100
  swaps: Array<{ from: string; to: string; reason: string }>;
  addOns: Array<{ exercise: string; sets: number; reps: string; reason: string }>;
  rationale: string;
  recoveryForecast: number; // % previsto para amanhã
  generatedAt: string;
}

export interface TrainingAgentContext {
  userId: string;
  athleteId?: string;
  workoutName?: string;
  workoutType?: string;
  recentRPE?: number;
}

export async function requestAdaptiveAdjustment(
  ctx: TrainingAgentContext,
): Promise<AdaptiveAdjustment | null> {
  try {
    const skillCtx = await buildSkillContext(ctx.userId, "training");
    const { data, error } = await supabase.functions.invoke("training-ai-adjust", {
      body: {
        userId: ctx.userId,
        athleteId: ctx.athleteId,
        workoutName: ctx.workoutName,
        workoutType: ctx.workoutType,
        recentRPE: ctx.recentRPE,
        bio: skillCtx.bio,
        profile: skillCtx.profile,
        activeSkills: skillCtx.activeSkills.map((s) => ({ slug: s.slug, category: s.category })),
      },
    });
    if (error) throw error;
    const payload = (data as any)?.data ?? data;
    if (!payload?.intensity) return null;
    return payload as AdaptiveAdjustment;
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
