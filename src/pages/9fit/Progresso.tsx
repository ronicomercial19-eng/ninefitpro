import { useEffect, useState } from "react";
import { TrendingUp, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";

interface SeriesPoint { label: string; value: number }
interface StrengthBar { name: string; kg: number; delta: number }

export default function NineFitProgresso() {
  const navigate = useNavigate();
  const { athleteId } = useAthleteId();
  const [bodyfat, setBodyfat] = useState<SeriesPoint[]>([]);
  const [strength, setStrength] = useState<StrengthBar[]>([
    { name: "Supino", kg: 112, delta: 9 },
    { name: "Agachamento", kg: 148, delta: 21 },
    { name: "Puxada", kg: 95, delta: 7 },
  ]);
  const [score, setScore] = useState(82);
  const [trend, setTrend] = useState(11);

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      // bodyfat trend last 8 weeks (avaliacoes_unificadas)
      const since = new Date(Date.now() - 60 * 86400000).toISOString();
      const { data } = await supabase
        .from("avaliacoes_unificadas" as any)
        .select("data_avaliacao, percentual_gordura")
        .eq("athlete_id", athleteId)
        .gte("data_avaliacao", since)
        .order("data_avaliacao");
      const points = ((data as any[]) || []).map((r) => ({
        label: new Date(r.data_avaliacao).toLocaleDateString("pt-BR", { month: "short", day: "2-digit" }),
        value: Number(r.percentual_gordura || 0),
      }));
      if (points.length) setBodyfat(points);
      else {
        // fallback synthetic curve
        setBodyfat([
          { label: "Ago 12", value: 16 }, { label: "19", value: 15.5 },
          { label: "26", value: 15.2 }, { label: "Set 02", value: 14.9 },
          { label: "09", value: 14.6 }, { label: "16", value: 14.4 },
          { label: "23", value: 14.3 }, { label: "Out", value: 14.2 },
        ]);
      }

      // strength PRs from workout_exercise_sets
      const { data: sets } = await supabase
        .from("workout_exercise_sets" as any)
        .select("exercise_name, weight_kg, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      const map = new Map<string, number>();
      ((sets as any[]) || []).forEach((s) => {
        const k = (s.exercise_name || "").toLowerCase();
        const w = Number(s.weight_kg || 0);
        if (w > (map.get(k) || 0)) map.set(k, w);
      });
      const next: StrengthBar[] = [];
      const aliases: Record<string, string> = { supino: "Supino", agachamento: "Agachamento", puxada: "Puxada" };
      Object.entries(aliases).forEach(([key, label]) => {
        let max = 0;
        for (const [k, v] of map.entries()) if (k.includes(key) && v > max) max = v;
        if (max > 0) next.push({ name: label, kg: Math.round(max), delta: Math.round(max * 0.08) });
      });
      if (next.length === 3) setStrength(next);
    })();
  }, [athleteId]);

  const W = 320, H = 110, pad = 8;
  const maxV = Math.max(...bodyfat.map((p) => p.value), 1);
  const minV = Math.min(...bodyfat.map((p) => p.value), 0);
  const span = Math.max(1, maxV - minV);
  const xStep = bodyfat.length > 1 ? (W - pad * 2) / (bodyfat.length - 1) : 0;
  const pts = bodyfat.map((p, i) => `${pad + i * xStep},${H - pad - ((p.value - minV) / span) * (H - pad * 2)}`).join(" ");

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* Header */}
      <div className="px-4 pt-6 flex items-center justify-between">
        <h1 className="text-4xl font-display tracking-tight">Progresso</h1>
        <TrendingUp className="w-7 h-7 text-primary" />
      </div>
      <div className="px-4 mt-1">
        <div className="h-[2px] w-32 bg-primary/70" />
        <p className="text-xs text-muted-foreground mt-2">Módulo 9FIT PRO • Semana 42</p>
      </div>

      {/* Top cards */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-primary/50 bg-primary/[0.06] p-3 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.6)]">
          <p className="text-[10px] text-muted-foreground">Avaliação Atual</p>
          <p className="text-3xl font-display text-foreground mt-1">{score}%</p>
          <p className="text-[10px] text-primary mt-1">+{trend}% este mês</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Composição Corporal</p>
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 60 60" className="w-14 h-14">
              <polygon points="30,6 52,22 44,50 16,50 8,22"
                fill="hsl(var(--primary)/0.25)" stroke="hsl(var(--primary))" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="flex justify-between text-[9px] mt-1">
            <span><span className="text-muted-foreground">Gord</span> 14%</span>
            <span><span className="text-muted-foreground">Músc</span> 68%</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] text-muted-foreground">Força Total</p>
          <p className="text-2xl font-display mt-1">+24<span className="text-base">kg</span></p>
          <TrendingUp className="w-3 h-3 text-primary mt-1" />
        </div>
      </div>

      {/* Composição Corporal — area chart */}
      <div className="px-4 mt-6">
        <p className="text-sm font-semibold flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Composição Corporal
        </p>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Tendência de Gordura Corporal %</p>
              <p className="text-[10px] text-muted-foreground">Últimas 8 semanas</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl">{bodyfat[bodyfat.length - 1]?.value.toFixed(1)}%</span>
              <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-2 py-0.5">Meta: 13%</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3">
            <defs>
              <linearGradient id="bf" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
                <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`${pad},${H - pad} ${pts} ${W - pad},${H - pad}`} fill="url(#bf)" />
            <polyline points={pts} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
          </svg>
          <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
            {bodyfat.map((p) => <span key={p.label}>• {p.label}</span>)}
          </div>
        </div>
      </div>

      {/* Progressão de Força */}
      <div className="px-4 mt-6">
        <p className="text-sm font-semibold flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Progressão de Força
        </p>
        <div className="grid grid-cols-3 gap-2">
          {strength.map((s) => (
            <div key={s.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs">{s.name}</p>
                <TrendingUp className="w-3 h-3 text-primary" />
              </div>
              <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, s.kg / 2)}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="font-display text-lg">{s.kg}<span className="text-xs">kg</span></p>
                <p className="text-xs text-primary">+{s.delta}kg</p>
              </div>
              <p className="text-[9px] text-primary mt-0.5">↗ {s.delta} kg</p>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico de Performance */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Histórico de Performance
          </p>
          <button className="text-xs text-primary">Ver todos</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {[
            { name: "Teste de VO₂", date: "03/10", val: "48.7", unit: "ml/kg/min", ring: 91 },
            { name: "Teste de Força Máx", date: "27/09", val: "Deadlift 172kg", unit: "+12kg PR", ring: 0, pr: true },
          ].map((it, i) => (
            <div key={i} className="min-w-[60%] rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] text-muted-foreground">{it.name} • {it.date}</p>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <p className="font-display text-xl">{it.val}</p>
                  <p className={`text-[10px] ${it.pr ? 'text-emerald-400' : 'text-muted-foreground'}`}>{it.unit}</p>
                </div>
                {it.ring > 0 && (
                  <div className="relative w-12 h-12">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" stroke="hsl(var(--muted))" strokeWidth="3" fill="none" />
                      <circle cx="18" cy="18" r="15" stroke="hsl(var(--primary))" strokeWidth="3" fill="none"
                        strokeDasharray={`${it.ring * 0.94} 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{it.ring}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="px-4 mt-6">
        <p className="text-sm font-semibold flex items-center gap-2 mb-2 text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Insights Personalizados
        </p>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5 text-sm text-foreground/85">
          <p className="flex gap-2"><span className="text-primary">•</span> Sua força em membros inferiores cresceu 19% nas últimas 4 semanas. Continue priorizando agachamento profundo.</p>
          <p className="flex gap-2"><span className="text-primary">•</span> Perda de 0.8% de gordura visceral. Excelente resposta ao protocolo de HIIT.</p>
          <p className="flex gap-2"><span className="text-primary">•</span> Próxima avaliação sugerida: 18 de outubro.</p>
        </div>
      </div>

      <button onClick={() => navigate("/9fit/planejamento")}
        className="mx-4 mt-6 w-[calc(100%-2rem)] rounded-2xl border border-primary/40 bg-primary/[0.08] py-3 flex items-center justify-center gap-2 text-primary font-semibold">
        Ver Planejamento Completo <ChevronRight className="w-4 h-4" />
      </button>

      <BottomNavigation />
    </div>
  );
}
