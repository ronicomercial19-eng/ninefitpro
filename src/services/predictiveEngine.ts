/**
 * Predictive Engine — lê master_registry e gera flags + contexto
 * dinâmico para o HUB e demais módulos.
 */
import { supabase } from "@/integrations/supabase/client";

export type HubContext = "morning" | "training" | "recovery" | "post-purchase" | "night";

export interface PredictiveSnapshot {
  context: HubContext;
  flags: string[];
  priorityModule: string | null;
  insights: string[];
}

const hourContext = (): HubContext => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "training";
  if (h >= 17 && h < 22) return "recovery";
  return "night";
};

export async function loadPredictiveSnapshot(userId: string): Promise<PredictiveSnapshot> {
  if (!userId) {
    return { context: hourContext(), flags: [], priorityModule: null, insights: [] };
  }

  const { data: events } = await supabase
    .from("master_registry" as any)
    .select("event_type, source, payload, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const list = (events as any[]) || [];
  const flags: string[] = [];
  const insights: string[] = [];
  let priorityModule: string | null = null;
  let context: HubContext = hourContext();

  // Gatilho 1: Compra de Elástico (9Store)
  const elastic = list.find(
    (e) =>
      e.event_type === "purchase" &&
      typeof e.payload?.item === "string" &&
      e.payload.item.toLowerCase().includes("elást")
  );
  if (elastic) {
    flags.push("prioritize_elastic");
    priorityModule = "healthflix";
    context = "post-purchase";
    insights.push("HealthFlix priorizou conteúdo de elásticos pra você.");
  }

  // Gatilho 2: Sono ruim (Fit Copilot / wearable)
  const badSleep = list.find(
    (e) =>
      (e.event_type === "biometric" || e.event_type === "sleep") &&
      Number(e.payload?.sleep_score) > 0 &&
      Number(e.payload?.sleep_score) < 60
  );
  if (badSleep) {
    flags.push("reduce_load");
    priorityModule = priorityModule || "smarttreino";
    context = "recovery";
    insights.push("Sono baixo detectado. SmartTreino reduzirá carga em 10% e RON sugere Reset Neural.");
  }

  return { context, flags, priorityModule, insights };
}

export async function logPredictiveEvent(
  userId: string,
  event_type: string,
  payload: Record<string, any>,
  source?: string
) {
  if (!userId) return;
  await supabase.from("master_registry" as any).insert({
    user_id: userId,
    event_type,
    source: source || null,
    payload,
  });
}
