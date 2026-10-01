import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek } from "date-fns";
export interface ProgressionPoint { weekIndex: number; label: string; realPct: number | null; projectedPct: number; }
export async function loadCarryProjection(athleteId: string, exerciseName = "Agachamento"): Promise<ProgressionPoint[]> {
  const { data, error } = await supabase.from("workout_exercise_sets")
    .select("actual_weight, created_at, workout_executions!inner(athlete_id)")
    .eq("workout_executions.athlete_id", athleteId).eq("completed", true).gt("actual_weight", 0)
    .ilike("exercise_name", `%${exerciseName}%`).order("created_at", { ascending: false }).limit(1000);
  if (error) throw error;
  const rows = [...(data || [])].reverse();
  if (!rows.length) return [];
  const buckets = new Map<number, number[]>();
  for (const row of rows) {
    const week = startOfWeek(new Date(row.created_at), { weekStartsOn: 1 }).getTime();
    const values = buckets.get(week) || [];
    values.push(Number(row.actual_weight)); buckets.set(week, values);
  }
  const weeks = [...buckets.keys()].sort((a,b) => a-b);
  const baseline = Math.max(...buckets.get(weeks[0])!);
  const history = weeks.map(week => ({ week: Math.round((week-weeks[0])/604800000), pct: Math.max(...buckets.get(week)!)/baseline*100 }));
  const n=history.length, sx=history.reduce((s,p)=>s+p.week,0), sy=history.reduce((s,p)=>s+p.pct,0);
  const sxx=history.reduce((s,p)=>s+p.week*p.week,0), sxy=history.reduce((s,p)=>s+p.week*p.pct,0);
  const slope=n>1 ? (n*sxy-sx*sy)/(n*sxx-sx*sx) : 0, intercept=(sy-slope*sx)/n;
  const last=history[history.length-1].week;
  return Array.from({length:last+5},(_,week)=>({
    weekIndex:week, label:format(new Date(weeks[0]+week*604800000), "dd/MM"),
    realPct:history.find(p=>p.week===week)?.pct ?? null,
    projectedPct:Math.max(0,Math.round(intercept+slope*week)),
  }));
}
