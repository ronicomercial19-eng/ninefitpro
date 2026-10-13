import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, startOfWeek, subDays, subWeeks, addDays, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { ProgressionPoint } from "@/services/training/loadProgression";
import "./planejamento-pro.css";

/**
 * Planejamento do aluno — dinâmico + interativo, padrão Nine Pro (brandbook).
 * Fontes: vw_athlete_periodizacao_ativa (plano padronizado) e workout_executions (presença/esforço).
 * Campo ausente = não aparece (sem dado de exemplo).
 * Regra de produto: o ano inteiro é um mapa; o detalhe é só de HOJE e é sobre COMO executar.
 * O que treinar fica em /9fit/train.
 *
 * PADRÃO DA VIEW (vw_athlete_periodizacao_ativa):
 *  - macrocycle[]: { name, weeks }   waves[]: { start_week, end_week, volume, intensity, status, pct }
 *  - current_week_index (1-based) calculado pela data; rpe_cap/reps_range/sets_range da onda atual.
 *  - waves[].status: completed | current | upcoming  (não existe "active"/"done")
 */

type Macro = { name: string; weeks?: number; duration_weeks?: number; focus?: string; volume_level?: string };
type Wave = { week?: number; start_week?: number; end_week?: number; volume?: string | null; intensity?: string | null };
type Plan = {
  macrocycle: Macro[] | null;
  mesocycle?: any[] | null;
  waves: Wave[] | null;
  current_phase: string | null;
  current_week_index: number | null;
  rpe_cap: string | null;
  reps_range: string | null;
  sets_range: string | null;
  intensity_pct_1rm: string | null;
  weekly_split: { dias?: unknown[] } | null;
};
type Exec = { rpe: number | null; vol: number | null; min: number | null };
type Metric = "plano" | "carga" | "esforco" | "presenca" | "forca";

interface Props {
  athleteId?: string;
  /** Aumente para forçar recarregar o plano (ex.: após sincronizar). */
  reloadKey?: number;
  /** Datas (yyyy-MM-dd) de treinos programados: ficam com borda tracejada no calendário. */
  plannedDates?: string[];
  /** Projeção de carga (loadCarryProjection). A aba Força só aparece com ao menos 1 ponto real. */
  forca?: ProgressionPoint[];
  /** Abre o RON com contexto. Sem esta prop os botões do RON não aparecem. */
  onAskRon?: (topic: string) => void;
  /** CTA único da tela. */
  onStart?: () => void;
  /** Mês exibido no calendário (controlado pela página). Sem esta prop, usa o mês atual. */
  month?: Date;
  /** Navegação de mês. Sem esta prop, os botões de mês não aparecem. */
  onMonthChange?: (month: Date) => void;
  /** Toque em dia programado e ainda não treinado (ex.: abrir o Train naquela data). */
  onPlannedDayClick?: (date: string) => void;
  /** Avisa quando o plano carregou (true) ou não existe (false). Usado para o evento first_plan. */
  onPlanLoaded?: (hasPlan: boolean) => void;
}

const W = 400, H = 170, PADX = 8, PADB = 26, PADT = 18;

const mw = (m: Macro) => Number(m.weeks ?? m.duration_weeks) || 0;
const level = (s?: string) => {
  const t = (s || "").toLowerCase();
  if (/alto|high/.test(t)) return 100;
  if (/baix|low/.test(t)) return 40;
  if (/moder|m[eé]di/.test(t)) return 70;
  return null;
};
const midpoint = (s?: string | null) => {
  const n = (s || "").match(/\d+(?:[.,]\d+)?/g)?.map((x) => parseFloat(x.replace(",", ".")));
  return n?.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
};
const range = (v: string | null, unit = "") => (v ? `${String(v).replace("-", "–")}${unit}` : null);
const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

const EXPLAIN: Record<string, string> = {
  intensity: "do seu 1RM, a carga máxima de 1 repetição. Ela muda conforme você evolui.",
  reps: "por série. Poucas repetições priorizam carga e força, muitas priorizam volume.",
  rpe: "é a escala de esforço de 1 a 10. RPE 8 equivale a sobrarem cerca de 2 repetições no fim da série.",
  sets: "por grupo muscular, somando a semana toda. É o volume semanal e cai nas semanas de deload.",
};

