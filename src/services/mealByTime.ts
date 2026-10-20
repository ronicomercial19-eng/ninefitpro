// Regra do "Registrar refeição": casa o horário do registro com a refeição.
// 1) Com plano ativo que traga refeições com horário (diet_data.meals / refeicoes): refeição de horário mais próximo (janela ±90 min).
// 2) Sem plano (ou fora da janela): faixas padrão, fuso America/Sao_Paulo.
// 3) Se a refeição já foi registrada hoje, sugere a próxima ainda não registrada.

export interface PlanMeal { name: string; time?: string }
export interface MealSuggestion { name: string; planned: boolean; alreadyLogged: boolean; note?: string }

const WINDOW_MIN = 90;

// minutos desde 00:00
const DEFAULT_BANDS: { name: string; from: number; to: number }[] = [
  { name: 'Café da manhã', from: 5 * 60, to: 10 * 60 - 1 },           // 05:00–09:59
  { name: 'Lanche da manhã', from: 10 * 60, to: 11 * 60 + 29 },       // 10:00–11:29
  { name: 'Almoço', from: 11 * 60 + 30, to: 15 * 60 - 1 },            // 11:30–14:59
  { name: 'Lanche da tarde', from: 15 * 60, to: 18 * 60 - 1 },        // 15:00–17:59
  { name: 'Jantar', from: 18 * 60, to: 21 * 60 + 29 },                // 18:00–21:29
];
const CEIA = 'Ceia'; // 21:30–04:59
export const MEAL_ORDER = [...DEFAULT_BANDS.map((b) => b.name), CEIA];

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function minutesNowSP(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

function toMinutes(time?: string): number | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]), m = Number(match[2]);
  return h > 23 || m > 59 ? null : h * 60 + m;
}

function defaultMealFor(min: number): string {
  return DEFAULT_BANDS.find((b) => min >= b.from && min <= b.to)?.name ?? CEIA;
}

// Lê refeições do plano quando diet_data traz uma lista com nome e horário. Formato desconhecido => [] (cai nas faixas padrão).
export function planMealsFromDiet(data: unknown): PlanMeal[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, unknown>;
  const list = (d.meals ?? d.refeicoes ?? d.refeições) as unknown;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const r = (item ?? {}) as Record<string, unknown>;
      const name = String(r.name ?? r.nome ?? r.meal_name ?? '').trim();
      const time = String(r.time ?? r.horario ?? r.horário ?? '').trim();
      return name ? { name, time: time || undefined } : null;
    })
    .filter((x): x is { name: string; time: string | undefined } => x !== null);
}

export function resolveMealByTime({ now = new Date(), planMeals = [], logged = [] }: { now?: Date; planMeals?: PlanMeal[]; logged?: string[] }): MealSuggestion {
  const min = minutesNowSP(now);
  const loggedSet = new Set(logged.map(norm));

  const timed = planMeals
    .map((m) => ({ ...m, min: toMinutes(m.time) }))
    .filter((m): m is PlanMeal & { min: number } => m.min !== null)
    .sort((a, b) => a.min - b.min);

  let base = '';
  let planned = false;
  if (timed.length) {
    const closest = timed.reduce((best, m) => (Math.abs(m.min - min) < Math.abs(best.min - min) ? m : best));
    if (Math.abs(closest.min - min) <= WINDOW_MIN) { base = closest.name; planned = true; }
  }
  if (!base) base = defaultMealFor(min);

  if (!loggedSet.has(norm(base))) return { name: base, planned, alreadyLogged: false };

  const sequence = timed.length && planned ? timed.map((m) => m.name) : MEAL_ORDER;
  const startIdx = sequence.findIndex((n) => norm(n) === norm(base));
  const next = sequence.slice(startIdx + 1).find((n) => !loggedSet.has(norm(n)));
  if (next) return { name: next, planned, alreadyLogged: true, note: `Você já registrou ${base} hoje. Sugerindo ${next}. Pode trocar.` };
  return { name: base, planned, alreadyLogged: true, note: `Você já registrou ${base} hoje. Escolha a refeição se quiser registrar outra.` };
}
