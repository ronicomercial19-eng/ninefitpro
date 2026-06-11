import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, Sparkles, Calendar as CalIcon, RefreshCw, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useWorkoutOfTheDay } from "@/hooks/useWorkoutOfTheDay";
import { loadCarryProjection, type ProgressionPoint } from "@/services/training/loadProgression";
import { supabase } from "@/integrations/supabase/client";

type RemoteWave = { label?: string; week?: number; focus?: string; volume?: string; intensity?: string; pct?: number; status?: string };
const FALLBACK_CYCLES: RemoteWave[] = [
  { label: "Onda 1 • Adaptação", focus: "Base aeróbica", volume: "+5%", pct: 100, status: "done" },
  { label: "Onda 2 • Hipertrofia I", focus: "Volume moderado", volume: "+10%", pct: 100, status: "done" },
  { label: "Onda 3 • Hipertrofia II", focus: "Volume alto", volume: "+15%", pct: 70, status: "active" },
  { label: "Onda 4 • Força I", focus: "Carga máxima", volume: "+8%", pct: 0 },
  { label: "Onda 5 • Força II", focus: "RPE 9", volume: "+12%", pct: 0 },
  { label: "Onda 6 • Pico", focus: "Performance", volume: "+5%", pct: 0 },
  { label: "Onda 7 • Deload + Teste", focus: "Recuperação ativa", volume: "-30%", pct: 0 },
];

