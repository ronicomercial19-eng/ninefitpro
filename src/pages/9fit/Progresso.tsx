import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, ChevronRight, Trophy, Footprints, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { MetasSection } from "@/components/9fit/MetasSection";
import { CheckinCorporalCard } from "@/components/9fit/CheckinCorporalCard";
import { RecordesSection } from "@/components/9fit/RecordesSection";
import { HistoricoCompletoModal } from "@/components/9fit/HistoricoCompletoModal";
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
  score_historico?: { data: string; valor: number }[];
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
  const [scoreHistory, setScoreHistory] = useState<SeriesPoint[]>([]);
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase.rpc("fn_get_ron_progresso_screen", {
      p_athlete_id: athleteId,
    });

    if (error) {
      console.error("[Progresso] fn_get_ron_progresso_screen falhou:", error);
      setLoadError("Não foi possível carregar seus dados reais de progresso.");
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

    // Evolução completa do score global
    const scorePoints: SeriesPoint[] = (screen.score_historico || []).map((p) => ({
      label: new Date(p.data).toLocaleDateString("pt-BR", { month: "short", day: "2-digit" }),
      value: Number(p.valor),
      oficial: true,
    }));
    setScoreHistory(scorePoints);

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

    // Recordes recentes — fn_get_ron_progresso_screen devolve as últimas 5 linhas
    // BRUTAS de personal_records, sem deduplicar por exercício. Isso significa que
    // um recorde já superado (ex: Supino 80kg de 25/07) continua aparecendo ao lado
    // do que o quebrou (Supino 100kg de 30/08) — achado em QA (14/09) comparando a
    // resposta real da função com a tabela personal_records da Fernanda. Corrigido
    // aqui: mantém só a entrada mais recente por exercício (a lista já vem ordenada
    // DESC por data, então a primeira ocorrência de cada exercício é a atual).
    const seen = new Set<string>();
    const prItems: PrItem[] = [];
    for (const r of screen.recordes_recentes || []) {
      if (seen.has(r.exercicio)) continue;
      seen.add(r.exercicio);
      const hist = (byExercicio.get(r.exercicio) || [])
        .filter((h) => h.data < r.data)
        .sort((a, b) => b.data.localeCompare(a.data));
      const previous = hist[0];
      prItems.push({
        exercicio: r.exercicio,
        valor: Number(r.valor),
        unidade: r.unidade || "kg",
        data: new Date(r.data).toLocaleDateString("pt-BR"),
        delta: previous ? Number(r.valor) - Number(previous.valor) : null,
      });
    }
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

  const W = 320, H = 150, pad = 22;
  const hasCurve = bodyfat.length > 1;
  const maxV = Math.max(...bodyfat.map((p) => p.value), 1);
  const minV = Math.min(...bodyfat.map((p) => p.value), 0);
  const span = Math.max(1, maxV - minV);
  const xStep = hasCurve ? (W - pad * 2) / (bodyfat.length - 1) : 0;
  const pts = bodyfat.map((p, i) => `${pad + i * xStep},${H - pad - ((p.value - minV) / span) * (H - pad * 2)}`).join(" ");
  const sparkW = 180, sparkH = 48, sparkPad = 3;
  const sparkStep = hasCurve ? (sparkW - sparkPad * 2) / (bodyfat.length - 1) : 0;
  const sparkPts = bodyfat.map((p, i) => `${sparkPad + i * sparkStep},${sparkH - sparkPad - ((p.value - minV) / span) * (sparkH - sparkPad * 2)}`).join(" ");
  const hasScoreCurve = scoreHistory.length > 1;
  const scoreMaxV = Math.max(...scoreHistory.map((p) => p.value), 1);
  const scoreMinV = Math.min(...scoreHistory.map((p) => p.value), 0);
  const scoreSpan = Math.max(1, scoreMaxV - scoreMinV);
  const scoreXStep = hasScoreCurve ? (W - pad * 2) / (scoreHistory.length - 1) : 0;
  const scorePts = scoreHistory.map((p, i) => `${pad + i * scoreXStep},${H - pad - ((p.value - scoreMinV) / scoreSpan) * (H - pad * 2)}`).join(" ");

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* Header */}
      <div className="px-4 pt-6 flex items-center justify-between">
        <h1 className="text-4xl font-display tracking-tight">Progresso</h1>
        <TrendingUp className="w-7 h-7 text-primary" />
      </div>
      {loading && <p className="px-4 mt-3 text-xs text-muted-foreground">Carregando seus dados reais…</p>}
      {athleteError && <p className="px-4 mt-3 text-xs text-destructive">{athleteError}</p>}
      {loadError && (
        <div className="mx-4 mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{loadError}</p>
          <button onClick={load} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive">
            <RotateCcw className="h-3.5 w-3.5" /> Tentar novamente
          </button>
        </div>
      )}
      {loadError && (
        <div className="mx-4 mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{loadError}</p>
          <button onClick={load} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive">
            <RotateCcw className="h-3.5 w-3.5" /> Tentar novamente
          </button>
        </div>
      )}
      <div className="px-4 mt-1">
        <div className="h-[2px] w-32 bg-primary/70" />
        <p className="text-xs text-muted-foreground mt-2">Módulo 9FIT PRO</p>
      </div>

      {/* Top cards */}
      <div className="px-4 mt-4 grid grid-cols-5 gap-2.5">
        <div className="relative col-span-3 min-h-[174px] overflow-hidden rounded-2xl border border-primary/50 bg-primary/[0.06] p-4 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.6)]">
          <div className="relative z-10">
            <p className="text-[10px] uppercase text-muted-foreground">Avaliação Atual</p>
            <p className="mt-2 text-5xl font-display tabular-nums text-foreground">{score != null ? `${score}%` : "—"}</p>
            <p className="mt-2 text-[10px] font-medium text-primary">
              {scoreTrend != null ? `${scoreTrend >= 0 ? "+" : ""}${scoreTrend}% no período` : "Sem histórico ainda"}
            </p>
          </div>
          {hasCurve && (
            <svg
              viewBox={`0 0 ${sparkW} ${sparkH}`}
              className="absolute inset-x-3 bottom-2 h-12 w-[calc(100%-1.5rem)] opacity-50"
              aria-hidden="true"
            >
              <polyline
                points={sparkPts}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
        </div>
        <div className="col-span-2 grid grid-rows-2 gap-2.5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] text-muted-foreground">Composição Corporal</p>
            <div className="mt-2 flex items-center gap-2">
              <svg viewBox="0 0 60 60" className="h-9 w-9 shrink-0" aria-hidden="true">
                <polygon points="30,6 52,22 44,50 16,50 8,22"
                  fill="hsl(var(--primary)/0.25)" stroke="hsl(var(--primary))" strokeWidth="1.5" />
              </svg>
              <div className="min-w-0 space-y-0.5 text-[9px]">
                <p><span className="text-muted-foreground">Gord</span> {gordura != null ? `${gordura}%` : "—"}</p>
                <p><span className="text-muted-foreground">Músc</span> {musculo != null ? `${musculo}%` : "—"}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] text-muted-foreground">Força Total</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-2xl font-display tabular-nums">
                {temSetsRegistrados && forcaTotalKg != null ? `${forcaTotalKg >= 0 ? "+" : ""}${forcaTotalKg}` : "—"}
                {temSetsRegistrados && forcaTotalKg != null && <span className="text-xs">kg</span>}
              </p>
              {temSetsRegistrados && forcaTotalKg != null && (
                forcaTotalKg >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-primary" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
            </div>
            {!temSetsRegistrados && <p className="mt-0.5 text-[9px] text-muted-foreground">Sem sets registrados</p>}
          </div>
        </div>
      </div>

      {/* Composição Corporal — area chart */}
      <div className="px-4 mt-8">
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
              <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Tendência de gordura corporal nos últimos 60 dias">
                <defs>
                  <linearGradient id="bf" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
                    <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={`${pad},${H - pad} ${pts} ${W - pad},${H - pad}`} fill="url(#bf)" />
                <polyline points={pts} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
                {bodyfat.map((p, i) => {
                  const cx = pad + i * xStep;
                  const cy = H - pad - ((p.value - minV) / span) * (H - pad * 2);
                  const isLast = i === bodyfat.length - 1;
                  return (
                    <g key={i}>
                      <circle cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />
                      <text
                        x={cx + (isLast ? -5 : 5)}
                        y={Math.max(10, cy - 7)}
                        textAnchor={isLast ? "end" : "start"}
                        fill="hsl(var(--foreground))"
                        fontSize="8"
                        fontWeight="600"
                      >
                        {p.value.toFixed(1)}%
                      </text>
                    </g>
                  );
                })}
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
      <div className="px-4 mt-8">
        <p className="text-sm font-semibold flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Progressão de Força
        </p>
        {strength.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {strength.map((s) => (
              <div key={s.name} className="flex min-w-0 flex-col items-center">
                <div className="flex h-36 w-full flex-col items-center justify-end">
                  <span className={`mb-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tabular-nums ${s.delta >= 0 ? "border-primary/35 bg-primary/10 text-primary" : "border-destructive/35 bg-destructive/10 text-destructive"}`}>
                    {s.delta >= 0 ? "+" : ""}{s.delta}{s.unidade}
                  </span>
                  <div
                    className="w-9 min-h-2 rounded-t-md bg-primary shadow-[0_0_18px_-6px_hsl(var(--primary)/0.8)]"
                    style={{ height: `${Math.max(8, Math.min(100, (s.kg / 150) * 100))}%` }}
                    aria-label={`${s.name}: ${s.kg}${s.unidade}`}
                  />
                </div>
                <p className="mt-2 text-center text-[10px] leading-tight text-muted-foreground break-words">{s.name}</p>
                <p className="mt-1 font-display text-lg tabular-nums">{s.kg}<span className="text-[10px]">{s.unidade}</span></p>
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
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Trophy className="h-4 w-4" /> Recordes Recentes
          </p>
          <div className="flex items-center gap-3">
            {prs.length > 0 && <span className="text-xs text-muted-foreground">{prs.length} registro{prs.length > 1 ? "s" : ""}</span>}
            {!loading && <RecordesSection athleteId={athleteId} onSaved={load} />}
          </div>
        </div>
        {prs.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {prs.map((it, i) => (
              <div key={i} className="min-w-[60%] rounded-2xl border border-primary/45 bg-primary/[0.07] p-4 shadow-[0_12px_30px_-24px_hsl(var(--primary)/0.9)]">
                <p className="flex items-center gap-1.5 text-[10px] text-primary/80"><Trophy className="h-3 w-3" /> {it.exercicio} • {it.data}</p>
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
      <div className="px-4 mt-8">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-neon-cyan">
          <Footprints className="h-4 w-4" /> Corridas recentes
        </p>
        {runs.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {runs.map((run, i) => (
              <div key={`${run.date}-${i}`} className="min-w-[45%] rounded-2xl border border-[hsl(var(--neural)/0.32)] bg-[hsl(var(--neural)/0.06)] p-3">
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

      {/* Evolução completa do score global */}
      <div className="px-4 mt-8">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Evolução do Score
        </p>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          {hasScoreCurve ? (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolução do score global ao longo do tempo">
                <defs>
                  <linearGradient id="score-history" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
                    <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={`${pad},${H - pad} ${scorePts} ${W - pad},${H - pad}`} fill="url(#score-history)" />
                <polyline points={scorePts} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
                {scoreHistory.map((p, i) => {
                  const cx = pad + i * scoreXStep;
                  const cy = H - pad - ((p.value - scoreMinV) / scoreSpan) * (H - pad * 2);
                  const isLast = i === scoreHistory.length - 1;
                  return (
                    <g key={i}>
                      <circle cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />
                      <text
                        x={cx + (isLast ? -5 : 5)}
                        y={Math.max(10, cy - 7)}
                        textAnchor={isLast ? "end" : "start"}
                        fill="hsl(var(--foreground))"
                        fontSize="8"
                        fontWeight="600"
                      >
                        {p.value.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="mt-2 flex gap-2 overflow-x-auto text-[9px] text-muted-foreground">
                {scoreHistory.map((p, i) => <span key={i}>• {p.label}</span>)}
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Ainda não há dados suficientes pra montar a evolução do score.
            </p>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="px-4 mt-8">
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

      {/* Histórico completo — fn_get_athlete_timeline, existia pronta desde o
          dossiê original mas não estava ligada a nenhum botão até o QA (14/09) */}
      <HistoricoCompletoModal athleteId={athleteId} />

      <button onClick={() => navigate("/9fit/planejamento")}
        className="mx-4 mt-8 w-[calc(100%-2rem)] rounded-2xl border border-primary/40 bg-primary/[0.08] py-3 flex items-center justify-center gap-2 text-primary font-semibold">
        Ver Planejamento Completo <ChevronRight className="w-4 h-4" />
      </button>

      <BottomNavigation />
    </div>
  );
}
