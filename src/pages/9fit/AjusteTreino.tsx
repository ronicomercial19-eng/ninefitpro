import { useEffect, useState } from "react";
import { format } from "date-fns";
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
  name: string;
  sets: number;
  reps_range: string;
  rest_seconds: number;
  video_url?: string | null;
  new_exercise_name?: string;
  intensidade?: number;
};

export default function NineFitAjusteTreino() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const workoutName = params.get("workout") ?? "Treino de Hoje";
  const { athleteId } = useAthleteId();
  const { refresh: refreshScores } = useAthleteScores(athleteId);
  const [mode, setMode] = useState<"smart" | "copilot">("smart");
  const [exercises, setExercises] = useState<Ex[]>([]);
  const [dailyId, setDailyId] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, Partial<Ex>>>({});
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const { adjustment, loading, error: adjustmentError, generate, apply } = useAdaptiveAdjustment();

  const today = format(new Date(), "yyyy-MM-dd");

  const loadToday = async () => {
    if (!athleteId) return;
    setReloading(true);
    try {
      const { data: dw, error: workoutError } = await supabase
        .from("daily_workouts" as any)
        .select("id")
        .eq("athlete_id", athleteId)
        .eq("workout_date", today)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (workoutError) throw workoutError;
      setDailyId((dw as any)?.id || null);
      if (!(dw as any)?.id) { setExercises([]); return; }
      const { data: rows, error: rowsError } = await supabase
        .from("workout_exercises" as any)
        .select("*, exercises(name,video_url)")
        .eq("daily_workout_id", (dw as any).id).order("exercise_order");
      if (rowsError) throw rowsError;
      setExercises(((rows as any[]) || []).map((r: any) => ({
        id: r.exercise_id || r.id,
        name: r.exercises?.name || r.exercise_name || r.name || "Exercício",
        sets: r.sets ?? 3,
        reps_range: r.reps_range ?? r.reps ?? "10-12",
        rest_seconds: r.rest_seconds ?? 60,
        video_url: r.exercises?.video_url || r.video_url,
      })));
      setDirty({});
    } catch (error: any) { toast.error(error.message || "Não foi possível carregar o treino."); }
    finally { setReloading(false); }
  };

  useEffect(() => { loadToday(); /* eslint-disable-next-line */ }, [athleteId]);

  const runCopilot = async () => {
    if (!exercises.length) { toast.info("Carregue um treino antes de pedir ajustes."); return; }
    const r = await generate({ workoutName, exercises: exercises.map(exercise => exercise.name) });
    if (r) toast.success("FitCopilot analisou seu treino");
  };

  const applyCopilotSuggestion = () => {
    if (!adjustment) return;
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
    else if (Number.isFinite(intensity)) toast.success("Intensidade ajustada. Salve para aplicar ao treino.");
    else toast.info("Não há ajustes compatíveis para aplicar.");
  };

  const patch = (id: string, delta: Partial<Ex>) => {
    setDirty((d) => ({ ...d, [id]: { ...(d[id] || {}), ...delta } }));
    setExercises((xs) => xs.map((x) => (x.id === id ? { ...x, ...delta } : x)));
  };

  const onSave = async () => {
    if (!athleteId || saving) return;
    if (exercises.some(ex => !Number.isInteger(ex.sets) || ex.sets < 1 || ex.sets > 10 || !ex.reps_range.trim() || !Number.isFinite(ex.rest_seconds) || ex.rest_seconds < 0 || ex.rest_seconds > 600)) { toast.error("Revise séries, repetições e descanso antes de salvar."); return; }
    setSaving(true);
    try {
      const arrayDeAlteracoes = Object.entries(dirty).map(([exercise_id, changes]) => ({
        exercise_id,
        sets: changes.sets,
        reps_range: changes.reps_range,
        rest_seconds: changes.rest_seconds,
        new_exercise_name: changes.new_exercise_name,
        intensidade: changes.intensidade,
      }));
      const { data, error } = await supabase.rpc("fn_ajustar_treino_dia" as any, {
        p_athlete_id: athleteId,
        p_data: today,
        p_changes: arrayDeAlteracoes as any,
      });
      if (error) throw error;
      if ((data as any)?.success === false) {
        throw new Error((data as any)?.error || "O ajuste não foi aplicado");
      }
      const updated = (data as any)?.exercises;
      if (Array.isArray(updated)) {
        setExercises(updated.map((r: any) => ({
          id: r.exercise_id || r.id,
          name: r.exercise_name || r.name,
          sets: r.sets ?? 3,
          reps_range: r.reps_range ?? "10-12",
          rest_seconds: r.rest_seconds ?? 60,
          video_url: r.video_url,
        })));
      }
      setDirty({});
      if (mode === "copilot") await apply();
      window.dispatchEvent(new Event("9fit:workout-updated"));
      refreshScores();
      toast.success("Ajuste aplicado no treino de hoje");
    } catch (e: any) {
      console.error("[AjusteTreino] fn_ajustar_treino_dia", e);
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
    if (Object.keys(dirty).length) { toast.info("Salve os ajustes antes de abrir o treino."); return; }
    const quickTraining = {
      id: dailyId,
      daily_workout_id: dailyId,
      training_name: workoutName,
      start_date: today,
      training_data: {
        exercises: exercises.map((e) => ({
          exercise_id: e.id,
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
          <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">AJUSTE DE TREINO · {today}</p>
          <h1 className="text-2xl font-display tracking-tight">{workoutName}</h1>
        </div>
        <button onClick={loadToday} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
          <RefreshCw className={`w-4 h-4 ${reloading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {exercises.length > 0 && (
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
            Nenhum treino programado para hoje. Ajuste indisponível.
          </div>
        )}
        {exercises.map((ex, i) => (
          <div key={ex.id + i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <div>
              <p className="text-primary text-xs font-semibold">{ex.name}</p>
              {ex.new_exercise_name && <p className="text-xs text-primary">Troca pendente: {ex.new_exercise_name}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">
                  {ex.sets}×{ex.reps_range} · {ex.rest_seconds}s
                </p>
              </div>
              {ex.video_url && <Play className="w-4 h-4 text-primary/60" />}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <label className="text-[10px] uppercase text-muted-foreground">
                Séries
                <input type="number" min={1} max={10} value={ex.sets}
                  onChange={(e) => patch(ex.id, { sets: Number(e.target.value) })}
                  className="w-full mt-1 bg-transparent border-b border-white/10 py-1 text-sm text-foreground focus:outline-none focus:border-primary" />
              </label>
              <label className="text-[10px] uppercase text-muted-foreground">
                Reps
                <input value={ex.reps_range}
                  onChange={(e) => patch(ex.id, { reps_range: e.target.value })}
                  className="w-full mt-1 bg-transparent border-b border-white/10 py-1 text-sm text-foreground focus:outline-none focus:border-primary" />
              </label>
              <label className="text-[10px] uppercase text-muted-foreground">
                Descanso (s)
                <input type="number" min={15} max={300} step={15} value={ex.rest_seconds}
                  onChange={(e) => patch(ex.id, { rest_seconds: Number(e.target.value) })}
                  className="w-full mt-1 bg-transparent border-b border-white/10 py-1 text-sm text-foreground focus:outline-none focus:border-primary" />
              </label>
            </div>
          </div>
        ))}
      </div>

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
              <button type="button" onClick={applyCopilotSuggestion}
                className="mt-3 w-full rounded-xl border border-primary/40 bg-primary/10 py-2 text-xs font-bold text-primary">
                Aplicar sugestões ao treino
              </button>
            )}
          </div>
        </div>
      )}

      <button onClick={onSave} disabled={saving || Object.keys(dirty).length === 0}
        className="mx-4 mt-6 w-[calc(100%-2rem)] rounded-full bg-primary text-primary-foreground py-4 font-bold tracking-widest uppercase shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {saving ? "Aplicando..." : "Salvar ajustes"}
      </button>

      <BottomNavigation />
    </div>
  );
}
