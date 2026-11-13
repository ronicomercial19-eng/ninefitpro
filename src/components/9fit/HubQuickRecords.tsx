import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { businessDate } from "@/services/dailyContextRules";

const categories = ["Água", "Nutrição", "Treino", "Mente"] as const;
type Category = typeof categories[number];
type Entry = { quickId?: string; category: Category; date: string; label: string };
type Meal = { name: string; time?: string };
const source = "fitpro_hub_quick";

export function HubQuickRecords({ athleteId, userId, onToday }: {
  athleteId: string;
  userId: string;
  onToday: (snapshot: { athleteId: string; date: string; records: Category[] }) => void;
}) {
  const [clock, setClock] = useState(() => new Date());
  const date = businessDate(clock);
  const first = new Date(date + "T12:00:00Z");
  first.setUTCDate(first.getUTCDate() - 6);
  const start = first.toISOString().slice(0, 10);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [planId, setPlanId] = useState<string>();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [choice, setChoice] = useState(false);
  const [busy, setBusy] = useState<Category>();
  const [failure, setFailure] = useState<Category>();
  const [loadError, setLoadError] = useState(false);
  const pending = useRef<{ key: string; id: string } | null>(null);
  const locked = useRef(false);
  const request = useRef(0);
  const [readyDate, setReadyDate] = useState<string>();

  async function refresh() {
    const sequence = ++request.current;
    const [water, nutrition, workouts, quick, diet] = await Promise.all([
      supabase.from("hydration_logs").select("log_date,amount_ml").eq("athlete_id", athleteId).gte("log_date", start).lte("log_date", date),
      supabase.from("nutrition_logs").select("date,meal_name").eq("athlete_id", athleteId).gte("date", start).lte("date", date),
      supabase.from("workout_executions").select("workout_date").eq("athlete_id", athleteId).eq("status", "completed").eq("completion_valid", true).gte("workout_date", start).lte("workout_date", date),
      supabase.from("master_registry").select("id,payload").eq("user_id", userId).eq("source", source).eq("payload->>athlete_id", athleteId).gte("payload->>date", start).lte("payload->>date", date),
      supabase.from("vw_fitpro_diet_context").select("diet_assignment_id,diet_data,start_date,end_date,is_active").eq("athlete_id", athleteId).maybeSingle(),
    ]);
    if (sequence !== request.current) return;
    if ([water, nutrition, workouts, quick].some(result => result.error)) { setLoadError(true); return; }
    setLoadError(false);
    const records: Entry[] = [
      ...(water.data ?? []).map(row => ({ category: "Água" as const, date: row.log_date, label: row.amount_ml + " ml" })),
      ...(nutrition.data ?? []).map(row => ({ category: "Nutrição" as const, date: row.date, label: row.meal_name })),
      ...(workouts.data ?? []).map(row => ({ category: "Treino" as const, date: row.workout_date, label: "Sessão concluída" })),
    ];
    for (const row of quick.data ?? []) {
      const value = row.payload as Partial<Entry> | null;
      if (value?.category && categories.includes(value.category) && value.date && value.label) records.push({ ...value as Entry, quickId: row.id });
    }
    const plan = diet.data;
    setPlanId(plan?.diet_assignment_id ?? undefined);
    const data = plan?.diet_data as { meals?: Meal[] } | null;
    setMeals(plan?.is_active && (!plan.start_date || plan.start_date <= date) && (!plan.end_date || plan.end_date >= date) && Array.isArray(data?.meals)
      ? data.meals.filter(meal => typeof meal?.name === "string" && meal.name.trim()) : []);
    setEntries(records);
    setReadyDate(date);
    onToday({ athleteId, date, records: categories.filter(category => records.some(row => row.date === date && row.category === category)) });
  }

  useEffect(() => {
    void refresh();
    const events = ["9fit:sync_updated", "9fit:nutrition-updated", "9fit:workout-updated", "9fit:water-updated", "9fit:hydration-updated"];
    const update = () => void refresh();
    events.forEach(event => window.addEventListener(event, update));
    const onVisible = () => { if (document.visibilityState === "visible") update(); };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => setClock(new Date()), 15_000);
    return () => { ++request.current; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); events.forEach(event => window.removeEventListener(event, update)); };
  }, [athleteId, userId, date]);

  const today = entries.filter(row => row.date === date);
  const now = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(clock);
  const minute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const nearby = meals.filter(meal => meal.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(meal.time) && Math.abs(minute(meal.time) - minute(now)) <= 60);
  const suggested = nearby.length === 1 ? nearby[0] : undefined;

  async function save(category: Category, label: string) {
    if (locked.current || businessDate() !== date) return;
    locked.current = true;
    setBusy(category);
    setFailure(undefined);
    const key = JSON.stringify([date, category, label]);
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
    const id = pending.current.id;
    try {
      const result = category === "Água"
        ? await supabase.from("hydration_logs").insert({ id, athlete_id: athleteId, log_date: date, amount_ml: 500 })
        : category === "Nutrição"
          ? await supabase.rpc("fn_hub_confirm_meal" as any, { p_id: id, p_plan: planId, p_date: date, p_name: label })
          : await supabase.from("master_registry").insert({ id, user_id: userId, source, event_type: "hub_quick_record", payload: { category, date, label, athlete_id: athleteId, self_reported: true } });
      if (result.error && result.error.code !== "23505") throw result.error;
      pending.current = null;
      setChoice(false);
      await refresh();
      window.dispatchEvent(new Event("9fit:sync_updated"));
    } catch {
      setFailure(category);
      if (category === "Nutrição") await refresh();
    } finally {
      locked.current = false;
      setBusy(undefined);
    }
  }

  const [deleteError, setDeleteError] = useState(false);
  async function remove(entry: Entry) {
    if (!entry.quickId || locked.current || !window.confirm("Excluir este registro?")) return;
    locked.current = true;
    setBusy(entry.category);
    setDeleteError(false);
    try {
      const { data, error } = await supabase.from("master_registry").delete()
        .eq("id", entry.quickId).eq("user_id", userId).eq("source", source).select("id").maybeSingle();
      if (error || !data) throw error ?? new Error("Registro não encontrado.");
      await refresh();
      window.dispatchEvent(new Event("9fit:sync_updated"));
    } catch {
      setDeleteError(true);
    } finally {
      locked.current = false;
      setBusy(undefined);
    }
  }

  const buttons = [
    { category: "Água" as const, action: "+500 ml", label: "500 ml" },
    { category: "Nutrição" as const, action: suggested ? "Fiz: " + suggested.name : "Escolher refeição", label: suggested?.name },
    { category: "Treino" as const, action: "Treinei hoje", label: "Treino autorrelatado" },
    { category: "Mente" as const, action: "Fiz uma pausa", label: "Pausa mental" },
  ];

  return <section className="space-y-4">
    <div className="grid grid-cols-2 gap-2">
      {categories.map(category => {
        const rows = entries.filter(row => row.category === category);
        const days = new Set(rows.map(row => row.date)).size;
        return <details key={category} className="min-w-0 rounded-xl border border-border p-3 text-sm">
          <summary className="min-h-11 cursor-pointer font-semibold">{category}<span className="block text-xs text-muted-foreground">{days} de 7 dias com registro</span></summary>
          <progress className="w-full accent-primary" aria-label={category + " nos últimos sete dias"} max={7} value={days} />
          <ul className="space-y-1 text-xs">{rows.map((row, index) => <li key={row.quickId ?? index}>{row.date.split("-").reverse().join("/")} · {row.label}{row.quickId && <button type="button" disabled={!!busy} className="block min-h-11 text-primary" onClick={() => void remove(row)}>Excluir {row.label}</button>}</li>)}</ul>
        </details>;
      })}
    </div>
    <h2 className="font-semibold">Registro rápido</h2>{deleteError && <p role="alert">Não foi possível excluir o registro. Tente novamente.</p>}
    {loadError && <button className="min-h-11 text-sm text-primary" onClick={() => void refresh()}>Não foi possível atualizar. Tentar novamente</button>}
    <div className="grid grid-cols-2 gap-2">
      {buttons.map(({ category, action, label }) => {
        const rows = today.filter(row => row.category === category);
        const done = category === "Nutrição" ? rows.some(row => row.label === label) : category !== "Água" && rows.length > 0;
        return <button key={category} type="button" disabled={!!busy || done || loadError || readyDate !== date}
          className="min-h-20 rounded-xl border border-border bg-card p-3 text-left text-sm disabled:opacity-75"
          onClick={() => label ? void save(category, label) : setChoice(value => !value)}>
          <span className="block text-xs text-muted-foreground">{category}</span>
          <strong className="text-primary">{busy === category ? "Salvando…" : failure === category ? "Tentar novamente" : done ? "Registrado" : action}</strong>
          {!!rows.length && <span className="block text-xs text-emerald-400">{category === "Água" ? rows.reduce((total, row) => total + parseInt(row.label, 10), 0) + " ml hoje" : rows.at(-1)?.label}</span>}
        </button>;
      })}
    </div>
    {choice && <div className="flex flex-wrap gap-2" aria-label="Escolher refeição">
      {meals.map((meal, index) => <button key={index} type="button" className="min-h-11 rounded-lg border border-border px-3 text-sm" disabled={!!busy || today.some(row => row.category === "Nutrição" && row.label === meal.name)} onClick={() => void save("Nutrição", meal.name)}>{meal.name}</button>)}
      {!meals.length && <a className="text-sm text-primary" href="/9fit/dieta?action=log">Registrar refeição no diário</a>}
    </div>}
  </section>;
}
