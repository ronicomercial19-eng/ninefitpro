import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, Sparkles, Calendar as CalIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useWorkoutOfTheDay } from "@/hooks/useWorkoutOfTheDay";
import { loadCarryProjection, type ProgressionPoint } from "@/services/training/loadProgression";

const CYCLES = [
  { label: "Semana 42-43 • Força Máxima", focus: "Lower Power", volume: "+12%", pct: 68, active: true },
  { label: "Semana 44 • Hipertrofia", focus: "Peito & Costas", volume: "+8%", pct: 0 },
  { label: "Semana 45 • Deload + Teste", focus: "Recuperação ativa", volume: "-30%", pct: 0, done: true },
];

export default function NineFitPlanejamento() {
  const navigate = useNavigate();
  const { athleteId } = useAthleteId();
  const { today: workoutToday } = useWorkoutOfTheDay();
  const [points, setPoints] = useState<ProgressionPoint[]>([]);

  useEffect(() => {
    if (!athleteId) return;
    loadCarryProjection(athleteId).then(setPoints);
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
        <p className="text-primary font-semibold text-sm">
          Periodização Científica • Ciclo 4 • Meso 3/8
        </p>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{format(new Date(), "MMMM yyyy", { locale: ptBR })}</span>
          <span>Próxima deload em 9 dias</span>
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

      {/* Ciclos */}
      <div className="mt-6 px-4">
        <h2 className="text-xl font-display mb-3">Ciclos Adaptativos</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
          {CYCLES.map((c, i) => (
            <div
              key={i}
              className={`snap-start min-w-[230px] rounded-2xl p-4 border ${
                c.active
                  ? "border-primary/60 bg-primary/[0.06] shadow-[0_0_30px_-12px_hsl(var(--primary)/0.6)]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <p className="text-xs text-muted-foreground">{c.label.split(" • ")[0]}</p>
              <p className="text-sm font-semibold">{c.label.split(" • ")[1]}</p>
              <p className="text-xs text-muted-foreground mt-2">Foco: {c.focus}</p>
              <p className="text-xs text-muted-foreground">Volume: {c.volume}</p>
              {c.active && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="relative w-12 h-12">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" stroke="hsl(var(--muted))" strokeWidth="3" fill="none" />
                      <circle
                        cx="18" cy="18" r="15"
                        stroke="hsl(var(--primary))" strokeWidth="3" fill="none"
                        strokeDasharray={`${c.pct * 0.94} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{c.pct}%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    IA ajustou carga com<br/>base no seu RM
                  </p>
                </div>
              )}
              {c.done && <p className="mt-3 text-emerald-400 text-lg">✓</p>}
            </div>
          ))}
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
