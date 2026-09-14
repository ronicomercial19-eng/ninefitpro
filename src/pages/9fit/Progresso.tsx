import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { MetasSection } from "@/components/9fit/MetasSection";
import { CheckinCorporalCard } from "@/components/9fit/CheckinCorporalCard";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";

interface SeriesPoint { label: string; value: number; oficial: boolean }
interface StrengthBar { name: string; kg: number; delta: number; unidade: string }
interface PrItem { exercicio: string; valor: number; unidade: string; data: string; delta: number | null }
interface RunItem { distanceKm: number; date: string }

// Formato de retorno de fn_get_ron_progresso_screen(p_athlete_id uuid) — ver dossiê
// "Ponte Progress Tracker ↔ FitPro" (13/09). Uma única RPC entrega todos os blocos
// da tela; nada aqui mais é montado a partir de queries soltas nas tabelas base.
interface RonProgressoScreen {
  avaliacao_atual?: {
    score_atual?: number | null;
    score_primeira_do_periodo?: number | null;
    delta_pp?: number | null;
    data?: string | null;
  };
  composicao_corporal?: {
    gordura_corporal?: number | null;
    massa_muscular?: number | null;
  };
  forca_total?: {
    total_kg?: number | null;
    tem_sets_registrados?: boolean;
  };
  tendencia_gordura_60d?: { data: string; valor: number }[];
  progressao_forca?: { exercicio: string; data: string; valor: number; unidade: string }[];
  recordes_recentes?: { exercicio: string; data: string; valor: number; unidade: string }[];
  corridas_recentes?: { data: string; distancia_km: number; fonte?: string }[];
  metas?: { metrica?: string; valor_meta?: number; status?: string }[];
  insights?: string[];
}

