// Shared PDI helper for Supabase Edge Functions.
// Uso: chame classifyScore(supabase, userId, score) ANTES de gerar protocolo.
// Os thresholds são RELATIVOS ao histórico do próprio usuário (fn_compute_user_thresholds).
//
// Importar em uma edge function:
//   import { classifyScore, loadUserParameters } from "../_shared/pdi.ts";

export type ScoreLabel = "recovery" | "light" | "normal" | "intense";
export interface PDI {
  recovery_rate: "fast" | "medium" | "slow";
  volume_tolerance: number;
  peak_window: "morning" | "afternoon" | "night";
  injury_zones: string[];
  consistency_30d: number;
  stress_sensitivity: number;
  goal: "performance" | "aesthetics" | "longevity" | "recomposition";
  time_horizon: number;
  discomfort_tolerance: "aggressive" | "moderate" | "conservative";
  base_location_sp: string | null;
  dietary_restrictions: string[];
}

export async function loadUserParameters(supabase: any, userId: string): Promise<PDI | null> {
  const { data } = await supabase
    .from("user_parameters")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as PDI | null;
}

export async function loadThresholds(
  supabase: any,
  userId: string,
): Promise<{ low: number; mid: number; high: number; mode: string; n: number }> {
  const { data } = await supabase.rpc("fn_compute_user_thresholds", { p_user_id: userId });
  return data ?? { low: 40, mid: 60, high: 80, mode: "cold_start", n: 0 };
}

/**
 * Classifica um score (0-100) usando thresholds RELATIVOS ao próprio usuário.
 * NUNCA usar `if (score < 50)` fixo em outras funções — sempre chamar isto.
 */
export async function classifyScore(
  supabase: any,
  userId: string,
  score: number,
): Promise<ScoreLabel> {
  const t = await loadThresholds(supabase, userId);
  if (score < t.low) return "recovery";
  if (score < t.mid) return "light";
  if (score < t.high) return "normal";
  return "intense";
}

/**
 * Modula o protocolo do dia baseado no PDI + classificação.
 */
export function adjustForPDI(
  baseProtocol: { volume: number; intensity: number },
  pdi: PDI | null,
  label: ScoreLabel,
): { volume: number; intensity: number; notes: string[] } {
  const notes: string[] = [];
  let { volume, intensity } = baseProtocol;

  if (label === "recovery") { volume *= 0.4; intensity *= 0.5; notes.push("recovery_day"); }
  else if (label === "light") { volume *= 0.7; intensity *= 0.75; notes.push("light_day"); }
  else if (label === "intense") { volume *= 1.15; intensity *= 1.1; notes.push("peak_day"); }

  if (pdi) {
    volume *= 0.6 + (pdi.volume_tolerance / 10) * 0.6; // 0.6x..1.2x
    if (pdi.recovery_rate === "slow") { volume *= 0.85; notes.push("slow_recovery_dampener"); }
    if (pdi.discomfort_tolerance === "conservative") { intensity *= 0.9; }
    if (pdi.discomfort_tolerance === "aggressive") { intensity *= 1.05; }
    if ((pdi.injury_zones || []).length) notes.push(`avoid:${pdi.injury_zones.join(",")}`);
  }
  return { volume: Math.round(volume), intensity: Math.round(intensity), notes };
}
