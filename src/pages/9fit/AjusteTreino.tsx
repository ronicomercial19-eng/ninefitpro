import { useEffect, useRef, useState } from "react";
import { businessDate } from "@/services/dailyContextRules";
import { ArrowLeftRight, ChevronLeft, Check, Loader2, Play, RefreshCw, RotateCcw, Send, SlidersHorizontal, Sparkles, X } from "lucide-react";
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
  notes?: string;
};
type ExerciseOption = { name: string; muscle_groups: string[] };

const doseLabel = (dose: string) => /(?:\d|\s)(?:km|m|metros?)\b/i.test(dose)
  ? "Distância" : /(?:\d|\s)(?:min|seg|s|segundos?)\b/i.test(dose) ? "Duração" : "Reps / dose";

const ACTIVE_STATUSES = ["started", "in_progress", "paused"];

/** Texto legível para o status da execução (antes aparecia o valor cru, ex.: "in_progress"). */
const executionMessage = (status: string) =>
  ACTIVE_STATUSES.includes(status)
    ? "Este treino foi iniciado e ainda não foi finalizado. Retome no player para concluí-lo; depois você poderá ajustar as próximas sessões."
    : status === "completed"
      ? "Treino de hoje concluído. A prescrição executada fica preservada; escolha uma sessão futura para ajustar."
      : "Esta sessão foi pulada. Escolha uma sessão futura para ajustar.";

/** O catálogo tem muscle_groups vazio; target_muscles é o campo preenchido. */
const toGroups = (e: any): string[] => {
  const direct = Array.isArray(e?.muscle_groups) ? e.muscle_groups.filter((g: unknown): g is string => typeof g === "string") : [];
  if (direct.length) return direct;
  return Array.isArray(e?.target_muscles) ? e.target_muscles.filter((g: unknown): g is string => typeof g === "string") : [];
};