export default function NineFitProgresso() {
  const navigate = useNavigate();
  const { athleteId, error: athleteError } = useAthleteId();
  const [bodyfat, setBodyfat] = useState<SeriesPoint[]>([]);
  const [strength, setStrength] = useState<StrengthBar[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [scoreTrend, setScoreTrend] = useState<number | null>(null);
  const [gordura, setGordura] = useState<number | null>(null);
  const [musculo, setMusculo] = useState<number | null>(null);
  const [metaGordura, setMetaGordura] = useState<number | null>(null);
  const [prs, setPrs] = useState<PrItem[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [temSetsRegistrados, setTemSetsRegistrados] = useState(false);
  const [forcaTotalKg, setForcaTotalKg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    setLoading(true);

    const { data, error } = await supabase.rpc("fn_get_ron_progresso_screen" as any, {
      p_athlete_id: athleteId,
    });

    if (error) {
      console.error("[Progresso] fn_get_ron_progresso_screen falhou:", error);
      setLoading(false);
      return;
    }

    const screen = (data as RonProgressoScreen) || {};

    // Avaliação atual / score
    setScore(screen.avaliacao_atual?.score_atual != null ? Math.round(screen.avaliacao_atual.score_atual) : null);
    setScoreTrend(screen.avaliacao_atual?.delta_pp != null ? Math.round(screen.avaliacao_atual.delta_pp) : null);

    // Composição corporal
    setGordura(screen.composicao_corporal?.gordura_corporal ?? null);
    setMusculo(screen.composicao_corporal?.massa_muscular ?? null);

    // Força total (card do topo)
    setForcaTotalKg(screen.forca_total?.total_kg ?? null);
    setTemSetsRegistrados(!!screen.forca_total?.tem_sets_registrados);

    // Tendência de gordura 60d
    const bfPoints: SeriesPoint[] = (screen.tendencia_gordura_60d || []).map((p) => ({
      label: new Date(p.data).toLocaleDateString("pt-BR", { month: "short", day: "2-digit" }),
      value: Number(p.valor),
      oficial: true,
    }));
    setBodyfat(bfPoints);

    // Progressão de força — agrupa o histórico plano por exercício,
    // valor atual = registro mais recente, delta = atual - primeiro do período
    const forcaHist = screen.progressao_forca || [];
    const byExercicio = new Map<string, { data: string; valor: number; unidade: string }[]>();
    forcaHist.forEach((r) => {
      if (!byExercicio.has(r.exercicio)) byExercicio.set(r.exercicio, []);
      byExercicio.get(r.exercicio)!.push(r);
    });
    const strengthNext: StrengthBar[] = [];
    byExercicio.forEach((rows, exercicio) => {
      const sorted = [...rows].sort((a, b) => a.data.localeCompare(b.data));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      strengthNext.push({
        name: exercicio,
        kg: Math.round(last.valor),
        delta: Math.round(last.valor - first.valor),
        unidade: last.unidade || "kg",
      });
    });
    setStrength(strengthNext);

    // Recordes recentes — delta vs. registro anterior do mesmo exercício em progressao_forca
    const prItems: PrItem[] = (screen.recordes_recentes || []).map((r) => {
      const hist = (byExercicio.get(r.exercicio) || [])
        .filter((h) => h.data < r.data)
        .sort((a, b) => b.data.localeCompare(a.data));
      const previous = hist[0];
      return {
        exercicio: r.exercicio,
        valor: Number(r.valor),
        unidade: r.unidade || "kg",
        data: new Date(r.data).toLocaleDateString("pt-BR"),
        delta: previous ? Number(r.valor) - Number(previous.valor) : null,
      };
    });
    setPrs(prItems);

    // Corridas recentes
    setRuns((screen.corridas_recentes || []).map((r) => ({
      distanceKm: Number(r.distancia_km || 0),
      date: new Date(r.data).toLocaleDateString("pt-BR"),
    })));

    // Meta de % de gordura, se cadastrada em Metas
    const metaGord = (screen.metas || []).find((m) =>
      (m.metrica || "").toLowerCase().includes("gordura") && m.status !== "concluida"
    );
    setMetaGordura(metaGord?.valor_meta != null ? Number(metaGord.valor_meta) : null);

    // Insights personalizados — já vêm prontos do backend
    setInsights(screen.insights || []);

    setLoading(false);
  }, [athleteId]);

  useEffect(() => { load(); }, [load]);

  const W = 320, H = 110, pad = 8;
  const hasCurve = bodyfat.length > 1;
  const maxV = Math.max(...bodyfat.map((p) => p.value), 1);
  const minV = Math.min(...bodyfat.map((p) => p.value), 0);
  const span = Math.max(1, maxV - minV);
  const xStep = hasCurve ? (W - pad * 2) / (bodyfat.length - 1) : 0;
  const pts = bodyfat.map((p, i) => `${pad + i * xStep},${H - pad - ((p.value - minV) / span) * (H - pad * 2)}`).join(" ");

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* Header */}
      <div className="px-4 pt-6 flex items-center justify-between">
        <h1 className="text-4xl font-display tracking-tight">Progresso</h1>
        <TrendingUp className="w-7 h-7 text-primary" />
      </div>
      {loading && <p className="px-4 mt-3 text-xs text-muted-foreground">Carregando seus dados reais…</p>}
      {athleteError && <p className="px-4 mt-3 text-xs text-destructive">{athleteError}</p>}
      <div className="px-4 mt-1">
        <div className="h-[2px] w-32 bg-primary/70" />
        <p className="text-xs text-muted-foreground mt-2">Módulo 9FIT PRO</p>
      </div>

      {/* Top cards */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-primary/50 bg-primary/[0.06] p-3 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.6)]">
          <p className="text-[10px] text-muted-foreground">Avaliação Atual</p>
          <p className="text-3xl font-display text-foreground mt-1">{score != null ? `${score}%` : "—"}</p>
          <p className="text-[10px] text-primary mt-1">
            {scoreTrend != null ? `${scoreTrend >= 0 ? "+" : ""}${scoreTrend}% no período` : "Sem histórico ainda"}
          </p>
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
            <span><span className="text-muted-foreground">Gord</span> {gordura != null ? `${gordura}%` : "—"}</span>
            <span><span className="text-muted-foreground">Músc</span> {musculo != null ? `${musculo}%` : "—"}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] text-muted-foreground">Força Total</p>
          <p className="text-2xl font-display mt-1">
            {temSetsRegistrados && forcaTotalKg != null ? `${forcaTotalKg >= 0 ? "+" : ""}${forcaTotalKg}` : "—"}
            {temSetsRegistrados && forcaTotalKg != null && <span className="text-base">kg</span>}
          </p>
          {temSetsRegistrados && forcaTotalKg != null ? (
            forcaTotalKg >= 0 ? <TrendingUp className="w-3 h-3 text-primary mt-1" /> : <TrendingDown className="w-3 h-3 text-destructive mt-1" />
          ) : (
            <p className="text-[9px] text-muted-foreground mt-1">Sem sets registrados</p>
          )}
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
              <p className="text-[10px] text-muted-foreground">Últimas avaliações (60 dias)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl">
                {bodyfat.length > 0 ? `${bodyfat[bodyfat.length - 1].value.toFixed(1)}%` : "—"}
              </span>
              {metaGordura != null && (
                <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                  Meta: {metaGordura}%
                </span>
              )}
            </div>
          </div>
          {hasCurve ? (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3">
                <defs>
                  <linearGradient id="bf" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
                    <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={`${pad},${H - pad} ${pts} ${W - pad},${H - pad}`} fill="url(#bf)" />
                <polyline points={pts} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
                {bodyfat.map((p, i) => (
                  <circle
                    key={i}
                    cx={pad + i * xStep}
                    cy={H - pad - ((p.value - minV) / span) * (H - pad * 2)}
                    r={3}
                    fill="hsl(var(--primary))"
                  />
                ))}
              </svg>
              <div className="mt-2 flex gap-2 text-[9px] text-muted-foreground overflow-x-auto">
                {bodyfat.map((p, i) => <span key={i}>• {p.label}</span>)}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground mt-4 text-center py-4">
              Ainda não há avaliações suficientes pra montar a tendência. Faça pelo menos 2 avaliações com seu professor.
            </p>
          )}
        </div>
      </div>

      {/* Auto-registro do aluno — não substitui a avaliação oficial */}
      <CheckinCorporalCard onSaved={load} />

      {/* Metas — dado real (metas_progresso), dispara goal_achieved ao bater */}
      <MetasSection />

      {/* Progressão de Força */}
      <div className="px-4 mt-6">
        <p className="text-sm font-semibold flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Progressão de Força
        </p>
        {strength.length > 0 ? (
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
                  <p className="font-display text-lg">{s.kg}<span className="text-xs">{s.unidade}</span></p>
                  <p className={`text-xs ${s.delta >= 0 ? "text-primary" : "text-destructive"}`}>{s.delta >= 0 ? "+" : ""}{s.delta}{s.unidade}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-muted-foreground">
            Registre séries de Supino, Agachamento ou Puxada nos treinos pra ver sua progressão de força aqui.
          </div>
        )}
      </div>

      {/* Histórico de Performance — recordes reais */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Recordes Recentes
          </p>
          {prs.length > 0 && <span className="text-xs text-muted-foreground">{prs.length} registro{prs.length > 1 ? "s" : ""}</span>}
        </div>
        {prs.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {prs.map((it, i) => (
              <div key={i} className="min-w-[60%] rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] text-muted-foreground">{it.exercicio} • {it.data}</p>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <p className="font-display text-xl">{it.valor}{it.unidade}</p>
                    {it.delta != null && (
                      <p className={`text-[10px] ${it.delta >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                        {it.delta >= 0 ? "+" : ""}{it.delta}{it.unidade} vs. anterior
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-muted-foreground">
            Nenhum recorde registrado ainda.
          </div>
        )}
      </div>

      {/* Corridas registradas no Move */}
      <div className="px-4 mt-6">
        <p className="text-sm font-semibold flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Corridas recentes
        </p>
        {runs.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {runs.map((run, i) => (
              <div key={`${run.date}-${i}`} className="min-w-[45%] rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] text-muted-foreground">{run.date}</p>
                <p className="font-display text-xl mt-1">{run.distanceKm.toFixed(2)}<span className="text-xs"> km</span></p>
                <p className="text-[10px] text-muted-foreground mt-1">GPS · Move</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-muted-foreground">
            Suas corridas registradas no Move aparecerão aqui.
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="px-4 mt-6">
        <p className="text-sm font-semibold flex items-center gap-2 mb-2 text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Insights Personalizados
        </p>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5 text-sm text-foreground/85">
          {insights.length > 0 ? (
            insights.map((t, i) => <p key={i} className="flex gap-2"><span className="text-primary">•</span> {t}</p>)
          ) : (
            <p className="text-muted-foreground text-xs">
              Ainda não há dado suficiente pra gerar insights — continue treinando e fazendo avaliações.
            </p>
          )}
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
