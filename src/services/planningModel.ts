export type PlanningMacro = { name: string; weeks?: number; duration_weeks?: number; focus?: string; volume_level?: string };
export type PlanningWave = { week?: number; start_week?: number; end_week?: number; weeks?: number; volume?: string | null; intensity?: string | null; status?: string; pct?: number };
export type PlanningSession = { workout_date: string; avg_rpe?: number | null; rpe?: number | null; total_volume_kg?: number | null; duration_minutes?: number | null };
export type PlanningDay = { count: number; rpe: number | null; vol: number | null; min: number | null };
const finite = (value: unknown): number | null => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
export function rangeMidpoint(value?: string | null): number | null {
  const values = (value || '').match(/\d+(?:[.,]\d+)?/g)?.map(v => Number(v.replace(',', '.')));
  return values?.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null;
}
export function planningWeeks(macros: PlanningMacro[], waves: PlanningWave[], currentWeek: number | null) {
  const volume = new Map<number, number>(), effort = new Map<number, number>();
  const length = (m: PlanningMacro) => Math.max(0, Math.min(104, Math.floor(finite(m.weeks ?? m.duration_weeks) ?? 0)));
  const total = macros.reduce((sum,m) => sum + length(m), 0);
  waves.forEach(wave => {
    const start = finite(wave.start_week ?? wave.week);
    const end = finite(wave.end_week ?? (start != null && wave.weeks ? start + wave.weeks - 1 : wave.week ?? start));
    if (start == null || end == null) return;
    const v = rangeMidpoint(wave.volume), r = rangeMidpoint(wave.intensity);
    for (let w = Math.max(1,Math.floor(start)); w <= Math.min(total,Math.floor(end)); w++) {
      if (v != null && v >= 0) volume.set(w,v);
      if (r != null && r >= 1 && r <= 10) effort.set(w,r);
    }
  });
  const weeks: {w:number; mi:number; deload:boolean; vol:number|null; rpe:number|null; lvl:number}[] = [];
  macros.forEach((macro,mi) => { const deload = /deload|transi/i.test(macro.name); const level = /alto|high/i.test(macro.volume_level || '') ? 100 : /baix|low/i.test(macro.volume_level || '') ? 40 : 70;
    for (let i=0;i<length(macro);i++) { const w=weeks.length+1; weeks.push({w,mi,deload,vol:volume.get(w)??null,rpe:effort.get(w)??null,lvl:level}); }
  });
  return {weeks, cur:Math.min(Math.max(Math.floor(finite(currentWeek)??1),1),Math.max(1,total)), hasVol:volume.size>=2, hasRpe:effort.size>=2};
}
export function aggregatePlanningSessions(rows: PlanningSession[]): Record<string, PlanningDay> {
  const days: Record<string,PlanningDay & { weightedRpe:number; rpeWeight:number }> = {};
  rows.forEach(row => {
    const date = row.workout_date?.slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const day = days[date] ??= {count:0,rpe:null,vol:null,min:null,weightedRpe:0,rpeWeight:0};
    day.count++;
    const duration=finite(row.duration_minutes),volume=finite(row.total_volume_kg),rpe=finite(row.avg_rpe??row.rpe);
    if(duration!=null && duration>=0) day.min=(day.min??0)+duration;
    if(volume!=null && volume>=0) day.vol=(day.vol??0)+volume;
    if(rpe!=null && rpe>=1 && rpe<=10) {const weight=duration!=null && duration>0?duration:1;day.weightedRpe+=rpe*weight;day.rpeWeight+=weight;day.rpe=day.weightedRpe/day.rpeWeight;}
  });
  return Object.fromEntries(Object.entries(days).map(([date,{count,rpe,vol,min}])=>[date,{count,rpe,vol,min}]));
}
export const planningTopic = (value: string) => value.replace(/[\r\n]+/g,' ').trim().slice(0,80);
