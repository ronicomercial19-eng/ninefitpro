import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { MetasSection } from "@/components/9fit/MetasSection";
import { CheckinCorporalCard } from "@/components/9fit/CheckinCorporalCard";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";

interface SeriesPoint { label: string; value: number; oficial: boolean }
interface StrengthBar { name: string; kg: number; delta: number }
interface PrItem { exercicio: string; valor: number; unidade: string; data: string; delta: number | null }
interface RunItem { distanceKm: number; date: string }

export default function NineFitProgresso() {
  const navigate = useNavigate();
  const { athleteId } = useAthleteId();
  const [bodyfat, setBodyfat] = useState<SeriesPoint[]>([]);
  const [strength, setStrength] = useState<StrengthBar[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [scoreTrend, setScoreTrend] = useState<number | null>(null);
  const [gordura, setGordura] = useState<number | null>(null);
  const [musculo, setMusculo] = useState<number | null>(null);
  const [gorduraOficial, setGorduraOficial] = useState(true);
  const [metaGordura, setMetaGordura] = useState<number | null>(null);
  const [prs, setPrs] = useState<PrItem[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    setLoading(true);
    // Últimas avaliações — inclui oficiais (professor/API) E auto-registro do aluno.
    // "oficial" = origem != 'self_checkin' → só essas contam pra score/composição
    // detalhada; o self_checkin entra na curva de peso/gordura pra dar mais pontos
    // de referência entre uma avaliação oficial e outra.
    const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const { data: avals } = await supabase
      .from("avaliacoes_unificadas" as any)
      .select("data_avaliacao, gordura_corporal, massa_muscular, score_global, origem")
      .eq("athlete_id", athleteId)
      .gte("data_avaliacao", since)
      .order("data_avaliacao");
    const rows = (avals as any[]) || [];

    const points = rows
      .filter((r) => r.gordura_corporal != null)
      .map((r) => ({
        label: new Date(r.data_avaliacao).toLocaleDateString("pt-BR", { month: "short", day: "2-digit" }),
        value: Number(r.gordura_corporal),
        oficial: r.origem !== "self_checkin",
      }));
    setBodyfat(points);

    // Score e composição detalhada só vêm de avaliação oficial (self_checkin não mede tudo isso)
    const oficiais = rows.filter((r) => r.origem !== "self_checkin");
    if (oficiais.length > 0) {
      const last = oficiais[oficiais.length - 1];
      setGordura(last.gordura_corporal != null ? Number(last.gordura_corporal) : null);
      setMusculo(last.massa_muscular != null ? Number(last.massa_muscular) : null);
      setGorduraOficial(true);
      if (last.score_global != null) {
        setScore(Math.round(Number(last.score_global)));
        const first = oficiais.find((r) => r.score_global != null);
        if (first && first !== last && first.score_global != null) {
          setScoreTrend(Math.round(Number(last.score_global) - Number(first.score_global)));
        }
      }
    } else if (points.length > 0) {
      // Sem avaliação oficial ainda, mas tem auto-registro — mostra com aviso
      setGordura(points[points.length - 1].value);
      setGorduraOficial(false);
    }

    // Meta de % de gordura, se o aluno tiver cadastrado em Metas
    const { data: metaGord } = await supabase
      .from("metas_progresso" as any)
      .select("valor_meta")
      .eq("athlete_id", athleteId)
      .ilike("metrica", "%gordura%")
      .eq("status", "ativa")
      .limit(1)
      .maybeSingle();
    setMetaGordura(metaGord ? Number((metaGord as any).valor_meta) : null);

    // Progressão de força real (workout_exercise_sets)
    const { data: sets } = await supabase
      .from("workout_exercise_sets" as any)
      .select("exercise_name, weight_kg, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    const byExercise = new Map<string, number[]>();
    ((sets as any[]) || []).forEach((s) => {
      const k = (s.exercise_name || "").toLowerCase();
      const w = Number(s.weight_kg || 0);
      if (!k || w <= 0) return;
      if (!byExercise.has(k)) byExercise.set(k, []);
      byExercise.get(k)!.push(w);
    });
    const aliases: Record<string, string> = { supino: "Supino", agachamento: "Agachamento", puxada: "Puxada" };
    const strengthNext: StrengthBar[] = [];
    Object.entries(aliases).forEach(([key, label]) => {
      let all: number[] = [];
      for (const [k, arr] of byExercise.entries()) if (k.includes(key)) all = all.concat(arr);
      if (all.length === 0) return;
      const max = Math.max(...all);
      const baseline = all.slice(-Math.min(5, all.length));
      const avgBaseline = baseline.reduce((a, b) => a + b, 0) / baseline.length;
      strengthNext.push({ name: label, kg: Math.round(max), delta: Math.round(max - avgBaseline) });
    });
    setStrength(strengthNext);

    // PRs reais mais recentes
    const { data: prData } = await supabase
      .from("personal_records" as any)
      .select("exercicio, valor, unidade, data_pr")
      .eq("athlete_id", athleteId)
      .order("data_pr", { ascending: false })
      .limit(6);
    const prRows = (prData as any[]) || [];
    const prItems: PrItem[] = [];
    for (const r of prRows.slice(0, 2)) {
      const previous = prRows.find((p) => p.exercicio === r.exercicio && p.data_pr < r.data_pr);
      prItems.push({
        exercicio: r.exercicio,
        valor: Number(r.valor),
        unidade: r.unidade || "kg",
        data: new Date(r.data_pr).toLocaleDateString("pt-BR"),
        delta: previous ? Number(r.valor) - Number(previous.valor) : null,
      });
    }
    setPrs(prItems);

    // Corridas do Move — fonte canônica bio_activity_logs, sem fallback sintético
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: runData } = await supabase
        .from("bio_activity_logs")
        .select("distance_m, recorded_at, source")
        .eq("user_id", authUser.id)
        .eq("source", "move_gps")
        .order("recorded_at", { ascending: false })
        .limit(10);
      setRuns(((runData as any[]) || []).map((r) => ({
        distanceKm: Number(r.distance_m || 0) / 1000,
        date: new Date(r.recorded_at).toLocaleDateString("pt-BR"),
      })));
    } else {
      setRuns([]);
    }

    // Insights: só afirmações que dá pra provar com o dado que acabamos de buscar
    const ins: string[] = [];
    if (strengthNext.length > 0) {
      const top = [...strengthNext].sort((a, b) => b.delta - a.delta)[0];
      if (top.delta > 0) ins.push(`Seu ${top.name.toLowerCase()} evoluiu ${top.delta}kg no período analisado.`);
    }
    if (points.length >= 2) {
      const diff = points[0].value - points[points.length - 1].value;
      if (diff > 0) ins.push(`Redução de ${diff.toFixed(1)}pp de gordura corporal nas últimas avaliações.`);
      else if (diff < 0) ins.push(`Gordura corporal subiu ${Math.abs(diff).toFixed(1)}pp desde a última avaliação — vale revisar dieta/treino com seu professor.`);
    }
    if (prItems.length > 0) {
      ins.push(`Último recorde: ${prItems[0].exercicio} em ${prItems[0].data}.`);
    }
    setInsights(ins);
  }, [athleteId]);

  useEffect(() => { load(); }, [load]);

  const W = 320, H = 110, pad = 8;
  const hasCurve = bodyfat.length > 1;
  const maxV = Math.max(...bodyfat.map((p) => p.value), 1);
  const minV = Math.min(...bodyfat.map((p) => p.value), 0);
  const span = Math.max(1, maxV - minV);
  const xStep = hasCurve ? (W - pad * 2) / (bodyfat.length - 1) : 0;
  const pts = bodyfat.map((p, i) => `${pad + i * xStep},${H - pad - ((p.value - minV) / span) * (H - pad * 2)}`).join(" ");
  const hasSelfCheckin = bodyfat.some((p) => !p.oficial);
  const forcaTotal = strength.reduce((s, b) => s + b.delta, 0);

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* Header */}
      <div className="px-4 pt-6 flex items-center justify-between">
        <h1 className="text-4xl font-display tracking-tight">Progresso</h1>
        <TrendingUp className="w-7 h-7 text-primary" />
      </div>
      {loading && <p className="px-4 mt-3 text-xs text-muted-foreground">Carregando seus dados reais…</p>}
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
            <span><span className="text-muted-foreground">Gord</span> {gordura != null ? `${gordura}%${!gorduraOficial ? "*" : ""}` : "—"}</span>
            <span><span className="text-muted-foreground">Músc</span> {musculo != null ? `${musculo}%` : "—"}</span>
          </div>
          {!gorduraOficial && gordura != null && (
            <p className="text-[8px] text-muted-foreground mt-1">*auto-registro, sem avaliação oficial ainda</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] text-muted-foreground">Força Total</p>
          <p className="text-2xl font-display mt-1">
            {strength.length > 0 ? `${forcaTotal >= 0 ? "+" : ""}${forcaTotal}` : "—"}<span className="text-base">kg</span>
          </p>
          {strength.length > 0 ? (
            forcaTotal >= 0 ? <TrendingUp className="w-3 h-3 text-primary mt-1" /> : <TrendingDown className="w-3 h-3 text-destructive mt-1" />
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
                    r={p.oficial ? 3 : 2.5}
                    fill={p.oficial ? "hsl(var(--primary))" : "transparent"}
                    stroke="hsl(var(--primary))"
                    strokeWidth={p.oficial ? 0 : 1.5}
                  />
                ))}
              </svg>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-2 text-[9px] text-muted-foreground overflow-x-auto">
                  {bodyfat.map((p, i) => <span key={i}>• {p.label}</span>)}
                </div>
                {hasSelfCheckin && (
                  <span className="text-[8px] text-muted-foreground shrink-0 ml-2">● oficial &nbsp; ○ auto-registro</span>
                )}
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
                  <p className="font-display text-lg">{s.kg}<span className="text-xs">kg</span></p>
                  <p className={`text-xs ${s.delta >= 0 ? "text-primary" : "text-destructive"}`}>{s.delta >= 0 ? "+" : ""}{s.delta}kg</p>
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
          {prs.length > 0 && <button onClick={() => navigate("/9fit/progresso/recordes")} className="text-xs text-primary">Ver todos</button>}
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
