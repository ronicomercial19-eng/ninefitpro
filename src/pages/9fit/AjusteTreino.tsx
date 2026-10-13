import { useEffect, useState } from "react";
import { businessDate } from "@/services/dailyContextRules";
import { ChevronLeft, Brain, Check, Loader2, Play, RefreshCw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAdaptiveAdjustment } from "@/hooks/useAdaptiveAdjustment";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useAthleteScores } from "@/hooks/useAthleteScores";
import { supabase } from "@/integrations/supabase/client";

type Ex = {
  id: string;
  exercise_id: string;
  name: string;
  sets: number;
  reps_range: string;
  rest_seconds: number;
  video_url?: string | null;
  new_exercise_name?: string;
  intensidade?: number;
};

const doseLabel = (dose: string) => /(?:\d|\s)(?:km|m|metros?)\b/i.test(dose)
  ? "Distância" : /(?:\d|\s)(?:min|seg|s|segundos?)\b/i.test(dose) ? "Duração" : "Reps / dose";
const describe = (ex: Ex) => `${ex.name} · ${ex.sets} × ${ex.reps_range} · ${ex.rest_seconds} s de descanso${ex.intensidade ? ` · RPE ${ex.intensidade}` : ""}`;

export default function NineFitAjusteTreino() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const workoutName = params.get("workout") ?? "Treino de Hoje";
  const [sessionName, setSessionName] = useState(workoutName);
  const { athleteId } = useAthleteId();
  const { refresh: refreshScores } = useAthleteScores(athleteId);
  const [mode, setMode] = useState<"smart" | "copilot">("smart");
  const [exercises, setExercises] = useState<Ex[]>([]);
  const [original, setOriginal] = useState<Ex[]>([]);
  const [selectedDate, setSelectedDate] = useState(businessDate());
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [exerciseOptions, setExerciseOptions] = useState<string[]>([]);
  const [dailyId, setDailyId] = useState<string | null>(null);
  const [workoutUpdatedAt, setWorkoutUpdatedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, Partial<Ex>>>({});
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const { adjustment, loading, error: adjustmentError, generate } = useAdaptiveAdjustment();

  const today = businessDate();

  const loadToday = async () => {
    if (!athleteId) return;
    setReloading(true);
    try {
      const { data: dw, error: workoutError } = await supabase
        .from("daily_workouts" as any)
        .select("id,day_name,updated_at")
        .eq("athlete_id", athleteId)
        .eq("workout_date", selectedDate)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (workoutError) throw workoutError;
      setDailyId((dw as any)?.id || null);
      setWorkoutUpdatedAt((dw as any)?.updated_at ?? null);
      setSessionName((dw as any)?.day_name || workoutName);
      if (!(dw as any)?.id) { setExercises([]); setOriginal([]); setExecutionStatus(null); setDirty({}); return; }
      const { data: executions, error: executionError } = await supabase.from("workout_executions")
        .select("status").eq("athlete_id", athleteId).eq("workout_date", selectedDate);
      if (executionError) throw executionError;
      setExecutionStatus((executions ?? []).find((row) => ["started", "in_progress", "paused", "completed", "skipped"].includes(row.status))?.status ?? null);
      const { data: rows, error: rowsError } = await supabase
        .from("workout_exercises" as any)
        .select("*, exercises(name,video_url)")
        .eq("daily_workout_id", (dw as any).id).order("exercise_order");
      if (rowsError) throw rowsError;
      const loaded = ((rows as any[]) || []).map((r: any) => ({
        id: r.id,
        exercise_id: r.exercise_id,
        name: r.exercises?.name || r.exercise_name || r.name || "Exercício",
        sets: r.sets ?? 3,
        reps_range: String(r.reps_range ?? r.reps ?? ""),
        rest_seconds: r.rest_seconds ?? 60,
        intensidade: r.rpe_target ?? undefined,
        video_url: r.exercises?.video_url || r.video_url,
      }));
      setExercises(loaded);
      setOriginal(loaded);
      setDirty({});
      setReviewing(false);
    } catch (error: any) { toast.error(error.message || "Não foi possível carregar o treino."); }
    finally { setReloading(false); }
  };

  useEffect(() => {
    void loadToday();
    const refresh = () => void loadToday();
    window.addEventListener("9fit:workout-updated", refresh);
    return () => window.removeEventListener("9fit:workout-updated", refresh);
    /* eslint-disable-next-line */
  }, [athleteId, selectedDate]);

  useEffect(() => {
    void supabase.from("exercises").select("name").order("name").limit(500)
      .then(({ data }) => setExerciseOptions([...new Set((data ?? []).map((row) => row.name).filter(Boolean))]));
  }, []);

  const runCopilot = async () => {
    if (executionStatus) { toast.info("Esta sessão já foi iniciada. Escolha uma futura para ajustar."); return; }
    if (!exercises.length) { toast.info("Carregue um treino antes de pedir ajustes."); return; }
    const r = await generate({ workoutName: sessionName, exercises: exercises.map(exercise => exercise.name) });
    if (r) toast.success("FitCopilot analisou seu treino");
  };

  const applyCopilotSuggestion = () => {
    if (!adjustment || executionStatus) return;
    let applied = 0;
    adjustment.swaps.forEach((swap) => {
      const target = exercises.find((exercise) => exercise.name.toLowerCase() === swap.from.toLowerCase())
        ?? exercises.find((exercise) => exercise.name.toLowerCase().includes(swap.from.toLowerCase()));
      if (target) {
        patch(target.id, { new_exercise_name: swap.to });
        applied += 1;
      }
    });
    const intensity = Math.max(1, Math.min(10, Math.round(adjustment.intensityPct / 10)));
    if (Number.isFinite(intensity)) exercises.forEach(exercise => patch(exercise.id, { intensidade: intensity }));
    if (applied) toast.success(`${applied} sugestão(ões) pronta(s) para salvar`);
    else if (Number.isFinite(intensity)) toast.success("Intensidade ajustada. Revise antes de publicar.");
    else toast.info("Não há ajustes compatíveis para aplicar.");
  };

  const patch = (id: string, delta: Partial<Ex>) => {
    setDirty((d) => ({ ...d, [id]: { ...(d[id] || {}), ...delta } }));
    setExercises((xs) => xs.map((x) => (x.id === id ? { ...x, ...delta } : x)));
    setReviewing(false);
  };

  const onSave = async () => {
    if (!athleteId || !dailyId || saving || executionStatus) return;
    if (exercises.some(ex => !Number.isInteger(ex.sets) || ex.sets < 1 || ex.sets > 10 || !ex.reps_range.trim() || /^\d{3,}$/.test(ex.reps_range.trim()) || !Number.isInteger(ex.rest_seconds) || ex.rest_seconds < 0 || ex.rest_seconds > 600 || (ex.intensidade != null && (!Number.isInteger(ex.intensidade) || ex.intensidade < 1 || ex.intensidade > 10)))) { toast.error("Revise séries, dose com unidade, descanso e intensidade antes de publicar."); return; }
    if (!reviewing) { setReviewing(true); return; }
    setSaving(true);
    try {
      const arrayDeAlteracoes = Object.entries(dirty).map(([workout_exercise_id, changes]) => ({
        workout_exercise_id,
        sets: changes.sets,
        reps_range: changes.reps_range,
        rest_seconds: changes.rest_seconds,
        new_exercise_name: changes.new_exercise_name,
        intensidade: changes.intensidade,
      }));
      const { data, error } = await supabase.rpc("fn_publicar_ajuste_treino_dia" as any, {
        p_athlete_id: athleteId,
        p_data: selectedDate,
        p_daily_workout_id: dailyId,
        p_expected_updated_at: workoutUpdatedAt,
        p_changes: arrayDeAlteracoes as any,
      });
      if (error) throw error;
      if ((data as any)?.success === false) {
        throw new Error((data as any)?.error || "O ajuste não foi aplicado");
      }
      const updated = (data as any)?.exercises;
      if (Array.isArray(updated)) {
        setExercises(updated.map((r: any) => ({
          id: r.id,
          exercise_id: r.exercise_id,
          name: r.exercise_name || r.name,
          sets: r.sets ?? 3,
          reps_range: r.reps_range ?? "10-12",
          rest_seconds: r.rest_seconds ?? 60,
          intensidade: r.intensidade ?? undefined,
          video_url: r.video_url,
        })));
      }
      setDirty({});
      setReviewing(false);
      window.dispatchEvent(new Event("9fit:workout-updated"));
      refreshScores();
      toast.success(`Ajuste publicado para ${selectedDate}`);
    } catch (e: any) {
      console.error("[AjusteTreino] fn_publicar_ajuste_treino_dia", e);
      toast.error(e?.message || "Falha ao aplicar ajuste");
    } finally {
      setSaving(false);
    }
  };

  // FIX (player guiado): "ver vídeo" aqui abria o YouTube em nova aba.
  // Esta tela é de ajuste de parâmetros (séries/reps/descanso), não de
  // execução — então em vez de embutir o player inteiro, o botão agora
  // leva ao mesmo player guiado (WorkoutExecution via Train.tsx) já
  // posicionado no treino de hoje, mantendo o ajuste como tela separada.
  const openInGuidedPlayer = () => {
    if (selectedDate !== today) { toast.info("O player guiado abre apenas o treino de hoje."); return; }
    if (Object.keys(dirty).length) { toast.info("Salve os ajustes antes de abrir o treino."); return; }
    const quickTraining = {
      id: dailyId,
      daily_workout_id: dailyId,
      training_name: sessionName,
      start_date: selectedDate,
      training_data: {
        exercises: exercises.map((e) => ({
          exercise_id: e.exercise_id,
          name: e.name,
          sets: e.sets,
          reps: e.reps_range,
          rest_seconds: e.rest_seconds,
          video_url: e.video_url,
        })),
      },
    };
    if (!dailyId) return toast.error("Treino não encontrado");
    navigate("/9fit/train", { state: { quickTraining } });
  };

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <div className="px-4 pt-6 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">AJUSTE DE TREINO · {selectedDate}</p>
          <h1 className="text-2xl font-display tracking-tight">{sessionName}</h1>
        </div>
        <button onClick={loadToday} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
          <RefreshCw className={`w-4 h-4 ${reloading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mx-4 mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <label className="text-xs text-muted-foreground">Sessão programada
          <input type="date" min={today} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-2 block w-full rounded-lg border border-white/10 bg-background p-2 text-foreground" />
        </label>
        {executionStatus && <p className="mt-3 text-sm text-amber-400">Treino {executionStatus}. A prescrição executada fica preservada; escolha uma sessão futura para ajustar.</p>}
      </div>

      {exercises.length > 0 && selectedDate === today && (
        <div className="mx-4 mt-4">
          <button onClick={openInGuidedPlayer}
            className="w-full rounded-2xl border border-primary/40 bg-primary/[0.06] py-3 flex items-center justify-center gap-2 font-bold text-primary hover:bg-primary/[0.12] transition">
            <Play className="w-4 h-4" /> Abrir no player guiado
          </button>
        </div>
      )}

      <div className="mx-4 mt-5 grid grid-cols-2 gap-3">
        <button onClick={() => setMode("smart")}
          className={`py-3 rounded-2xl font-semibold border ${mode === "smart" ? "border-primary text-primary bg-primary/10" : "border-white/10 text-muted-foreground"}`}>
          SmartTreino
        </button>
        <button onClick={() => { setMode("copilot"); if (!adjustment && !loading) runCopilot(); }}
          className={`py-3 rounded-2xl font-semibold border flex items-center justify-center gap-2 ${mode === "copilot" ? "border-primary text-primary bg-primary/10" : "border-white/10 text-muted-foreground"}`}>
          FitCopilot / IA
          <span className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 text-[9px] flex items-center justify-center text-primary">AI</span>
        </button>
      </div>

      <div className="mx-4 mt-6 space-y-3">
        {exercises.length === 0 && !reloading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
            Não há prescrição diária salva para esta data. Escolha outra sessão ou crie um treino no Train.
            <div className="mt-3 flex justify-center gap-3"><button className="text-primary" onClick={() => navigate("/9fit/train")}>Escolher ou gerar treino</button><button className="text-primary" onClick={() => navigate("/9fit/staff")}>Solicitar ajuste à equipe</button></div>
          </div>
        )}
        {exercises.map((ex, i) => (
          <div key={ex.id + i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-primary text-xs font-semibold">{ex.name}</p>
              {ex.new_exercise_name && <p className="text-xs text-primary">Troca pendente: {ex.new_exercise_name}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">
                  {ex.sets} × {ex.reps_range} · {ex.rest_seconds} s de descanso
                </p>
              </div>
              {ex.video_url && <Play className="w-4 h-4 text-primary/60" />}
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="text-[10px] uppercase text-muted-foreground">
                Séries
                <input type="number" min={1} max={10} value={ex.sets}
                  onChange={(e) => patch(ex.id, { sets: Number(e.target.value) })} disabled={!!executionStatus}
                  className="w-full mt-1 bg-transparent border-b border-white/10 py-1 text-sm text-foreground focus:outline-none focus:border-primary" />
              </label>
              <label className="text-[10px] uppercase text-muted-foreground">
                {doseLabel(ex.reps_range)}
                <input value={ex.reps_range}
                  onChange={(e) => patch(ex.id, { reps_range: e.target.value })} disabled={!!executionStatus}
                  className="w-full mt-1 bg-transparent border-b border-white/10 py-1 text-sm text-foreground focus:outline-none focus:border-primary" />
              </label>
              <label className="text-[10px] uppercase text-muted-foreground">
                Intensidade (RPE)
                <input type="number" min={1} max={10} value={ex.intensidade ?? ""}
                  onChange={(e) => patch(ex.id, { intensidade: e.target.value === "" ? undefined : Number(e.target.value) })} disabled={!!executionStatus}
                  className="w-full mt-1 bg-transparent border-b border-white/10 py-1 text-sm text-foreground focus:outline-none focus:border-primary" />
              </label>
              <label className="text-[10px] uppercase text-muted-foreground">
                Descanso (s)
                <input type="number" min={0} max={600} step={15} value={ex.rest_seconds}
                  onChange={(e) => patch(ex.id, { rest_seconds: Number(e.target.value) })} disabled={!!executionStatus}
                  className="w-full mt-1 bg-transparent border-b border-white/10 py-1 text-sm text-foreground focus:outline-none focus:border-primary" />
              </label>
            </div>
            <label className="mt-3 block text-[10px] uppercase text-muted-foreground">
              Trocar exercício · nome exato da biblioteca
              <input list="ajuste-exercicios" value={ex.new_exercise_name ?? ""}
                onChange={(e) => patch(ex.id, { new_exercise_name: e.target.value })} disabled={!!executionStatus}
                placeholder="Manter exercício atual"
                className="mt-1 w-full rounded-lg border border-white/10 bg-background p-2 text-sm text-foreground" />
            </label>
          </div>
        ))}
      </div>
      <datalist id="ajuste-exercicios">{exerciseOptions.map((name) => <option key={name} value={name} />)}</datalist>

      {mode === "copilot" && (
        <div className="mx-4 mt-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Sugestões IA</p>
          <div className="rounded-2xl border border-primary/40 bg-primary/[0.04] p-4">
            <p className="text-primary text-sm font-semibold flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4" /> FitCopilot recomenda:
            </p>
            <div className="text-sm text-foreground/85 italic leading-relaxed">
              {loading && "Analisando bio + skills ativas…"}
              {!loading && adjustmentError && <button type="button" onClick={runCopilot}>{adjustmentError} Tentar novamente</button>}
              {!loading && adjustment && (
                <>
                  {adjustment.rationale}
                  {adjustment.swaps?.[0] && (
                    <p className="mt-2 not-italic text-[12px] text-muted-foreground">
                      Trocar <b>{adjustment.swaps[0].from}</b> por <b>{adjustment.swaps[0].to}</b> — {adjustment.swaps[0].reason}
                    </p>
                  )}
                </>
              )}
            </div>
            {!loading && adjustment && adjustment.swaps.length > 0 && (
              <button type="button" onClick={applyCopilotSuggestion} disabled={!!executionStatus}
                className="mt-3 w-full rounded-xl border border-primary/40 bg-primary/10 py-2 text-xs font-bold text-primary">
                Aplicar sugestões ao treino
              </button>
            )}
          </div>
        </div>
      )}

      {reviewing && Object.keys(dirty).length > 0 && (
        <div className="mx-4 mt-6 rounded-2xl border border-primary/40 bg-primary/[0.04] p-4">
          <h2 className="font-bold text-primary">Revisar antes de publicar</h2>
          <p className="mt-1 text-xs text-muted-foreground">Aluno e sessão: {selectedDate}. O treino atualizado ficará disponível após a confirmação.</p>
          <div className="mt-3 space-y-3">{exercises.filter((ex) => dirty[ex.id]).map((ex) => (
            <div key={ex.id} className="grid gap-2 rounded-xl border border-white/10 p-3 text-xs sm:grid-cols-2">
              <p><span className="text-muted-foreground">Antes</span><br />{describe(original.find((item) => item.id === ex.id) ?? ex)}</p>
              <p><span className="text-primary">Depois</span><br />{describe({ ...ex, name: ex.new_exercise_name || ex.name })}</p>
            </div>
          ))}</div>
          <button onClick={() => setReviewing(false)} className="mt-3 text-xs text-muted-foreground underline">Voltar à edição</button>
        </div>
      )}

      <button onClick={onSave} disabled={saving || !!executionStatus || Object.keys(dirty).length === 0}
        className="mx-4 mt-6 w-[calc(100%-2rem)] rounded-full bg-primary text-primary-foreground py-4 font-bold tracking-widest uppercase shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {saving ? "Publicando..." : reviewing ? "Confirmar publicação" : "Revisar ajustes"}
      </button>

      <BottomNavigation />
    </div>
  );
}
