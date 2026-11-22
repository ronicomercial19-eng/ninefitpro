export const rhythmCategories = ["Água", "Nutrição", "Treino", "Mente"] as const;
export type RhythmCategory = typeof rhythmCategories[number];
export type RhythmEntry = { quickId?: string; category: RhythmCategory; date: string; label: string; amountMl?: number };
export type RhythmPoint = { date: string; value: number; records: number; selfReported: number };

/** Calendar arithmetic stays in UTC; the end date comes from businessDate in São Paulo. */
export function rhythmWeek(endDate: string): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(endDate + "T12:00:00Z");
    day.setUTCDate(day.getUTCDate() - 6 + index);
    return day.toISOString().slice(0, 10);
  });
}

export function rhythmSeries(entries: readonly RhythmEntry[], category: RhythmCategory, endDate: string): RhythmPoint[] {
  return rhythmWeek(endDate).map(date => {
    const rows = entries.filter(entry => entry.category === category && entry.date === date);
    return {
      date, records: rows.length,
      value: category === "Água" ? rows.reduce((sum, entry) => sum + (typeof entry.amountMl === "number" && Number.isFinite(entry.amountMl) ? entry.amountMl : 0), 0) : rows.length,
      selfReported: category === "Treino" ? rows.filter(entry => !!entry.quickId).length : 0,
    };
  });
}

export function rhythmSelection(dates: readonly string[], selected: string, key: string): string {
  const index = Math.max(0, dates.indexOf(selected));
  if (key === "Home") return dates[0] ?? selected;
  if (key === "End") return dates.at(-1) ?? selected;
  const next = key === "ArrowRight" ? index + 1 : key === "ArrowLeft" ? index - 1 : index;
  return dates[Math.max(0, Math.min(dates.length - 1, next))] ?? selected;
}

/** Horizontal cubic controls keep every segment within its two endpoints (no overshoot). */
export function rhythmCurve(points: readonly RhythmPoint[]) {
  const max = Math.max(1, ...points.map(point => point.value));
  const coordinates = points.map((point, index) => ({ x: (index + 0.5) * 300 / points.length, y: 112 - point.value / max * 88 }));
  const first = coordinates[0];
  if (!first) return { line: "", area: "", coordinates, max };
  let line = `M ${first.x} ${first.y}`;
  coordinates.slice(1).forEach((point, index) => {
    const previous = coordinates[index];
    if (!previous) return;
    const middle = (previous.x + point.x) / 2;
    line += ` C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  });
  return { line, area: `${line} L ${coordinates.at(-1)?.x ?? first.x} 124 L ${first.x} 124 Z`, coordinates, max };
}

export function rhythmRows(entries: readonly RhythmEntry[], dates: readonly string[], selected: string, entireWeek: boolean) {
  return entries.filter(entry => entireWeek ? dates.includes(entry.date) : entry.date === selected);
}