export default function PlanejamentoPro({ athleteId, reloadKey = 0, plannedDates = [], forca = [], month, onMonthChange, onPlannedDayClick, onAskRon, onStart, onPlanLoaded }: Props) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [execs, setExecs] = useState<Record<string, Exec>>({});
  const [metric, setMetric] = useState<Metric>("plano");
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [openExe, setOpenExe] = useState<string | null>(null);
  const viewMonth = useMemo(() => startOfMonth(month ?? new Date()), [month]);
  const monthKey = format(viewMonth, "yyyy-MM");

  async function loadPlan() {
    if (!athleteId) return;
    const { data, error } = await supabase
      .from("vw_athlete_periodizacao_ativa" as any)
      .select("macrocycle, mesocycle, waves, current_phase, current_week_index, rpe_cap, reps_range, sets_range, intensity_pct_1rm, weekly_split")
      .eq("athlete_id", athleteId)
      .order("assigned_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error) { console.error("[PlanejamentoPro] loadPlan:", error); setLoadError(true); setLoading(false); return; }
    setLoadError(false);
    setPlan((data as any) ?? null);
    setLoading(false);
  }

  // Treinos concluídos das últimas 12 semanas: presença, esforço e sequência.
  async function loadPresence() {
    if (!athleteId) return;
    const since84 = subDays(new Date(), 84);
    const monthStart = startOfMonth(viewMonth);
    const since = format(monthStart < since84 ? monthStart : since84, "yyyy-MM-dd");
    const { data } = await supabase
      .from("workout_executions" as any)
      .select("workout_date, avg_rpe, rpe, total_volume_kg, duration_minutes")
      .eq("athlete_id", athleteId)
      .eq("status", "completed")
      .gte("workout_date", since);
    const map: Record<string, Exec> = {};
    ((data as any[]) ?? []).forEach((r: any) => {
      map[r.workout_date] = {
        rpe: r.avg_rpe != null ? Number(r.avg_rpe) : r.rpe != null ? Number(r.rpe) : null,
        vol: r.total_volume_kg != null ? Number(r.total_volume_kg) : null,
        min: r.duration_minutes != null ? Number(r.duration_minutes) : null,
      };
    });
    setExecs(map);
  }

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    loadPlan();
    loadPresence();
    const onWorkoutUpdated = () => { void loadPresence(); };
    window.addEventListener("9fit:workout-updated", onWorkoutUpdated);
    const channel = supabase
      .channel(`planejamento-pro-${athleteId}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "periodization_annual_plans", filter: `athlete_id=eq.${athleteId}` }, () => loadPlan())
      .on("postgres_changes", { event: "*", schema: "public", table: "athlete_periodizations", filter: `athlete_id=eq.${athleteId}` }, () => loadPlan())
      .on("postgres_changes", { event: "*", schema: "public", table: "periodization_plans_remote", filter: `athlete_id=eq.${athleteId}` }, () => loadPlan())
      .on("postgres_changes", { event: "*", schema: "public", table: "workout_executions", filter: `athlete_id=eq.${athleteId}` }, () => loadPresence())
      .subscribe();
    return () => { window.removeEventListener("9fit:workout-updated", onWorkoutUpdated); supabase.removeChannel(channel); };
  }, [athleteId, reloadKey, monthKey]);

  // ---------- Plano: semanas reais do macrociclo ----------
  const macros = useMemo<Macro[]>(() => {
    const clean = (arr: any[]): Macro[] => arr
      .filter((m) => m && typeof m === "object")
      .map((m, i) => ({ ...m, name: String(m.name ?? m.label ?? m.type ?? m.focus ?? `Fase ${i + 1}`) }));
    if (Array.isArray(plan?.macrocycle) && plan!.macrocycle!.length) return clean(plan!.macrocycle as any[]);
    // Fallback: plano sem macrocycle, mas com mesociclos (formato antigo)
    if (Array.isArray(plan?.mesocycle) && plan!.mesocycle!.length) {
      return clean(plan!.mesocycle as any[]).map((m: any) => ({ name: m.name, weeks: Number(m.weeks ?? m.duration_weeks) || 4, focus: m.focus, volume_level: m.volume_level }));
    }
    return [];
  }, [plan]);
  const model = useMemo(() => {
    const vol = new Map<number, number>();
    const rpe = new Map<number, number>();
    // Cada onda cobre um intervalo de semanas (start_week..end_week). Formato antigo: só `week`.
    (plan?.waves ?? []).forEach((wv) => {
      const s = wv.start_week ?? wv.week;
      const e = wv.end_week ?? wv.week;
      if (s == null || e == null) return;
      const v = midpoint(wv.volume), r = midpoint(wv.intensity);
      for (let k = s; k <= e; k++) {
        if (v != null) vol.set(k, v);
        if (r != null) rpe.set(k, r);
      }
    });
    const weeks: { w: number; mi: number; deload: boolean; vol: number | null; rpe: number | null; lvl: number }[] = [];
    let n = 0;
    macros.forEach((m, mi) => {
      const deload = /deload|transi/i.test(m.name);
      const lvl = level(m.volume_level) ?? (deload ? 40 : 70);
      for (let k = 0; k < mw(m); k++) { n += 1; weeks.push({ w: n, mi, deload, vol: vol.get(n) ?? null, rpe: rpe.get(n) ?? null, lvl }); }
    });
    const cur = Math.min(Math.max(Number(plan?.current_week_index) || 1, 1), Math.max(weeks.length, 1)); // 1-based
    return { weeks, cur, hasVol: vol.size >= 2, hasRpe: rpe.size >= 2 };
  }, [plan, macros]);

  const { weeks, cur } = model;
  const curBar = weeks[cur - 1];
  const hasPlan = weeks.length > 0;
  const total = weeks.length;
  const phaseName = plan?.current_phase || (curBar ? macros[curBar.mi]?.name : "") || "Plano";
  const weekInPhase = curBar ? weeks.filter((x) => x.mi === curBar.mi && x.w <= cur).length : 0;
  const phaseWeeks = curBar ? weeks.filter((x) => x.mi === curBar.mi).length : 0;
  const progressPct = total ? Math.round((cur / total) * 100) : 0;
  const nextDeload = weeks.find((x) => x.w > cur && x.deload);
  const target = plan?.weekly_split?.dias?.length ?? null;

  useEffect(() => {
    if (loading) return;
    onPlanLoaded?.(hasPlan || (plan?.waves?.length ?? 0) > 0);
  }, [loading, hasPlan, plan]);

  // ---------- Presença ----------
  const sessions = useMemo(() => {
    const out: { label: string; n: number }[] = [];
    for (let i = 8; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const we = addDays(ws, 7);
      const n = Object.keys(execs).filter((d) => { const x = new Date(`${d}T12:00:00`); return x >= ws && x < we; }).length;
      out.push({ label: format(ws, "dd/MM"), n });
    }
    return out;
  }, [execs]);
  const hasExecs = Object.keys(execs).length > 0;
  const thisWeek = sessions[sessions.length - 1]?.n ?? 0;
  const monthDays = useMemo(() => eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) }), [viewMonth]);
  const monthCount = monthDays.filter((d) => execs[format(d, "yyyy-MM-dd")]).length;
  const weekStreak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < sessions.length; i++) {
      const n = sessions[sessions.length - 1 - i].n;
      if (n > 0) s += 1; else if (i > 0) break;
    }
    return s;
  }, [sessions]);
  const lead = (startOfMonth(viewMonth).getDay() + 6) % 7;

  // ---------- Métricas disponíveis (só o que tem dado) ----------
  const lastVal = (key: "vol" | "rpe") => { for (let i = cur - 1; i >= 0; i--) { const v = weeks[i]?.[key]; if (v != null) return v; } return null; };
  const prevVal = (key: "vol" | "rpe") => { let seen = false; for (let i = cur - 1; i >= 0; i--) { const v = weeks[i]?.[key]; if (v != null) { if (seen) return v; seen = true; } } return null; };
  // Força: o serviço devolve projeção idealizada sem histórico. Só vale com ponto REAL.
  const forcaReal = forca.filter((p) => p.realPct != null);
  const forcaLast = forcaReal.length ? forcaReal[forcaReal.length - 1] : null;

  const tabs: { k: Metric; label: string; value: string; unit: string }[] = [
    ...(hasPlan ? [{ k: "plano" as Metric, label: "Plano", value: `${cur}/${total}`, unit: "semanas" }] : []),
    { k: "presenca", label: "Presença", value: target ? `${thisWeek}/${target}` : String(thisWeek), unit: "treinos/sem." },
    ...(model.hasVol && hasPlan ? [{ k: "carga" as Metric, label: "Carga", value: lastVal("vol") != null ? lastVal("vol")!.toFixed(0) : "–", unit: "séries/grupo" }] : []),
    ...(model.hasRpe && hasPlan ? [{ k: "esforco" as Metric, label: "Esforço", value: lastVal("rpe") != null ? lastVal("rpe")!.toFixed(1) : "–", unit: "RPE" }] : []),
    ...(forcaLast && forca.length >= 2 ? [{ k: "forca" as Metric, label: "Força", value: `${Math.round(forcaLast.realPct as number)}%`, unit: "agachamento" }] : []),
  ];
  const active: Metric = tabs.some((t) => t.k === metric) ? metric : tabs[0].k;

  // ---------- Insight calculado dos próprios dados ----------
  const insight = useMemo(() => {
    if (active === "plano" && curBar) {
      const focus = macros[curBar.mi]?.focus;
      return {
        t: `Semana ${cur} de ${total} · fase ${macros[curBar.mi]?.name ?? phaseName}`,
        p: `${focus ? `Foco da fase: ${focus}. ` : ""}Você já percorreu ${progressPct}% do plano.${nextDeload ? ` O próximo deload chega em ${plural(nextDeload.w - cur, "semana", "semanas")}.` : ""}`,
        s: "Periodização", topic: "meu plano do ano",
      };
    }
    if (active === "carga") {
      const c = lastVal("vol"), p = prevVal("vol");
      const d = c != null && p ? pct(c, p) : null;
      return {
        t: d != null && d !== 0 ? `Seu volume ${d >= 0 ? "subiu" : "caiu"} ${Math.abs(d)}% nesta semana` : `Volume da semana: ${c?.toFixed(0)} séries por grupo`,
        p: `Você está na fase ${phaseName}. ${nextDeload ? `O próximo deload chega em ${plural(nextDeload.w - cur, "semana", "semanas")}, para o corpo assimilar o trabalho.` : "Subir o estímulo aos poucos é o plano."}`,
        s: "Sobrecarga progressiva", topic: "meu volume de treino",
      };
    }
    if (active === "esforco") {
      const r = lastVal("rpe") ?? 0;
      return { t: `Esforço planejado: RPE ${r.toFixed(1)} de 10`, p: `Forte o bastante para adaptar, sem chegar ao limite. Devem sobrar cerca de ${plural(Math.max(Math.round(10 - r), 0), "repetição", "repetições")} em reserva.`, s: "Escala de esforço (RPE)", topic: "meu esforço planejado" };
    }
    if (active === "forca" && forcaLast) {
      const d = Math.round((forcaLast.realPct as number) - forcaLast.projectedPct);
      return { t: `No agachamento, você está ${d >= 0 ? "acima" : "abaixo"} do projetado em ${Math.abs(d)} pts`, p: "A projeção usa seu histórico de cargas. Pequenos desvios são normais e o plano se ajusta.", s: "Adaptação neuromuscular", topic: "minha evolução de força no agachamento" };
    }
    const prev = sessions.slice(0, -1);
    if (!hasExecs) return { t: "Seu primeiro treino aparece aqui", p: "Cada treino concluído acende um dia no calendário e alimenta sua sequência.", s: "Aderência ao treino", topic: "minha presença" };
    if (target) {
      const ok = prev.filter((x) => x.n >= target).length;
      const faltam = Math.max(target - thisWeek, 0);
      return { t: `Meta batida em ${ok} das últimas ${prev.length} semanas`, p: faltam > 0 ? `Faltam ${plural(faltam, "treino", "treinos")} para fechar esta semana. Consistência vale mais que uma semana perfeita.` : "Meta da semana concluída. Consistência vale mais que uma semana perfeita.", s: "Aderência ao treino", topic: "minha presença" };
    }
    return { t: `${plural(thisWeek, "treino", "treinos")} nesta semana`, p: `Você soma ${weekStreak} ${weekStreak === 1 ? "semana seguida" : "semanas seguidas"} treinando. Consistência vale mais que uma semana perfeita.`, s: "Aderência ao treino", topic: "minha presença" };
  }, [active, weeks, cur, total, progressPct, curBar, macros, phaseName, nextDeload, forcaLast, sessions, hasExecs, target, thisWeek, weekStreak]);

  // ---------- Gráfico (SVG próprio: animação e marca) ----------
  function chart() {
    const baseY = H - PADB, innerH = H - PADB - PADT;
    const svgStyle = { width: "100%", height: "auto", display: "block" } as const;
    const defs = (
      <defs>
        <linearGradient id="npg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FF8A00" /><stop offset="1" stopColor="#FF4D2E" /></linearGradient>
        <linearGradient id="npgl" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#FF8A00" /><stop offset="0.6" stopColor="#FF4D2E" /><stop offset="1" stopColor="#C21E6B" /></linearGradient>
      </defs>
    );
    if (active === "presenca") {
      if (!hasExecs) {
        return <div className="np-empty" style={{ margin: 0 }}>Seus treinos concluídos aparecem aqui como barras semanais, junto da meta da semana.</div>;
      }
      const max = Math.max(5, target ?? 0, ...sessions.map((s) => s.n));
      const bw = (W - 2 * PADX) / sessions.length;
      const ty = target ? baseY - (target / max) * innerH : null;
      return (
        <svg key="p" viewBox={`0 0 ${W} ${H}`} style={svgStyle}>{defs}
          {ty != null && <><line x1={PADX} x2={W - PADX} y1={ty} y2={ty} stroke="#FF5A1F" strokeDasharray="3 4" opacity={0.7} /><text x={W - PADX} y={ty - 4} textAnchor="end" fontSize="8.5" fill="#FF5A1F">META {target}</text></>}
          {sessions.map((s, i) => {
            const h = (s.n / max) * innerH, ok = target ? s.n >= target : s.n > 0, last = i === sessions.length - 1;
            return (<g key={i}>
              <rect className="np-bar" style={{ animationDelay: `${i * 40}ms` }} x={PADX + i * bw + 4} y={baseY - h} width={bw - 8} height={h} fill={ok ? "url(#npg)" : "#3a3f44"} opacity={last ? 1 : 0.85} />
              <text x={PADX + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="8.5" fill={last ? "#fff" : "#5C6166"}>{s.label}</text>
            </g>);
          })}
        </svg>
      );
    }
    if (active === "forca") {
      const vals = forca.flatMap((p) => [p.projectedPct, p.realPct]).filter((v): v is number => v != null);
      const lo = Math.min(...vals) - 1, hi = Math.max(...vals) + 1, step = (W - 2 * PADX) / Math.max(forca.length - 1, 1);
      const X = (i: number) => PADX + i * step, Y = (v: number) => baseY - ((v - lo) / (hi - lo || 1)) * innerH;
      const pp = forca.map((p, i) => `${X(i)},${Y(p.projectedPct)}`).join(" ");
      const rr = forca.map((p, i) => (p.realPct != null ? `${X(i)},${Y(p.realPct)}` : null)).filter(Boolean).join(" ");
      const li = forca.reduce((acc, p, i) => (p.realPct != null ? i : acc), -1);
      return (
        <svg key="f" viewBox={`0 0 ${W} ${H}`} style={svgStyle}>{defs}
          <polyline className="np-fd" points={pp} fill="none" stroke="#8A9095" strokeWidth="2" strokeDasharray="4 5" />
          {forcaReal.length > 1 && <polyline className="np-line" pathLength={1} points={rr} fill="none" stroke="url(#npgl)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {li >= 0 && <circle className="np-fd" cx={X(li)} cy={Y(forca[li].realPct as number)} r="5" fill="#FF5A1F" stroke="#151719" strokeWidth="2" />}
          <text x={PADX} y="10" fontSize="8.5" fill="#8A9095">- - PROJETADO   <tspan fill="#FF5A1F" fontWeight="700">━ REAL</tspan></text>
          {forca.map((p, i) => <text key={i} x={X(i)} y={H - 8} textAnchor="middle" fontSize="8.5" fill="#5C6166">{p.label}</text>)}
        </svg>
      );
    }
    // plano / carga / esforço: semanas do plano
    const key = active === "esforco" ? "rpe" : active === "carga" ? "vol" : "lvl";
    const vals = weeks.map((x) => x[key]).filter((v): v is number => v != null);
    const min = active === "esforco" ? 4 : 0, max = active === "esforco" ? 10 : active === "plano" ? 100 : Math.max(...vals) * 1.1;
    const bw = (W - 2 * PADX) / total, Y = (v: number) => baseY - ((v - min) / (max - min || 1)) * innerH;
    const cx = PADX + (cur - 0.5) * bw;
    const past = weeks.filter((x) => x.w <= cur && x[key] != null).map((x) => `${PADX + (x.w - 0.5) * bw},${Y(x[key] as number)}`);
    const fut = weeks.filter((x) => x.w >= cur && x[key] != null).map((x) => `${PADX + (x.w - 0.5) * bw},${Y(x[key] as number)}`);
    let lx = PADX;
    return (
      <svg key={active} viewBox={`0 0 ${W} ${H}`} style={svgStyle}>{defs}
        {(active === "carga" || active === "plano") && weeks.map((x, i) => {
          const v = active === "plano" ? x.lvl : x.vol;
          if (v == null) return null;
          return <rect key={x.w} className="np-bar" style={{ animationDelay: `${i * 22}ms` }} x={PADX + i * bw + 1} y={Y(v)} width={Math.max(bw - 2, 1)} height={baseY - Y(v)} fill={x.w === cur ? "url(#npg)" : x.w < cur ? "#FF5A1F" : "#26292C"} opacity={x.w === cur ? 1 : x.w < cur ? 0.7 : 1} />;
        })}
        {active === "esforco" && <>
          <line x1={PADX} x2={W - PADX} y1={Y(9)} y2={Y(9)} stroke="#C21E6B" strokeDasharray="3 4" opacity={0.6} />
          <text x={W - PADX} y={Y(9) - 4} textAnchor="end" fontSize="8.5" fill="#C21E6B">ZONA MÁXIMA</text>
          {past.length > 1 && <polyline className="np-line" pathLength={1} points={past.join(" ")} fill="none" stroke="url(#npgl)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
          {fut.length > 1 && <polyline className="np-fd" points={fut.join(" ")} fill="none" stroke="#5C6166" strokeWidth="2" strokeDasharray="3 5" />}
        </>}
        <line x1={cx} x2={cx} y1={PADT} y2={baseY} stroke="#fff" strokeWidth="1" opacity={0.5} />
        <text x={Math.min(Math.max(cx, 50), W - 50)} y="10" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#FF5A1F" letterSpacing="0.08em">VOCÊ ESTÁ AQUI</text>
        {macros.map((m, i) => {
          const w = mw(m) * bw, x0 = lx; lx += w;
          return (<g key={i}>
            <rect x={x0 + 1} y={baseY + 6} width={Math.max(w - 2, 1)} height="3" fill={i === curBar?.mi ? "url(#npgl)" : "#26292C"} />
            {w > 38 && <text x={x0 + w / 2} y={H - 2} textAnchor="middle" fontSize="8" fill={i === curBar?.mi ? "#fff" : "#5C6166"}>{m.name.toUpperCase().slice(0, 14)}</text>}
          </g>);
        })}
      </svg>
    );
  }

  // ---------- Como executar ----------
  const exe = [
    plan?.intensity_pct_1rm && { k: "intensity", label: "Intensidade", value: range(plan.intensity_pct_1rm, "%")! },
    plan?.reps_range && { k: "reps", label: "Repetições", value: range(plan.reps_range)! },
    plan?.rpe_cap && { k: "rpe", label: "Esforço (RPE)", value: range(plan.rpe_cap)! },
    plan?.sets_range && { k: "sets", label: "Séries/grupo", value: range(plan.sets_range)! },
  ].filter(Boolean) as { k: string; label: string; value: string }[];
  const exeOpen = exe.find((e) => e.k === openExe);

  const pickedExec = pickedDay ? execs[pickedDay] : null;
  const missionDone = target ? thisWeek >= target : false;
  const chartTitle = { plano: "Seu ano · fases do plano", presenca: "Treinos por semana", carga: "Volume semanal do plano", esforco: "Esforço planejado por semana", forca: "Evolução de força no agachamento" }[active];

  if (!athleteId) return null;

  return (
    <div className="np-plan">
      {loadError && <div className="np-empty" style={{ borderColor: "#C21E6B", color: "#ff8fb0" }}>Não foi possível carregar seu plano agora. Tente novamente em instantes.</div>}

      {hasPlan ? (
        <div className="np-panel np-hero">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p className="np-tag">Nível {curBar.mi + 1} de {macros.length}</p>
              <p className="np-h" style={{ fontSize: 24, lineHeight: 1.15, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{phaseName}</p>
              <p className="np-soft" style={{ fontSize: 12, marginTop: 4 }}>Semana {weekInPhase} de {phaseWeeks} da fase · {cur} de {total} no plano</p>
            </div>
            <div style={{ position: "relative", width: 64, height: 64, flex: "none" }}>
              <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                <defs><linearGradient id="npring" x1="0" x2="1"><stop offset="0" stopColor="#FF8A00" /><stop offset="1" stopColor="#8B2FC9" /></linearGradient></defs>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#26292C" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#npring)" strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray={`${progressPct} 100`} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span className="np-h" style={{ fontSize: 15, lineHeight: 1 }}>{progressPct}%</span>
                <span className="np-soft" style={{ fontSize: 7, letterSpacing: "0.1em", marginTop: 2 }}>DO PLANO</span>
              </div>
            </div>
          </div>
          <div className="np-lv">{macros.map((m, i) => <i key={i} className={i < curBar.mi ? "done" : i === curBar.mi ? "cur" : ""} style={{ ["--p" as any]: `${(weekInPhase / (phaseWeeks || 1)) * 100}%` }} />)}</div>
          <div className="np-lvn">{macros.map((m, i) => <span key={i} className={i === curBar.mi ? "cur" : ""}>{m.name}</span>)}</div>
          <div className="np-mission">
            <div>
              <p className="np-label">Missão da semana</p>
              <p style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{target ? `Concluir ${plural(target, "treino", "treinos")} (${Math.min(thisWeek, target)}/${target})` : `${plural(thisWeek, "treino concluído", "treinos concluídos")} nesta semana`}</p>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {missionDone && <span className="np-badge" style={{ background: "rgba(61,220,132,.14)", color: "#3DDC84" }}>Concluída</span>}
              {weekStreak > 0 && <span className="np-badge">🔥 {weekStreak} sem.</span>}
            </div>
          </div>
        </div>
      ) : (
        !loading && <div className="np-empty">Seu plano ainda não foi gerado. Assim que o professor liberar, seu ano e as orientações do dia aparecem aqui.</div>
      )}

      {/* INSIGHT INTERATIVO: cada card troca o gráfico */}
      <div className="np-panel" style={{ padding: 0 }}>
        <div className="np-grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, border: 0, borderBottom: "1px solid var(--np-line)" }}>
          {tabs.map((t) => (
            <button key={t.k} onClick={() => setMetric(t.k)} className={`np-kpi ${active === t.k ? "on" : ""}`} aria-pressed={active === t.k}>
              <span className="np-label">{t.label}</span>
              <span className="v">{t.value}</span>
              <span className="u">{t.unit}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: 18 }}>
          <p className="np-label" style={{ marginBottom: 8 }}>{chartTitle}</p>
          {chart()}
          <div className="np-insight" key={active}>
            <b>{insight.t}</b>
            <p>{insight.p}</p>
            <span className="np-sci">🧪 {insight.s}</span>
          </div>
          {onAskRon && <button className="np-ron" onClick={() => onAskRon(insight.topic)}><i />Perguntar ao RON sobre isso<span>→</span></button>}
        </div>
      </div>

      {/* PRESENÇA (calendário) */}
      <div className="np-panel">
        <p className="np-label">Sua presença</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <p className="np-h" style={{ fontSize: 24, textTransform: "capitalize" }}>{format(viewMonth, "MMMM yyyy", { locale: ptBR })} <span className="np-soft" style={{ fontSize: 13, fontWeight: 500, textTransform: "none" }}>· {plural(monthCount, "treino", "treinos")}</span></p>
          {onMonthChange && (
            <div style={{ display: "flex", gap: 6, flex: "none" }}>
              <button type="button" aria-label="Mês anterior" className="np-day" style={{ width: 32, height: 32, aspectRatio: "auto" }} onClick={() => { setPickedDay(null); onMonthChange(addMonths(viewMonth, -1)); }}>‹</button>
              <button type="button" aria-label="Próximo mês" className="np-day" style={{ width: 32, height: 32, aspectRatio: "auto" }} onClick={() => { setPickedDay(null); onMonthChange(addMonths(viewMonth, 1)); }}>›</button>
            </div>
          )}
        </div>
        <div className="np-cal">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => <div key={i} className="np-dow">{d}</div>)}
          {Array.from({ length: lead }).map((_, i) => <div key={`e${i}`} />)}
          {monthDays.map((d) => {
            const k = format(d, "yyyy-MM-dd"), e = execs[k];
            const a = e ? (e.rpe != null ? Math.min(0.3 + (e.rpe / 10) * 0.7, 1) : 0.7) : 0;
            const planned = !e && plannedDates.includes(k);
            return (
              <button key={k} type="button" disabled={!e && !(planned && onPlannedDayClick)} aria-label={`${format(d, "d 'de' MMMM", { locale: ptBR })}${e ? ", treino concluído" : planned ? ", treino programado" : ""}`}
                onClick={() => (e ? setPickedDay(k) : planned ? onPlannedDayClick?.(k) : undefined)}
                className={`np-day ${e ? "done" : ""} ${isToday(d) ? "today" : ""} ${pickedDay === k ? "sel" : ""}`}
                style={e ? { background: `rgba(255,90,31,${a})` } : planned ? { borderColor: "#FF5A1F", borderStyle: "dashed", color: "#FF5A1F" } : undefined}>{format(d, "d")}</button>
            );
          })}
        </div>
        <div className="np-insight">
          {pickedDay && pickedExec ? (
            <>
              <b>{format(new Date(`${pickedDay}T12:00:00`), "d 'de' MMMM", { locale: ptBR })} · treino concluído</b>
              <p>{[pickedExec.rpe != null && `Esforço médio ${pickedExec.rpe.toFixed(1)} de 10`, pickedExec.vol != null && `${Math.round(pickedExec.vol)} kg de volume`, pickedExec.min != null && `${pickedExec.min} min`].filter(Boolean).join(" · ") || "Treino registrado."}</p>
              <span className="np-sci">🧪 Carga interna</span>
            </>
          ) : (
            <p>{hasExecs ? "Toque em um dia treinado para ver como foi. Quanto mais forte a cor, maior o esforço. Borda tracejada: treino programado." : "Seu primeiro treino concluído acende o dia aqui. Borda tracejada: treino programado."}</p>
          )}
        </div>
      </div>

      {/* COMO EXECUTAR HOJE */}
      {hasPlan && exe.length > 0 && (
        <div className="np-panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p className="np-label">Como executar hoje</p>
            <p className="np-soft" style={{ fontSize: 11 }}>Toque para entender</p>
          </div>
          <div className="np-exe">
            {exe.map((c, i) => (
              <button key={c.k} className={openExe === c.k ? "on" : ""} style={exe.length % 2 === 1 && i === exe.length - 1 ? { gridColumn: "1 / -1" } : undefined} onClick={() => setOpenExe(openExe === c.k ? null : c.k)} aria-pressed={openExe === c.k}>
                <span className="np-label">{c.label}</span>
                <span className="v">{c.value}</span>
              </button>
            ))}
          </div>
          {exeOpen && (
            <div className="np-bub">
              <small>RON</small>
              {exeOpen.label} {exeOpen.value} {EXPLAIN[exeOpen.k]}
              {onAskRon && <><br /><button onClick={() => onAskRon(`${exeOpen.label} ${exeOpen.value}`)}>Perguntar mais ao RON →</button></>}
            </div>
          )}
          <p className="np-soft" style={{ marginTop: 12, textAlign: "center", fontSize: 11 }}>O que treinar hoje está na aba Train.</p>
        </div>
      )}

      {onStart && <button className="np-cta" onClick={onStart}>Iniciar agora</button>}
    </div>
  );
}
