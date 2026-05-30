/**
 * Skill-Driven Calibration Engine.
 * Recebe perfil + objetivos + skills ativas + protocolos + histórico
 * e devolve plano calibrado (intensidade, volume, módulos sugeridos, próximos protocolos).
 */
import { supabase } from "@/integrations/supabase/client";

export interface CalibrationInput {
  userId: string;
  profile?: any;
  goals?: string[];
  activeSkills?: string[];
  recentProtocols?: string[];
  results?: any;
}

export interface CalibrationPlan {
  intensity: "low" | "medium" | "high";
  volume: number; // 0-100
  recommendedModules: string[];
  nextProtocols: string[];
  rationale: string;
}

export async function calibrate(input: CalibrationInput): Promise<CalibrationPlan> {
  const skills = input.activeSkills?.length ?? 0;
  const goals = input.goals ?? [];
  const intensity: CalibrationPlan["intensity"] =
    goals.includes("performance") ? "high" : goals.includes("recuperacao") ? "low" : "medium";
  const volume = Math.min(100, 40 + skills * 10);

  const plan: CalibrationPlan = {
    intensity,
    volume,
    recommendedModules: [
      "planejamento",
      intensity === "high" ? "ajuste_treino" : "ron",
      "progress",
    ],
    nextProtocols: intensity === "low" ? ["recovery"] : ["energy", "performance"],
    rationale: `Calibrado a partir de ${skills} skills ativas e objetivos: ${goals.join(", ") || "geral"}.`,
  };

  try {
    await supabase.from("ai_context_snapshots" as any).insert({
      user_id: input.userId,
      snapshot_type: "calibration",
      payload: plan,
    });
  } catch { /* tabela opcional */ }

  return plan;
}
