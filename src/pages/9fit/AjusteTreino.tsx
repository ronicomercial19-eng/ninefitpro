import { useEffect, useRef, useState } from "react";
import { businessDate } from "@/services/dailyContextRules";
import { ChevronLeft, Check, Loader2, Play, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
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
  muscle_groups?: string[];
};
type ExerciseOption = { name: string; muscle_groups: string[] };

const doseLabel = (dose: string) => /(?:\d|\s)(?:km|m|metros?)\b/i.test(dose)
  ? "Distância" : /(?:\d|\s)(?:min|seg|s|segundos?)\b/i.test(dose) ? "Duração" : "Reps / dose";
const describe = (ex: Ex) => `${ex.name} · ${ex.sets} × ${ex.reps_range} · ${ex.rest_seconds} s de descanso${ex.intensidade ? ` · RPE ${ex.intensidade}` : ""}`;

export default function NineFitAjusteTreino() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const workoutName = params.get("workout") ?? "Treino de Hoje";
  const [sessionName, setSessionName] = useState(workoutName);
  const { athleteId } = useAthleteId();
  const { data: scores, refresh: refreshScores } = useAthleteScores(athleteId);
  const [mode, setMode] = useState<"suggestion" | "manual">("suggestion");
  const [request, setRequest] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState(false);
  const [exercises, setExercises] = useState<Ex[]>([]);
  const [original, setOriginal] = useState<Ex[]>([]);
  const [selectedDate, setSelectedDate] = useState(businessDate());
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOption[]>([]);
  const [dailyId, setDailyId] = useState<string | null>(null);
  const [workoutUpdatedAt, setWorkoutUpdatedAt] = useState<string | null>(null);
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [workoutType, setWorkoutType] = useState<string | null>(null);
  const [focusMuscles, setFocusMuscles] = useState<string[]>([]);
  const [dirty, setDirty] = useState<Record<string, Partial<Ex>>>({});
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const requestedKey = useRef("");
  const loadToken = useRef(0);
  const { adjustment, loading, error: adjustmentError, generate, apply: recordAcceptedAdjustment, reset: resetAdjustment } = useAdaptiveAdjustment();

  const today = businessDate();

  const loadToday = async () => {
    if (!athleteId) return;
    const token = ++loadToken.current;
    resetAdjustment();
    setReloading(true);
    try {
      const { data: dw, error: workoutError } = await supabase
        .from("daily_workouts" as any)
        .select("id,day_name,day_number,workout_type,focus_muscles,updated_at")
        .eq("athlete_id", athleteId)
        .eq("workout_date", selectedDate)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (token !== loadToken.current) return;
      if (workoutError) throw workoutError;
      setDailyId((dw as any)?.id || null);
      setWorkoutUpdatedAt((dw as any)?.updated_at ?? null);
      setDayNumber((dw as any)?.day_number ?? null);
      setWorkoutType((dw as any)?.workout_type ?? null);
      setFocusMuscles(Array.isArray((dw as any)?.focus_muscles) ? (dw as any).focus_muscles : []);
      setSessionName((dw as any)?.day_name || workoutName);
      if (!(dw as any)?.id) { setExercises([]); setOriginal([]); setExecutionStatus(null); setDirty({}); return; }
      const { data: executions, error: executionError } = await supabase.from("workout_executions")
        .select("status").eq("athlete_id", athleteId).eq("workout_date", selectedDate);
      if (token !== loadToken.current) return;
      if (executionError) throw executionError;
      setExecutionStatus((executions ?? []).find((row) => ["started", "in_progress", "paused", "completed", "skipped"].includes(row.status))?.status ?? null);
      const { data: rows, error: rowsError } = await supabase
        .from("workout_exercises" as any)
        .select("*, exercises(name,video_url,muscle_groups)")
        .eq("daily_workout_id", (dw as any).id).order("exercise_order");
      if (token !== loadToken.current) return;
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
        muscle_groups: Array.isArray(r.exercises?.muscle_groups) ? r.exercises.muscle_groups : [],
      }));
      setExercises(loaded);
      setOriginal(loaded);
      setDirty({});
      setReasons({});
      setApplied(false);
      setReviewing(false);
    } catch (error: any) { if (token === loadToken.current) toast.error(error.message || "Não foi possível carregar o treino."); }
    finally { if (token === loadToken.current) setReloading(false); }
  };

  useEffect(() => {
    void loadToday();
    const refresh = () => void loadToday();
    window.addEventListener("9fit:workout-updated", refresh);
    return () => window.removeEventListener("9fit:workout-updated", refresh);
    /* eslint-disable-next-line */
  }, [athleteId, selectedDate]);

  useEffect(() => {
    void supabase.from("exercises").select("name,muscle_groups").order("name").limit(1000)
      .then(({ data }) => setExerciseOptions((data ?? []).filter(row => !!row.name).map(row => ({ name: row.name, muscle_groups: Array.isArray(row.muscle_groups) ? row.muscle_groups.filter((group): group is string => typeof group === "string") : [] }))));
  }, []);

  const runCopilot = async (customRequest = "") => {
    if (customRequest && Object.keys(dirty).length) { toast.info("Publique ou desfaça as mudanças pendentes antes de pedir outro ajuste."); return; }
    if (executionStatus) { toast.info("Esta sessão já foi iniciada. Escolha uma futura para ajustar."); return; }
    if (!exercises.length) { toast.info("Carregue um treino antes de pedir ajustes."); return; }
    const r = await generate({ workoutName: sessionName, workoutType: workoutType ?? undefined, date: selectedDate, request: customRequest, dayNumber, focusMuscles,
      sync: scores?.sync.status === "available" ? scores.sync.value : null,
      exercises: original.map(exercise => exercise.name),
      prescription: original.map(exercise => ({ name: exercise.name, sets: exercise.sets, reps: exercise.reps_range, restSeconds: exercise.rest_seconds, rpe: exercise.intensidade })) });
    if (r) { setMode("suggestion"); setApplied(false); }
  };

  useEffect(() => {
    const key = `${athleteId}:${selectedDate}:${dailyId}:${workoutUpdatedAt}`;
    if (reloading || !athleteId || !dailyId || !original.length || executionStatus || requestedKey.current === key) return;
    requestedKey.current = key;
    void runCopilot();
    // Generate once for each saved prescription; the user can explicitly request another adjustment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId, selectedDate, dailyId, workoutUpdatedAt, original.length, executionStatus, reloading]);

  const applyCopilotSuggestion = () => {
    if (!adjustment || executionStatus) return;
    let applied = 0;
    const nextReasons: Record<string, string> = {};
    adjustment.swaps.forEach((swap) => {
      const target = exercises.find((exercise) => exercise.name.toLocaleLowerCase() === swap.from.toLocaleLowerCase());
      const replacement = exerciseOptions.find(option => option.name.toLocaleLowerCase() === swap.to.toLocaleLowerCase()
        && (!target?.muscle_groups?.length || option.muscle_groups.some(group => target.muscle_groups?.includes(group))))?.name;
      if (target && replacement) {
        patch(target.id, { new_exercise_name: replacement });
        nextReasons[target.id] = swap.reason;
        applied += 1;
      }
    });
    adjustment.changes.forEach(change => {
      const target = exercises.find(exercise => exercise.name.toLocaleLowerCase() === change.exercise.toLocaleLowerCase());
      if (!target) return;
      const delta: Partial<Ex> = {};
      if (Number.isInteger(change.sets) && change.sets! >= 1 && change.sets! <= 10) delta.sets = change.sets;
      if (typeof change.reps === "string" && change.reps.trim() && change.reps.length <= 40) delta.reps_range = change.reps.trim();
      if (Number.isInteger(change.restSeconds) && change.restSeconds! >= 0 && change.restSeconds! <= 600) delta.rest_seconds = change.restSeconds;
      if (Number.isInteger(change.rpe) && change.rpe! >= 1 && change.rpe! <= 10) delta.intensidade = change.rpe;
      if (Object.keys(delta).length) { patch(target.id, delta); nextReasons[target.id] = change.reason; applied += 1; }
    });
    setReasons(nextReasons);
    setApplied(applied > 0);
    if (!applied) toast.info("Nenhuma mudança válida para esta prescrição. Você pode ajustar manualmente.");
  };

  const patch = (id: string, delta: Partial<Ex>) => {
    setDirty((d) => ({ ...d, [id]: { ...(d[id] || {}), ...delta } }));
    setExercises((xs) => xs.map((x) => (x.id === id ? { ...x, ...delta } : x)));
    setReviewing(false);
  };

  const undo = (id: string) => {
    const previous = original.find(ex => ex.id === id);
    if (!previous) return;
    setExercises(xs => xs.map(ex => ex.id === id ? previous : ex));
    setDirty(current => { const next = { ...current }; delete next[id]; return next; });
    setReasons(current => { const next = { ...current }; delete next[id]; return next; });
    setReviewing(false);
  };

  const totalSets = exercises.reduce((sum, ex) => sum + (Number.isFinite(ex.sets) ? ex.sets : 0), 0);
  const muscleVolumes = Object.entries(exercises.reduce<Record<string, number>>((result, ex) => {
    const group = ex.muscle_groups?.[0] || "Outros";
    result[group] = (result[group] || 0) + (Number.isFinite(ex.sets) ? ex.sets : 0);
    return result;
  }, {})).sort((a, b) => b[1] - a[1]);

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
      if (applied) await recordAcceptedAdjustment();
      setApplied(false);
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
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-data tracking-[0.3em] text-primary/80">AJUSTE DE TREINO · {selectedDate}</p>
          <h1 className="text-2xl font-display tracking-tight">{sessionName}</h1>
        </div>
        <button onClick={loadToday} aria-label="Atualizar treino" disabled={reloading} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${reloading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mx-4 mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <label className="text-xs text-muted-foreground">Sessão programada
          <input type="date" min={today} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-2 block w-full rounded-lg border border-white/10 bg-background p-2 text-foreground" />
        </label>
        {executionStatus && <p className="mt-3 text-sm text-amber-400">Treino {executionStatus}. A prescrição executada fica preservada; escolha uma sessão futura para ajustar.</p>}
        {scores?.context?.safety.review_required && <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">Há dor ou restrição registrada. Revise qualquer troca com seu profissional antes de executar o treino.</p>}
      </div>

      {exercises.length > 0 && selectedDate === today && (
        <div className="mx-4 mt-4">
          <button onClick={openInGuidedPlayer}
            className="w-full rounded-2xl border border-primary/40 bg-primary/[0.06] py-3 flex items-center justify-center gap-2 font-bold text-primary hover:bg-primary/[0.12] transition">
            <Play className="w-4 h-4" /> Abrir no player guiado
          </button>
        </div>
      )}

      {exercises.length > 0 && <div className="mx-4 mt-5 rounded-[26px] border border-primary/25 bg-gradient-to-br from-primary/15 via-white/[0.04] to-transparent p-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase text-muted-foreground">Sync</p><p className="mt-1 text-xl font-bold text-primary">{scores?.sync.status === "available" && scores.sync.value != null ? `${Math.round(scores.sync.value)}%` : "—"}</p></div>
          <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase text-muted-foreground">PDI</p><p className="mt-1 text-sm font-semibold">{adjustment?.pdiAvailable === true ? "Ativo" : adjustment?.pdiAvailable === false ? "Sem dados" : "—"}</p></div>
          <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase text-muted-foreground">Smart Treino</p><p className="mt-1 text-sm font-semibold">{dayNumber ? `Dia ${dayNumber}` : "Sessão"}</p></div>
        </div>
        <div className="mt-5 flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /><h2 className="font-bold">FitCopilot · Smart Treino</h2></div>
        {loading && <p className="mt-3 text-sm text-muted-foreground">Analisando sua prescrição e os sinais disponíveis…</p>}
        {!loading && adjustmentError && <button className="mt-3 text-left text-sm text-amber-300 underline" onClick={() => void runCopilot()}>{adjustmentError} Tentar novamente</button>}
        {!loading && adjustment && <>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">{adjustment.rationale}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">Base: prescrição Smart Treino{scores?.sync.status === "available" ? ` · Sync disponível${scores.sync.observed_at ? ` (${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(scores.sync.observed_at))})` : ""}` : " · Sync sem leitura atual"}{adjustment.pdiAvailable ? " · PDI configurado" : " · PDI sem calibração"}. Fadiga é uma avaliação da IA, não uma medição clínica.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/10 px-3 py-1">Intensidade: {adjustment.intensity}</span><span className="rounded-full bg-white/10 px-3 py-1">Fadiga: {adjustment.fatigueLevel}</span><span className="rounded-full bg-white/10 px-3 py-1">{adjustment.changes.length + adjustment.swaps.length} mudanças sugeridas</span></div>
          {(adjustment.changes.length > 0 || adjustment.swaps.length > 0) && <div className="mt-4 space-y-2">{adjustment.changes.map((change, index) => <p key={`change-${index}`} className="rounded-lg bg-background/60 p-2 text-xs"><b>{change.exercise}</b>: {change.reason}</p>)}{adjustment.swaps.map((swap, index) => <p key={`swap-${index}`} className="rounded-lg bg-background/60 p-2 text-xs"><b>{swap.from} → {swap.to}</b>: {swap.reason}</p>)}</div>}
          {!applied && adjustment.changes.length + adjustment.swaps.length > 0 && <button type="button" onClick={applyCopilotSuggestion} disabled={!!executionStatus} className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40">Preparar sugestão para revisão</button>}
          {!applied && adjustment.changes.length + adjustment.swaps.length === 0 && <p className="mt-3 text-xs text-muted-foreground">Sem mudança recomendada com os dados atuais. Você ainda pode ajustar manualmente.</p>}
          {applied && <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300"><Check className="mr-2 inline h-4 w-4" />Sugestão preparada. Revise as mudanças e publique no botão abaixo.</p>}
        </>}
        {!executionStatus && <div className="mt-5 border-t border-white/10 pt-4"><label className="block text-xs text-muted-foreground" htmlFor="adjustment-request">Pedir outro ajuste</label><div className="mt-2 flex gap-2"><input id="adjustment-request" value={request} onChange={e => setRequest(e.target.value)} maxLength={300} placeholder="Ex.: mais leve hoje, pouco tempo…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-background px-3 py-2 text-sm" /><button onClick={() => void runCopilot(request)} disabled={loading || !request.trim()} className="rounded-xl border border-primary/50 px-3 text-sm font-semibold text-primary disabled:opacity-40">Pedir</button></div><div className="mt-2 flex flex-wrap gap-2">{["Mais leve hoje", "Pouco tempo, encurtar", "Poupar ombro", "Mais intenso"].map(option => <button key={option} onClick={() => { setRequest(option); void runCopilot(option); }} disabled={loading} className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-muted-foreground disabled:opacity-40">{option}</button>)}</div></div>}
      </div>}

      {exercises.length > 0 && <div className="mx-4 mt-5 flex items-center justify-between"><div><h2 className="font-bold">{mode === "manual" ? "Edição manual" : "Treino ajustado"} · {exercises.length} exercícios</h2><p className="text-xs text-muted-foreground">{totalSets} séries na sessão</p></div><button onClick={() => setMode(mode === "manual" ? "suggestion" : "manual")} className="text-xs font-semibold text-primary underline">{mode === "manual" ? "Ver sugestão da IA" : "Ajustar manualmente"}</button></div>}
      {mode === "manual" && exercises.length > 0 && <div className="mx-4 mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm font-semibold">Volume da sessão · {totalSets} séries</p><div className="mt-3 space-y-2">{muscleVolumes.map(([group, sets]) => <div key={group} className="flex items-center gap-2 text-xs"><span className="w-24 truncate">{group}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-primary" style={{ width: `${totalSets ? (sets / totalSets) * 100 : 0}%` }} /></div><span>{sets}</span></div>)}</div></div>}

      <div className="mx-4 mt-6 space-y-3">
        {exercises.length === 0 && !reloading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
            Não há prescrição diária salva para esta data. Escolha outra sessão ou crie um treino no Train.
            <div className="mt-3 flex justify-center gap-3"><button className="text-primary" onClick={() => navigate("/9fit/train")}>Escolher ou gerar treino</button><button className="text-primary" onClick={() => navigate("/9fit/staff")}>Solicitar ajuste à equipe</button></div>
          </div>
        )}
        {exercises.map((ex) => (
          <div key={ex.id} className={`rounded-2xl border bg-white/[0.04] p-4 ${dirty[ex.id] ? "border-primary/35" : "border-white/10"}`}>
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
            {reasons[ex.id] && <p className="mt-2 rounded-lg bg-primary/10 p-2 text-xs text-primary">{reasons[ex.id]}</p>}
            {dirty[ex.id] && <button onClick={() => undo(ex.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline"><RotateCcw className="h-3 w-3" />Desfazer neste exercício</button>}
            <div className={`mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 ${mode === "suggestion" ? "hidden" : ""}`}>
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
              Trocar exercício · mesmo grupo muscular
              <select value={ex.new_exercise_name ?? ""} onChange={(e) => patch(ex.id, { new_exercise_name: e.target.value })} disabled={!!executionStatus}
                className="mt-1 w-full rounded-lg border border-white/10 bg-background p-2 text-sm text-foreground">
                <option value="">Manter exercício atual</option>
                {exerciseOptions.filter(option => option.name !== ex.name && (!ex.muscle_groups?.length || option.muscle_groups.some(group => ex.muscle_groups?.includes(group)))).map(option => <option key={option.name} value={option.name}>{option.name}</option>)}
              </select>
            </label>
          </div>
        ))}
      </div>

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

      <div className="sticky bottom-16 z-20 mt-6 border-t border-white/10 bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={onSave} disabled={saving || !!executionStatus || Object.keys(dirty).length === 0}
          className="w-full rounded-full bg-primary py-4 font-bold uppercase tracking-widest text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? "Publicando..." : reviewing ? "Confirmar publicação" : `Revisar ${Object.keys(dirty).length} ajustes`}
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
}