export default function NineFitAjusteTreino() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const workoutName = params.get("workout") ?? "Treino de Hoje";
  const redFlagSource = params.get("source");
  const painRegion = params.get("region");
  const [sessionName, setSessionName] = useState(workoutName);
  const [preferredDailyId,setPreferredDailyId]=useState(params.get('daily_workout_id')||'');
  const [availableSessions,setAvailableSessions]=useState<{id:string;day_name:string;workout_type:string}[]>([]);
  const { athleteId } = useAthleteId();
  const { data: scores, refresh: refreshScores } = useAthleteScores(athleteId);
  const [mode, setMode] = useState<"suggestion" | "manual">("suggestion");
  const [request, setRequest] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState(false);
  const [published, setPublished] = useState(false);
  const [animatedSync, setAnimatedSync] = useState(0);
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Ex[]>([]);
  const [original, setOriginal] = useState<Ex[]>([]);
  const [selectedDate, setSelectedDate] = useState(businessDate());
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOption[]>([]);
  const [dailyId, setDailyId] = useState<string | null>(null);
  const [workoutUpdatedAt, setWorkoutUpdatedAt] = useState<string | null>(null);
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [workoutType, setWorkoutType] = useState<string | null>(null);
  const [focusMuscles, setFocusMuscles] = useState<string[]>([]);
  const [periodization, setPeriodization] = useState<{ model?: string | null; status?: string | null; notes?: string | null; phase?: string | null; category?: string | null; week?: number | null; rpeCap?: number | null }>({});
  const [dirty, setDirty] = useState<Record<string, Partial<Ex>>>({});
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const requestedKey = useRef("");
  const loadToken = useRef(0);
  const publishing = useRef(false);
  const { adjustment, loading, error: adjustmentError, generate, apply: recordAcceptedAdjustment, reset: resetAdjustment } = useAdaptiveAdjustment();

  const today = businessDate();
  const pending = Object.keys(dirty).length;

  useEffect(() => {
    const target = scores?.sync.status === 'available' ? scores.sync.value : null;
    if (target == null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setAnimatedSync(Math.round(target)); return; }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => { const progress = Math.min(1, (now - started) / 650); setAnimatedSync(Math.round(target * (1 - (1 - progress) ** 3))); if (progress < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scores?.sync.value, scores?.sync.status]);

  const loadToday = async () => {
    if (!athleteId) return;
    const token = ++loadToken.current;
    resetAdjustment();
    setReloading(true);
    try {
      const { data: sessions, error: workoutError } = await supabase
        .from("daily_workouts" as any)
        .select("id,day_name,day_number,workout_type,focus_muscles,updated_at")
        .eq("athlete_id", athleteId)
        .eq("workout_date", selectedDate)
        .order("created_at", { ascending: false }).limit(20);
      if (token !== loadToken.current) return;
      if (workoutError) throw workoutError;
      const available=(sessions||[]) as {id:string;day_name:string;workout_type:string;updated_at:string;day_number:number;focus_muscles:string[]}[];
      setAvailableSessions(available);
      const dw=available.find(d=>d.id===preferredDailyId)||available.find(d=>d.workout_type!=='quick')||available[0]||null;
      setDailyId((dw as any)?.id || null);
      setWorkoutUpdatedAt((dw as any)?.updated_at ?? null);
      setDayNumber((dw as any)?.day_number ?? null);
      setWorkoutType((dw as any)?.workout_type ?? null);
      setFocusMuscles(Array.isArray((dw as any)?.focus_muscles) ? (dw as any).focus_muscles : []);
      // Fonte padronizada da periodização ativa (mesma view usada em Planejamento).
      // Antes lia athlete_periodizations com status 'active'/'ativo', que nunca existem na tabela (real: in_progress/pending/archived).
      const { data: activePeriodization } = await supabase.from("vw_athlete_periodizacao_ativa" as any)
        .select("plan_name,status,current_phase,current_phase_category,current_week_index,rpe_cap")
        .eq("athlete_id", athleteId).limit(1).maybeSingle();
      const ap: any = activePeriodization;
      const capValues = ap?.rpe_cap ? String(ap.rpe_cap).split("-").map(Number).filter(Number.isFinite) : [];
      const capMax = capValues.length ? Math.max(...capValues) : null;
      setPeriodization(ap ? { model: ap.plan_name, status: ap.status, phase: ap.current_phase, category: ap.current_phase_category, week: ap.current_week_index ?? null, rpeCap: capMax } : {});
      setSessionName((dw as any)?.day_name || workoutName);
      if (!(dw as any)?.id) { setExercises([]); setOriginal([]); setExecutionStatus(null); setDirty({}); return; }
      const { data: executions, error: executionError } = await supabase.from("workout_executions")
        .select("status").eq("athlete_id", athleteId).eq("workout_date", selectedDate);
      if (token !== loadToken.current) return;
      if (executionError) throw executionError;
      setExecutionStatus((executions ?? []).find((row) => ["started", "in_progress", "paused", "completed", "skipped"].includes(row.status))?.status ?? null);
      const { data: rows, error: rowsError } = await supabase
        .from("workout_exercises" as any)
        .select("*, exercises(name,video_url,muscle_groups,target_muscles)")
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
        muscle_groups: toGroups(r.exercises),
        notes: r.notes ? String(r.notes) : undefined,
      }));
      setExercises(loaded);
      setOriginal(loaded);
      setDirty({});
      setReasons({});
      setApplied(false);
      setPublished(false);
    } catch (error: any) { if (token === loadToken.current) toast.error(error.message || "Não foi possível carregar o treino."); }
    finally { if (token === loadToken.current) setReloading(false); }
  };

  useEffect(() => {
    void loadToday();
    const refresh = () => { if (!publishing.current) void loadToday(); };
    window.addEventListener("9fit:workout-updated", refresh);
    return () => window.removeEventListener("9fit:workout-updated", refresh);
    /* eslint-disable-next-line */
  }, [athleteId, selectedDate, preferredDailyId]);

  useEffect(() => {
    void supabase.from("exercises").select("name,muscle_groups,target_muscles").order("name").limit(1000)
      .then(({ data }) => setExerciseOptions(((data ?? []) as any[]).filter(row => !!row.name).map(row => ({ name: row.name as string, muscle_groups: toGroups(row) }))));
  }, []);

  /** Troca segura: só oferece exercícios do mesmo grupo. Sem grupo conhecido, não oferece nada. */
  const swapChoicesFor = (ex: Ex) => exerciseOptions
    .filter(option => option.name !== ex.name && !!ex.muscle_groups?.length && option.muscle_groups.some(group => ex.muscle_groups?.includes(group)))
    .slice(0, 4);

  const runCopilot = async (customRequest = "") => {
    if (customRequest && Object.keys(dirty).length && !applied) { toast.info("Aplique ou desfaça as mudanças manuais antes de pedir outro ajuste."); return; }
    if (executionStatus) { toast.info("Esta sessão já foi iniciada. Escolha uma futura para ajustar."); return; }
    if (!exercises.length) { toast.info("Carregue um treino antes de pedir ajustes."); return; }
    const r = await generate({ workoutName: sessionName, workoutType: workoutType ?? undefined, date: selectedDate, request: customRequest, dayNumber, focusMuscles, periodization, painRegion,
      reviewRequired: !!redFlagSource || !!scores?.context?.safety.review_required,
      calibration: selectedDate === today && scores?.context?.date === today ? scores.context.calibration : undefined,
      safetyReason: redFlagSource ? "pain_red_flag" : scores?.context?.safety.reason,
      sync: scores?.sync.status === "available" ? scores.sync.value : null,
      exercises: original.map(exercise => exercise.name),
      prescription: original.map(exercise => ({ name: exercise.name, sets: exercise.sets, reps: exercise.reps_range, restSeconds: exercise.rest_seconds, rpe: exercise.intensidade })) });
    if (r) { setMode("suggestion"); setApplied(false); }
  };

  useEffect(() => {
    const key = `${athleteId}:${selectedDate}:${dailyId}:${workoutUpdatedAt}:${scores?.context?.safety.review_required ?? false}:${scores?.context?.calibration.observed_at ?? ''}`;
    if (reloading || !athleteId || !dailyId || !original.length || executionStatus || requestedKey.current === key) return;
    requestedKey.current = key;
    void runCopilot();
    // Generate once for each saved prescription; the user can explicitly request another adjustment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId, selectedDate, dailyId, workoutUpdatedAt, original.length, executionStatus, reloading, redFlagSource, scores?.context?.generated_at]);

  const applyCopilotSuggestion = () => {
    if (!adjustment || executionStatus) return;
    let applied = 0;
    const nextReasons: Record<string, string> = {};
    const nextDirty: Record<string, Partial<Ex>> = {};
    const preview = (id: string, delta: Partial<Ex>) => { nextDirty[id] = { ...nextDirty[id], ...delta }; };
    adjustment.swaps.forEach((swap) => {
      const target = original.find((exercise) => exercise.name.toLocaleLowerCase() === swap.from.toLocaleLowerCase());
      // Troca só é aceita se o grupo muscular do exercício original for conhecido e coincidir.
      const replacement = exerciseOptions.find(option => option.name.toLocaleLowerCase() === swap.to.toLocaleLowerCase()
        && !!target?.muscle_groups?.length && option.muscle_groups.some(group => target.muscle_groups?.includes(group)))?.name;
      if (target && replacement) {
        preview(target.id, { new_exercise_name: replacement });
        nextReasons[target.id] = swap.reason;
        applied += 1;
      }
    });
    adjustment.changes.forEach(change => {
      const target = original.find(exercise => exercise.name.toLocaleLowerCase() === change.exercise.toLocaleLowerCase());
      if (!target) return;
      const delta: Partial<Ex> = {};
      if (Number.isInteger(change.sets) && change.sets! >= 1 && change.sets! <= 10) delta.sets = change.sets;
      if (typeof change.reps === "string" && change.reps.trim() && change.reps.length <= 40) delta.reps_range = change.reps.trim();
      if (Number.isInteger(change.restSeconds) && change.restSeconds! >= 0 && change.restSeconds! <= 600) delta.rest_seconds = change.restSeconds;
      if (Number.isInteger(change.rpe) && change.rpe! >= 1 && change.rpe! <= 10) delta.intensidade = change.rpe;
      if (Object.keys(delta).length) { preview(target.id, delta); nextReasons[target.id] = change.reason; applied += 1; }
    });
    setDirty(nextDirty);
    setExercises(original.map(ex => ({ ...ex, ...nextDirty[ex.id] })));
    setPublished(false);
    setReasons(nextReasons);
    setApplied(applied > 0);
    if (!applied && !adjustment.contextual) toast.info("Nenhuma mudança válida para esta prescrição. Você pode ajustar manualmente.");
  };

  const patch = (id: string, delta: Partial<Ex>) => {
    setDirty((d) => ({ ...d, [id]: { ...(d[id] || {}), ...delta } }));
    setExercises((xs) => xs.map((x) => (x.id === id ? { ...x, ...delta } : x)));
    setPublished(false);
    setApplied(false);
  };

  useEffect(() => {
    if (adjustment && !executionStatus) applyCopilotSuggestion();
    // A new suggestion is previewed once; manual edits and undo stay under the user's control.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustment]);

  const undo = (id: string) => {
    const previous = original.find(ex => ex.id === id);
    if (!previous) return;
    setExercises(xs => xs.map(ex => ex.id === id ? previous : ex));
    setDirty(current => { const next = { ...current }; delete next[id]; return next; });
    setReasons(current => { const next = { ...current }; delete next[id]; return next; });
    setPublished(false);
    setApplied(false);
  };

  const pickSwap = (exercise: Ex, option: ExerciseOption) => {
    patch(exercise.id, { new_exercise_name: option.name });
    setReasons(current => ({ ...current, [exercise.id]: `Troca escolhida para manter o grupo ${exercise.muscle_groups?.[0] || "muscular"}.` }));
    setSwapOpen(null);
  };

  const totalSets = exercises.reduce((sum, ex) => sum + (Number.isFinite(ex.sets) ? ex.sets : 0), 0);
  const muscleVolumes = Object.entries(exercises.reduce<Record<string, number>>((result, ex) => {
    const group = ex.muscle_groups?.[0] || "Outros";
    result[group] = (result[group] || 0) + (Number.isFinite(ex.sets) ? ex.sets : 0);
    return result;
  }, {})).sort((a, b) => b[1] - a[1]);

  const onSave = async () => {
    if (!athleteId || !dailyId || saving || executionStatus) return;
    if (redFlagSource || scores?.context?.safety.review_required || adjustment?.contextual?.kind === 'review') { toast.warning('Revisão profissional necessária. Nenhum ajuste automático será publicado.'); return; }
    if (exercises.some(ex => !Number.isInteger(ex.sets) || ex.sets < 1 || ex.sets > 10 || !ex.reps_range.trim() || /^\d{3,}$/.test(ex.reps_range.trim()) || !Number.isInteger(ex.rest_seconds) || ex.rest_seconds < 0 || ex.rest_seconds > 600 || (ex.intensidade != null && (!Number.isInteger(ex.intensidade) || ex.intensidade < 1 || ex.intensidade > 10)))) { toast.error("Revise séries, dose com unidade, descanso e intensidade antes de publicar."); return; }
    setSaving(true);
    publishing.current = true;
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
        const saved = updated.map((r: any) => ({
          ...exercises.find(ex => ex.id === r.id),
          new_exercise_name: undefined,
          id: r.id,
          exercise_id: r.exercise_id,
          name: r.exercise_name || r.name,
          sets: r.sets ?? 3,
          reps_range: r.reps_range ?? "10-12",
          rest_seconds: r.rest_seconds ?? 60,
          intensidade: r.intensidade ?? undefined,
          video_url: r.video_url,
        }));
        setExercises(saved);
        setOriginal(saved);
      }
      setDirty({});
      setPublished(true);
      if (applied) {
        try { await recordAcceptedAdjustment(); }
        catch { toast.warning('Treino salvo. Não foi possível registrar o contexto complementar do ajuste.'); }
      }
      setApplied(false);
      setWorkoutUpdatedAt((data as any)?.updated_at ?? workoutUpdatedAt);
      window.dispatchEvent(new Event("9fit:workout-updated"));
      refreshScores();
    } catch (e: any) {
      console.error("[AjusteTreino] fn_publicar_ajuste_treino_dia", e);
      toast.error(e?.message || "Falha ao aplicar ajuste");
    } finally {
      setSaving(false);
      publishing.current = false;
    }
  };

  // FIX (player guiado): "ver vídeo" aqui abria o YouTube em nova aba.
  // Esta tela é de ajuste de parâmetros (séries/reps/descanso), não de
  // execução — então em vez de embutir o player inteiro, o botão agora
  // leva ao mesmo player guiado (WorkoutExecution via Train.tsx) já
  // posicionado no treino de hoje, mantendo o ajuste como tela separada.
  const openInGuidedPlayer = () => {
    if (redFlagSource || scores?.context?.safety.review_required) { toast.warning("Dor ou restrição ativa: publique uma revisão ou fale com a equipe antes de abrir o player."); return; }
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
    <div className="fitpro-orange min-h-screen bg-background pb-48 text-foreground">
      <div className="mx-auto max-w-2xl px-4 pt-6 flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-data tracking-[0.3em] text-primary/80">AJUSTE DE TREINO · {selectedDate === today ? "HOJE" : selectedDate}</p>
          <h1 className="text-2xl font-display tracking-tight text-white">{sessionName}</h1>
        </div>
        <button onClick={loadToday} aria-label="Atualizar treino" disabled={reloading} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${reloading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-4"><details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4" open={!!executionStatus || !!redFlagSource || !!scores?.context?.safety.review_required}>
        <summary className="cursor-pointer text-xs text-muted-foreground">Sessão · {selectedDate === today ? "Hoje" : selectedDate}</summary>
        <label className="text-xs text-muted-foreground">Sessão programada
          <input type="date" min={today} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-2 block w-full rounded-lg border border-white/10 bg-background p-2 text-foreground" />
        </label>
        {availableSessions.length>1&&<label className="mt-3 block text-xs text-muted-foreground">Treino desta data<select aria-label="Treino desta data" value={dailyId||''} onChange={e=>setPreferredDailyId(e.target.value)} className="mt-2 block w-full rounded-lg border border-primary/25 bg-background p-2 text-foreground">{availableSessions.map(d=><option key={d.id} value={d.id}>{d.workout_type==='quick'?'Sessão rápida · ':''}{d.day_name}</option>)}</select></label>}
        {executionStatus && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-amber-400">{executionMessage(executionStatus)}</p>
            {ACTIVE_STATUSES.includes(executionStatus) && selectedDate === today && (
              <button type="button" onClick={() => navigate("/9fit/train")} className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary"><Play className="h-3.5 w-3.5" />Retomar no player</button>
            )}
          </div>
        )}
        {redFlagSource && <p className="mt-3 rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-xs text-rose-100">Alerta de dor registrado{painRegion ? ` em ${painRegion}` : ""}. Esta revisão considera a prescrição e a periodização ativa; não retome o treino antes de publicar uma decisão revisada ou falar com a equipe.</p>}
        {scores?.context?.safety.review_required && <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">Há dor ou restrição registrada. Revise qualquer troca com seu profissional antes de executar o treino.</p>}
      </details></div>

      {exercises.length > 0 && selectedDate === today && (
        <div className="mx-auto mt-4 max-w-2xl px-4">
          <button onClick={openInGuidedPlayer} disabled={!!redFlagSource || !!scores?.context?.safety.review_required}
            className="w-full rounded-2xl border border-primary/40 bg-primary/[0.06] py-3 flex items-center justify-center gap-2 font-bold text-primary hover:bg-primary/[0.12] transition">
            <Play className="w-4 h-4" /> Abrir no player guiado
          </button>
        </div>
      )}

      {exercises.length > 0 && <div className="mx-auto mt-5 max-w-2xl px-4"><div className="rounded-[26px] border border-primary/25 bg-gradient-to-br from-primary/15 via-white/[0.04] to-transparent p-5 shadow-[0_20px_60px_-35px_hsl(var(--primary)/0.8)]">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Sync</p><p className="mt-1 text-xl font-bold tabular-nums text-primary">{scores?.sync.status === "available" && scores.sync.value != null ? `${animatedSync}%` : "—"}</p><p className="text-[10px] text-muted-foreground">sinal de hoje</p></div>
          <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Contexto</p><p className="mt-1 text-sm font-semibold text-primary">{selectedDate === today && scores?.context?.date === today ? 'Check-in do dia' : 'Parcial'}</p><p className="text-[10px] text-muted-foreground">declarado, não clínico</p></div>
          <div className="rounded-xl bg-background/70 p-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Dia do ciclo</p><p className="mt-1 text-sm font-semibold">{dayNumber ? `Dia ${dayNumber}` : "—"}</p><p className="text-[10px] text-muted-foreground">{periodization.phase ? `${periodization.phase}${periodization.week ? ` · sem ${periodization.week}` : ""}${periodization.rpeCap ? ` · RPE ≤ ${Math.floor(periodization.rpeCap)}` : ""}` : "sem periodização ativa"}</p></div>
        </div>
        <div className="mt-5 rounded-2xl border border-primary/20 bg-background/40 p-4"><div className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /><h2 className="font-bold">Motor contextual · ajuste para esta sessão</h2></div>
        <p className="mt-2 text-xs text-muted-foreground">Melhor hoje pode ser manter. Sua prescrição só muda após confirmar em Aplicar ajustes.</p>
        {!executionStatus && <div className="mt-3 flex flex-wrap gap-2">{['Revisar contexto', 'Mais leve hoje', 'Pouco tempo, encurtar', 'Falta equipamento'].map(option => <button key={option} type="button" disabled={loading || reloading} onClick={() => void runCopilot(option === 'Revisar contexto' ? '' : option)} className="rounded-full border border-primary/30 px-3 py-2 text-xs text-primary disabled:opacity-40">{option}</button>)}</div>}
        {loading && <p className="mt-3 text-sm text-muted-foreground">Analisando sua prescrição e os sinais disponíveis…</p>}
        {!loading && adjustmentError && <button className="mt-3 text-left text-sm text-amber-300 underline" onClick={() => void runCopilot()}>{adjustmentError} Tentar novamente</button>}
        {!loading && adjustment && <>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">{adjustment.rationale}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">Base: {adjustment.contextual?.sources.join(' · ') || 'prescrição atual'}. Objetivo, exercícios, dose e descanso preservados pelo motor.</p>
          {adjustment.contextual && <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">{adjustment.contextual.limitations.map(note => <li key={note}>{note}</li>)}</ul>}
          <p className="mt-3 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">{pending === 0 ? "Nenhum exercício ajustado" : pending === 1 ? "1 exercício ajustado" : `${pending} exercícios ajustados`}</p>
          <div className="mt-4 rounded-xl bg-background/60 p-3 text-xs"><span className="text-primary font-semibold">Decisão: </span>{adjustment.contextual?.kind === 'review' ? 'Revisão profissional' : adjustment.contextual?.kind === 'shorten' ? 'Encurtar volume' : adjustment.contextual?.kind === 'reduce' ? 'Reduzir volume' : 'Manter prescrição'}<p className="mt-1 text-muted-foreground">Não é uma avaliação clínica nem liberação para treinar com dor.</p></div>
          {!applied && adjustment.changes.length + adjustment.swaps.length === 0 && <p className="mt-3 text-xs text-muted-foreground">Sem mudança recomendada com os dados atuais. Você ainda pode ajustar manualmente.</p>}
          {published && <p role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300"><Check className="mr-2 inline h-4 w-4" />Treino atualizado — bom treino!</p>}
        </>}</div>
        {!executionStatus && <button type="button" onClick={() => setRequestSheetOpen(true)} className="mt-5 flex w-full items-center justify-center gap-2 border-t border-white/10 pt-4 text-sm font-semibold text-primary"><SlidersHorizontal className="h-4 w-4" /> Pedir outro ajuste</button>}
      </div></div>}

      {exercises.length > 0 && <div className="mx-auto mt-5 flex max-w-2xl items-center justify-between px-4"><div><h2 className="font-bold">{mode === "manual" ? "Editando manualmente" : published ? "Treino atualizado" : 'Prévia da sessão'} · {exercises.length} exercícios</h2><p className="text-xs text-muted-foreground">{totalSets} séries na sessão</p></div><button onClick={() => setMode(mode === "manual" ? "suggestion" : "manual")} className="text-xs font-semibold text-primary underline">{mode === "manual" ? "Voltar à sugestão" : "Ajustar manualmente"}</button></div>}
      {mode === "manual" && exercises.length > 0 && <div className="mx-auto mt-3 max-w-2xl px-4"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm font-semibold">Volume da sessão · {totalSets} séries</p><div className="mt-3 space-y-2">{muscleVolumes.map(([group, sets]) => <div key={group} className="flex items-center gap-2 text-xs"><span className="w-24 truncate">{group}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${totalSets ? (sets / totalSets) * 100 : 0}%` }} /></div><span>{sets}</span></div>)}</div></div></div>}

      <div className="mx-auto mt-6 max-w-2xl space-y-3 px-4">
        {exercises.length === 0 && !reloading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
            Não há prescrição diária salva para esta data. Escolha outra sessão ou crie um treino no Train.
            <div className="mt-3 flex justify-center gap-3"><button className="text-primary" onClick={() => navigate("/9fit/train")}>Escolher ou gerar treino</button><button className="text-primary" onClick={() => navigate("/9fit/staff")}>Solicitar ajuste à equipe</button></div>
          </div>
        )}
        {exercises.map((ex) => (
          <div key={ex.id} className={`rounded-2xl border bg-white/[0.04] p-4 transition ${dirty[ex.id] ? "border-primary/50 shadow-[0_0_24px_-16px_hsl(var(--primary))]" : "border-white/10"}`}>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
              <p className="text-primary text-xs font-semibold">{ex.new_exercise_name || ex.name}{dirty[ex.id] && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] uppercase tracking-wider text-primary">ajustado</span>}</p>
              {ex.new_exercise_name && <p className="text-xs text-primary">Troca pendente: {ex.new_exercise_name}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">
                  {ex.sets} × {ex.reps_range} · {ex.rest_seconds} s de descanso
                </p>
                {ex.notes && <p className="mt-1 text-[11px] text-foreground/70">{ex.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                {!executionStatus && <button type="button" aria-label={`Trocar exercício: ${ex.name}`} aria-expanded={swapOpen === ex.id} onClick={() => setSwapOpen(swapOpen === ex.id ? null : ex.id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-2 text-[10px] ${swapOpen === ex.id ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground"}`}><ArrowLeftRight className="h-3.5 w-3.5" />Trocar exercício</button>}
                {ex.video_url && <Play className="w-4 h-4 text-primary/60" />}
              </div>
            </div>
            {swapOpen === ex.id && !executionStatus && <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-background/60 p-2"><p className="px-1 text-[10px] uppercase text-muted-foreground">Trocar · mesmo grupo / restrição do dia</p>{swapChoicesFor(ex).length === 0 ? <p className="px-1 py-2 text-xs text-muted-foreground">Sem troca segura disponível no catálogo para este exercício. Fale com a equipe para ajustar.</p> : swapChoicesFor(ex).map(option => <button key={option.name} type="button" onClick={() => pickSwap(ex, option)} className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-xs"><span>{option.name}</span><ArrowLeftRight className="h-3 w-3 text-primary" /></button>)}</div>}
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
          </div>
        ))}
      </div>

      {/* Barra de confirmação: fica acima da navegação inferior e só mostra "Aplicar" quando há algo a aplicar. */}
      {exercises.length > 0 && (
        <div className="sticky bottom-[calc(7.25rem+env(safe-area-inset-bottom,0px))] z-20 mt-6 border-t border-white/10 bg-background/95 px-4 py-3 backdrop-blur">
          {pending > 0 || published ? (
            <button onClick={onSave} disabled={saving || !!executionStatus || pending === 0}
              className={`w-full rounded-full py-4 font-bold uppercase tracking-widest text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2 ${published ? "bg-emerald-500" : "bg-primary"}`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Aplicando..." : published ? "Treino ajustado!" : `Aplicar ${pending} ${pending === 1 ? "ajuste" : "ajustes"}`}
            </button>
          ) : (
            <p className="py-1 text-center text-xs text-muted-foreground">
              {executionStatus ? "Sessão iniciada: ajustes bloqueados." : "Nenhum ajuste pendente. Sua prescrição de hoje está mantida."}
            </p>
          )}
          {published && <p className="mt-2 text-center text-xs text-emerald-300"><Check className="mr-1 inline h-3 w-3" />Alteração registrada no histórico da sessão.</p>}
        </div>
      )}

      {requestSheetOpen && !executionStatus && <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setRequestSheetOpen(false)}><div className="w-full rounded-t-3xl border border-white/10 bg-background p-5" onClick={event => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><SlidersHorizontal className="h-4 w-4 text-primary" />O que você quer mudar?</h2><button type="button" aria-label="Fechar" onClick={() => setRequestSheetOpen(false)} className="rounded-full bg-white/10 p-2"><X className="h-4 w-4" /></button></div><div className="mb-4 flex flex-wrap gap-2">{["Mais leve hoje", "Pouco tempo, encurtar", "Poupar ombro", "Mais intenso"].map(option => <button key={option} type="button" onClick={() => setRequest(option)} className={`rounded-full border px-3 py-2 text-xs ${request === option ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground"}`}>{option}</button>)}</div><div className="flex gap-2"><input autoFocus value={request} onChange={event => setRequest(event.target.value)} maxLength={300} placeholder="Ex.: trocar supino, joelho incomodando…" className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm" /><button type="button" onClick={() => { setRequestSheetOpen(false); void runCopilot(request); }} disabled={loading || !request.trim()} className="rounded-full bg-primary p-3 text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button></div></div></div>}

      <BottomNavigation />
    </div>
  );
}
