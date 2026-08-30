import { useEffect, useState } from "react";
import { TrendingUp, ChevronRight, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";

interface SeriesPoint { label: string; value: number }
interface StrengthBar { name: string; kg: number; delta: number }
interface RecordEntry { name: string; date: string; val: string; unit: string; isPR: boolean }

export default function NineFitProgresso() {
  const navigate = useNavigate();
  const { athleteId } = useAthleteId();
  const [bodyfat, setBodyfat] = useState<SeriesPoint[]>([]);
  const [strength, setStrength] = useState<StrengthBar[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [trend, setTrend] = useState<number | null>(null);
  const [bodyComp, setBodyComp] = useState<{ gordura: number | null; massa: number | null }>({ gordura: null, massa: null });
  // FIX (Rony, 30/08): "Histórico de Performance" e "Avaliação Atual"
  // eram dados 100% hardcoded no componente — um novo recorde salvo em
  // personal_records nunca aparecia aqui porque a tela nem consultava
  // essa tabela. Agora lê de verdade.
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      // Avaliação atual + tendência (avaliacoes_unificadas)
      const { data: assessments } = await supabase
        .from("avaliacoes_unificadas" as any)
        .select("data_avaliacao, gordura_corporal, massa_muscular, score_global")
        .or(`aluno_id.eq.${athleteId},athlete_id.eq.${athleteId}`)
        .order("data_avaliacao", { ascending: false })
        .limit(10);
      const assessList = ((assessments as any[]) || []);
      if (assessList.length > 0) {
        setScore(Math.round(Number(assessList[0].score_global || 0)) || null);
        setBodyComp({
          gordura: assessList[0].gordura_corporal != null ? Number(assessList[0].gordura_corporal) : null,
          massa: assessList[0].massa_muscular != null ? Number(assessList[0].massa_muscular) : null,
        });
        if (assessList.length > 1 && assessList[assessList.length - 1].score_global != null) {
          const delta = Number(assessList[0].score_global || 0) - Number(assessList[assessList.length - 1].score_global || 0);
          setTrend(Math.round(delta));
        }
      }

      // bodyfat trend last 8 weeks
      const since = new Date(Date.now() - 60 * 86400000).toISOString();
      const { data } = await supabase
        .from("avaliacoes_unificadas" as any)
        .select("data_avaliacao, gordura_corporal")
        .or(`aluno_id.eq.${athleteId},athlete_id.eq.${athleteId}`)
        .gte("data_avaliacao", since)
        .order("data_avaliacao");
      const points = ((data as any[]) || [])
        .filter((r) => r.gordura_corporal != null)
        .map((r) => ({
          label: new Date(r.data_avaliacao).toLocaleDateString("pt-BR", { month: "short", day: "2-digit" }),
          value: Number(r.gordura_corporal || 0),
        }));
      setBodyfat(points);

      // strength PRs from workout_exercise_sets (carga real registrada em treino)
      const { data: sets } = await supabase
        .from("workout_exercise_sets" as any)
        .select("exercise_name, actual_weight, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      const map = new Map<string, number>();
      ((sets as any[]) || []).forEach((s) => {
        const k = (s.exercise_name || "").toLowerCase();
        const w = Number(s.actual_weight || 0);
        if (w > (map.get(k) || 0)) map.set(k, w);
      });
      const aliases: Record<string, string> = { supino: "Supino", agachamento: "Agachamento", puxada: "Puxada" };
      const next: StrengthBar[] = [];
      Object.entries(aliases).forEach(([key, label]) => {
        let max = 0;
        for (const [k, v] of map.entries()) if (k.includes(key) && v > max) max = v;
        if (max > 0) next.push({ name: label, kg: Math.round(max), delta: 0 });
      });
      setStrength(next);

      // FIX: Histórico de Performance real — personal_records do atleta
      const { data: prs } = await supabase
        .from("personal_records" as any)
        .select("exercicio, tipo, valor, unidade, data_pr")
        .eq("athlete_id", athleteId)
        .order("data_pr", { ascending: false })
        .limit(10);
      const recList: RecordEntry[] = ((prs as any[]) || []).map((r) => ({
        name: r.exercicio,
        date: new Date(r.data_pr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        val: `${r.valor} ${r.unidade}`,
        unit: r.tipo,
        isPR: true,
      }));
      setRecords(recList);

      // Insights: só gera frase se houver dado real por trás — nunca inventa número
      const realInsights: string[] = [];
      if (points.length >= 2) {
        const delta = points[0].value - points[points.length - 1].value;
        if (Math.abs(delta) >= 0.1) {
          realInsights.push(
            delta < 0
              ? `Sua gordura corporal caiu ${Math.abs(delta).toFixed(1)}pp nas últimas ${points.length} avaliações.`
              : `Sua gordura corporal subiu ${delta.toFixed(1)}pp nas últimas ${points.length} avaliações — vale revisar o plano com seu professor.`
          );
        }
      }
      if (recList.length > 0) {
        realInsights.push(`Você bateu ${recList.length} recorde${recList.length > 1 ? "s" : ""} pessoal${recList.length > 1 ? "is" : ""} recentemente. Continue registrando pra acompanhar sua evolução.`);
      }
      setInsights(realInsights);
    })();
  }, [athleteId]);

  const W = 320, H = 110, pad = 8;
  const hasBodyfat = bodyfat.length > 0;
  const maxV = hasBodyfat ? Math.max(...bodyfat.map((p) => p.value), 1) : 1;
  const minV = hasBodyfat ? Math.min(...bodyfat.map((p) => p.value), 0) : 0;
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

      {/* Top cards */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-primary/50 bg-primary/[0.06] p-3 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.6)]">
          <p className="text-[10px] text-muted-foreground">Avaliação Atual</p>
          <p className="text-3xl font-display text-foreground mt-1">{score != null ? `${score}%` : "—"}</p>
          <p className="text-[10px] text-primary mt-1">{trend != null ? `${trend > 0 ? "+" : ""}${trend}% desde a última` : "Sem histórico ainda"}</p>
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
            <span><span className="text-muted-foreground">Gord</span> {bodyComp.gordura != null ? `${bodyComp.gordura}%` : "—"}</span>
            <span><span className="text-muted-foreground">Músc</span> {bodyComp.massa != null ? `${bodyComp.massa}%` : "—"}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] text-muted-foreground">Recordes</p>
          <p className="text-2xl font-display mt-1">{records.length}</p>
          <Trophy className="w-3 h-3 text-primary mt-1" />
        </div>
      </div>

      {/* Composição Corporal — area chart */}
      <div className="px-4 mt-6">
        <p className="text-sm font-semibold flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Composição Corporal
        </p>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          {hasBodyfat ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Tendência de Gordura Corporal %</p>
                  <p className="text-[10px] text-muted-foreground">Últimas avaliações</p>
                </div>
                <span className="font-display text-xl">{bodyfat[bodyfat.length - 1]?.value.toFixed(1)}%</span>
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
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">
              Ainda não há avaliações suficientes pra mostrar a tendência.
            </p>
          )}
        </div>
      </div>

      {/* Progressão de Força */}
      {strength.length > 0 && (
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
                <p className="font-display text-lg mt-2">{s.kg}<span className="text-xs">kg</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de Performance — recordes reais de personal_records */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Histórico de Performance
          </p>
        </div>
        {records.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {records.map((it, i) => (
              <div key={i} className="min-w-[60%] rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] text-muted-foreground">{it.name} • {it.date}</p>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <p className="font-display text-xl">{it.val}</p>
                    <p className="text-[10px] text-emerald-400">{it.unit}</p>
                  </div>
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
            <p className="text-xs text-muted-foreground">Nenhum recorde registrado ainda. Complete uma avaliação pra começar.</p>
          </div>
        )}
      </div>

      {/* Insights — só aparece quando há dado real por trás */}
      {insights.length > 0 && (
        <div className="px-4 mt-6">
          <p className="text-sm font-semibold flex items-center gap-2 mb-2 text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Insights
          </p>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5 text-sm text-foreground/85">
            {insights.map((ins, i) => (
              <p key={i} className="flex gap-2"><span className="text-primary">•</span> {ins}</p>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => navigate("/9fit/planejamento")}
        className="mx-4 mt-6 w-[calc(100%-2rem)] rounded-2xl border border-primary/40 bg-primary/[0.08] py-3 flex items-center justify-center gap-2 text-primary font-semibold">
        Ver Planejamento Completo <ChevronRight className="w-4 h-4" />
      </button>

      <BottomNavigation />
    </div>
  );
}