export default function NineFitPlanejamento() {
  const navigate = useNavigate();
  const { athleteId } = useAthleteId();
  const { today: workoutToday } = useWorkoutOfTheDay();
  const [points, setPoints] = useState<ProgressionPoint[]>([]);
  const [waves, setWaves] = useState<RemoteWave[]>(FALLBACK_CYCLES);
  const [planName, setPlanName] = useState<string>("Periodização Científica");
  const [hasRemotePlan, setHasRemotePlan] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function loadPlan() {
    if (!athleteId) return;
    // Source of truth: vw_athlete_periodizacao_ativa (unifica athlete_periodizations + periodization_plans_remote)
    const { data } = await supabase
      .from("vw_athlete_periodizacao_ativa" as any)
      .select("plan_name, waves, macrocycle, mesocycle, source")
      .eq("athlete_id", athleteId)
      .maybeSingle();

    const row = data as any;
    let wavesFound: RemoteWave[] | null = null;

    if (Array.isArray(row?.waves) && row.waves.length) {
      wavesFound = row.waves as RemoteWave[];
    } else if (Array.isArray(row?.mesocycle) && row.mesocycle.length) {
      wavesFound = (row.mesocycle as any[]).map((m: any, i: number) => ({
        label: m.label || m.name || `Onda ${i + 1}`,
        week: m.week ?? i + 1,
        focus: m.focus,
        volume: m.volume,
        intensity: m.intensity,
        pct: m.pct ?? 0,
        status: m.status,
      }));
    }

    if (wavesFound && wavesFound.length) {
      setWaves(wavesFound);
      setPlanName(row.plan_name || "Periodização SmartPeriodizer");
      setHasRemotePlan(true);
    } else {
      setHasRemotePlan(false);
    }
  }

  async function syncNow() {
    if (!athleteId) return;
    setSyncing(true);
    await supabase.functions.invoke("smartperiodizer-sync", { body: { athlete_id: athleteId } });
    setSyncing(false);
    loadPlan();
  }

  useEffect(() => {
    if (!athleteId) return;
    loadCarryProjection(athleteId).then(setPoints);
    loadPlan();

    // Realtime: reage a mudanças em athlete_periodizations e periodization_plans_remote
    const channel = supabase
      .channel(`athlete-periodization-${athleteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "athlete_periodizations", filter: `athlete_id=eq.${athleteId}` },
        () => loadPlan()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "periodization_plans_remote", filter: `athlete_id=eq.${athleteId}` },
        () => loadPlan()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "periodization_annual_plans", filter: `athlete_id=eq.${athleteId}` },
        () => loadPlan()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteId]);

  const monthDays = useMemo(() => {
    const now = new Date();
    return eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
  }, []);

  const maxY = Math.max(100, ...points.map((p) => Math.max(p.projectedPct, p.realPct ?? 0)));
  const W = 280, H = 120, padding = 16;
  const xStep = points.length > 1 ? (W - padding * 2) / (points.length - 1) : 0;
  const xy = (p: ProgressionPoint, idx: number, key: "realPct" | "projectedPct") => {
    const val = p[key] ?? p.projectedPct;
    return [padding + idx * xStep, H - padding - ((val / maxY) * (H - padding * 2))] as const;
  };
  const polyProjected = points.map((p, i) => xy(p, i, "projectedPct").join(",")).join(" ");
  const polyReal = points
    .filter((p) => p.realPct != null)
    .map((p, i) => xy(p, i, "realPct").join(","))
    .join(" ");

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* Top bar */}
      <div className="px-4 pt-6 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT PRO // PLANEJAMENTO</p>
          <h1 className="text-3xl font-display tracking-tight">Planejamento</h1>
        </div>
        <span className="text-[11px] uppercase tracking-widest text-primary border border-primary/40 rounded-full px-3 py-1">
          Aluno
        </span>
      </div>

      {/* Periodização */}
      <div className="mx-4 mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between">
          <p className="text-primary font-semibold text-sm">{planName}</p>
          <button onClick={syncNow} disabled={syncing} className="text-[10px] uppercase tracking-widest text-primary border border-primary/40 rounded-full px-3 py-1 flex items-center gap-1 disabled:opacity-50">
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Sincronizar
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{format(new Date(), "MMMM yyyy", { locale: ptBR })}</span>
          <span>{hasRemotePlan ? "SmartPeriodizer conectado" : "Plano local (não sincronizado)"}</span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[11px]">
          {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"].map((d) => (
            <div key={d} className="text-muted-foreground/70 text-[9px] uppercase tracking-widest">{d}</div>
          ))}
          {monthDays.map((d) => {
            const t = isToday(d);
            const isWorkoutDay = workoutToday && isSameDay(d, new Date(workoutToday.date));
            return (
              <div
                key={d.toISOString()}
                className={`aspect-square rounded-lg flex items-center justify-center font-medium text-xs ${
                  t
                    ? "bg-primary text-primary-foreground"
                    : isWorkoutDay
                    ? "bg-primary/30 text-primary border border-primary/40"
                    : "bg-white/[0.03] text-foreground/70"
                }`}
              >
                {format(d, "d")}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ondas */}
      <div className="mt-6 px-4">
        <h2 className="text-xl font-display mb-3">Ondas {hasRemotePlan ? "(SmartPeriodizer)" : "Adaptativas"}</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
          {waves.map((c, i) => {
            const isActive = c.status === "active" || (c.pct ?? 0) > 0 && (c.pct ?? 0) < 100;
            const isDone = c.status === "done" || (c.pct ?? 0) >= 100;
            const label = c.label || `Onda ${c.week ?? i + 1}`;
            const [head, tail] = label.split(" • ");
            return (
              <div
                key={i}
                className={`snap-start min-w-[230px] rounded-2xl p-4 border ${
                  isActive
                    ? "border-primary/60 bg-primary/[0.06] shadow-[0_0_30px_-12px_hsl(var(--primary)/0.6)]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <p className="text-xs text-muted-foreground">{head}</p>
                {tail && <p className="text-sm font-semibold">{tail}</p>}
                {c.focus && <p className="text-xs text-muted-foreground mt-2">Foco: {c.focus}</p>}
                {c.volume && <p className="text-xs text-muted-foreground">Volume: {c.volume}</p>}
                {c.intensity && <p className="text-xs text-muted-foreground">Intensidade: {c.intensity}</p>}
                {isActive && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="relative w-12 h-12">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15" stroke="hsl(var(--muted))" strokeWidth="3" fill="none" />
                        <circle
                          cx="18" cy="18" r="15"
                          stroke="hsl(var(--primary))" strokeWidth="3" fill="none"
                          strokeDasharray={`${(c.pct ?? 0) * 0.94} 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{c.pct ?? 0}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      IA ajustou carga com<br/>base no seu RM
                    </p>
                  </div>
                )}
                {isDone && <p className="mt-3 text-emerald-400 text-lg">✓</p>}
              </div>
            );
          })}
        </div>
      </div>


      {/* Progresso */}
      <div className="mt-6 mx-4 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-xl font-display mb-1">Progresso do Ciclo</h2>
        <p className="text-xs text-muted-foreground mb-3">Evolução de Carga • Agachamento</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <defs>
            <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
              <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {polyProjected && (
            <polygon
              points={`${padding},${H - padding} ${polyProjected} ${W - padding},${H - padding}`}
              fill="url(#fill)"
            />
          )}
          {polyProjected && (
            <polyline points={polyProjected} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
          )}
          {polyReal && (
            <polyline points={polyReal} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeDasharray="3 3" />
          )}
          {points.map((p, i) => {
            const [x, y] = xy(p, i, "projectedPct");
            return <circle key={i} cx={x} cy={y} r="3" fill="hsl(var(--primary))" />;
          })}
        </svg>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          {points.map((p) => (
            <span key={p.label}>{p.label}</span>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-muted-foreground" /> Real</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary" /> Projetado pela IA</span>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate("/9fit/train")}
        className="mx-4 mt-6 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground py-4 font-semibold flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]"
      >
        <CalIcon className="w-5 h-5" />
        Ver Plano Completo da Semana
      </button>
      {workoutToday && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Próximo treino: {format(new Date(workoutToday.date), "dd/MM")} • {workoutToday.label} • {workoutToday.durationMin} min
        </p>
      )}

      <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
        <Sparkles className="w-3 h-3 text-primary" /> IA gerou seu plano baseado em 14 métricas
      </p>

      <BottomNavigation />
    </div>
  );
}
