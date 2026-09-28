/**
 * Load Progression — projeção de carga relativa por exercício.
 * Lê histórico real em `workout_exercise_sets` e calcula regressão linear simples.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ProgressionPoint {
  weekIndex: number;
  label: string; // "Sem 1-3"
  realPct: number | null;
  projectedPct: number;
}

export async function loadCarryProjection(
  athleteId: string,
  exerciseName = "Agachamento",
): Promise<ProgressionPoint[]> {
  let history: { week: number; pct: number }[] = [];
  try {
    const { data } = await supabase
      .from("workout_exercise_sets" as any)
      .select("weight, reps, created_at, exercise_name")
      .ilike("exercise_name", `%${exerciseName}%`)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data?.length) {
      const baseline = Math.max(...data.map((r: any) => Number(r.weight) || 0)) || 1;
      const buckets = new Map<number, number[]>();
      const first = new Date((data[0] as any).created_at).getTime();
      data.forEach((r: any) => {
        const weeks = Math.floor((new Date(r.created_at).getTime() - first) / (7 * 86400 * 1000));
        const arr = buckets.get(weeks) ?? [];
        arr.push(((Number(r.weight) || 0) / baseline) * 100);
        buckets.set(weeks, arr);
      });
      history = [...buckets.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([w, arr]) => ({ week: w, pct: arr.reduce((s, v) => s + v, 0) / arr.length }));
    }
  } catch (e) {
    console.warn("[progression] fetch skipped", e);
  }

  // Sem histórico: gera projeção idealizada
  if (!history.length) {
    return [
      { weekIndex: 0, label: "Sem 1-3", realPct: null, projectedPct: 70 },
      { weekIndex: 1, label: "Sem 2-4", realPct: null, projectedPct: 78 },
      { weekIndex: 2, label: "Sem 1-6", realPct: null, projectedPct: 87 },
      { weekIndex: 3, label: "Sem 7-8", realPct: null, projectedPct: 94 },
    ];
  }

  // Regressão linear y = a + bx
  const n = history.length;
  const sx = history.reduce((s, p) => s + p.week, 0);
  const sy = history.reduce((s, p) => s + p.pct, 0);
  const sxy = history.reduce((s, p) => s + p.week * p.pct, 0);
  const sxx = history.reduce((s, p) => s + p.week * p.week, 0);
  const b = (n * sxy - sx * sy) / Math.max(1, n * sxx - sx * sx);
  const a = (sy - b * sx) / n;

  return [0, 2, 4, 6].map((w, idx) => {
    const real = history.find((h) => h.week === w)?.pct ?? null;
    return {
      weekIndex: idx,
      label: ["Sem 1-3", "Sem 2-4", "Sem 1-6", "Sem 7-8"][idx],
      realPct: real,
      projectedPct: Math.round(a + b * w),
    };
  });
}
