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
  restrictionReviewed?: boolean;
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
  periodization?: {
    model?: string | null;
    status?: string | null;
    notes?: string | null;
    phase?: string | null;
    category?: string | null;
    week?: number | null;
    rpeCap?: number | null;
  };
}

export async function requestAdaptiveAdjustment(
  ctx: TrainingAgentContext,
): Promise<AdaptiveAdjustment | null> {
  const decision = ctx.prescription ? decideContextualAdjustment({ prescription: ctx.prescription, request: ctx.request, reviewRequired: ctx.reviewRequired, restrictionReviewed: ctx.restrictionReviewed, calibration: ctx.calibration, rpeCap: ctx.periodization?.rpeCap ?? null, periodizationLabel: ctx.periodization?.phase ?? null }) : null;
  const fallback = decision ? { intensity: 'moderada' as const, swaps: [], changes: decision.changes, addOns: [], rationale: decision.rationale, generatedAt: new Date().toISOString(), contextual: decision } : null;
  // A medical alert or invalid prescription cannot be overridden by model output.
  if (decision?.kind === 'review') return fallback;
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
        reviewRequired: ctx.reviewRequired,
        periodization: ctx.periodization,
        bio: skillCtx.bio,
        profile: skillCtx.profile,
        activeSkills: skillCtx.activeSkills.map((s) => ({ slug: s.slug, category: s.category })),
      },
    });
    if (error) throw error;
    const payload = (data as any)?.data ?? data;
    if (!payload?.intensity) return fallback;
    // Accept reductions only; keep dose, rest, movement and baseline effort intact.
    const changes = ctx.prescription ? (Array.isArray(payload.changes) ? payload.changes : []).flatMap((change: AdaptiveAdjustment['changes'][number]) => {
      const base = ctx.prescription!.find(ex => ex.name.toLocaleLowerCase() === String(change.exercise).toLocaleLowerCase());
      if (!base) return [];
      const sets = Number.isInteger(change.sets) && change.sets! >= 1 && change.sets! < base.sets ? change.sets : undefined;
      const rpe = base.rpe != null && Number.isInteger(change.rpe) && change.rpe! >= 1 && change.rpe! < base.rpe ? change.rpe : undefined;
      return sets != null || rpe != null ? [{ exercise: base.name, sets, rpe, reason: String(change.reason || 'Redução conservadora sugerida pelo RON.') }] : [];
    }) : [];
    const combinedChanges = ctx.prescription?.flatMap(base => {
      const proposals = [...(decision?.changes ?? []), ...changes].filter(change => change.exercise === base.name);
      const sets = proposals.flatMap(change => change.sets == null ? [] : [change.sets]);
      const rpes = proposals.flatMap(change => change.rpe == null ? [] : [change.rpe]);
      if (!proposals.length) return [];
      return [{ exercise: base.name, sets: sets.length ? Math.min(...sets) : undefined, rpe: rpes.length ? Math.min(...rpes) : undefined, reason: proposals.map(change => change.reason).join(' ') }];
    }) ?? changes;
    return { intensity: 'leve', swaps: [], changes: combinedChanges, addOns: [], rationale: String(payload.rationale || decision?.rationale || ''), generatedAt: new Date().toISOString(), contextual: decision ? { ...decision, kind: changes.length ? 'reduce' : decision.kind } : undefined };
  } catch (err) {
    console.error("[trainingAgent] adjustment failed", err);
    return fallback;
  }
}

/** Persiste o ajuste aceito como snapshot de contexto + evento de IA. */
export async function persistAcceptedAdjustment(
  userId: string,
  adjustment: AdaptiveAdjustment,
) {
    const { error } = await supabase.from("ai_context_snapshots").insert({
      user_id: userId,
      context: { type: 'training_adjustment', adjustment } as any,
    });
    if (error) throw error;
}
