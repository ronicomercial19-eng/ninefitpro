import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, Play, Pause, RotateCcw, Plus, Minus, 
  ChevronRight, ChevronLeft, Timer, Dumbbell, Zap, 
  Loader2, Check, Sparkles, Gauge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WearableConnectBox } from "./WearableConnectBox";
import { PostWorkoutModal } from "./PostWorkoutModal";
import { ExerciseVideoPlayer } from "@/components/exercises/ExerciseVideoPlayer";
import { mirrorEvent } from "@/services/intelligenceHub.service";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { toast } from "sonner";


interface TrainingAssignment {
  id: string;
  training_name: string;
  training_description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  training_type?: string;
  html_file_url?: string;
  training_data?: any;
}

interface WorkoutExecutionProps {
  training: TrainingAssignment;
  athleteId: string;
  onFinish: () => void;
  onBack: () => void;
}

// FIX SISTEMA (guided player como destino padrão): converte o retorno de
// prescrever_treino (blocos reset/neural/integracao/bloco9) no mesmo shape
// de exercises[] que o componente já consome quando training_type='structured'.
function flattenPrescricao(resultado: any): any[] {
  const t = resultado?.treino;
  if (!t) return [];
  const blocos = ['neural', 'bloco9', 'integracao', 'reset'];
  const out: any[] = [];
  for (const bloco of blocos) {
    const lista = Array.isArray(t[bloco]) ? t[bloco] : [];
    for (const ex of lista) {
      out.push({
        exercise_id: ex.id,
        name: ex.nome,
        sets: ex.series,
        reps: ex.reps,
        rest_seconds: ex.descanso ? parseInt(String(ex.descanso).replace(/\D/g, ''), 10) || undefined : undefined,
        tempo: ex.cadencia,
        target_muscles: ex.grupo_muscular ? [ex.grupo_muscular] : undefined,
        notes: ex.nota_tecnica,
        _bloco: bloco,
      });
    }
  }
  return out;
}

function injectMobileViewport(html: string): string {
  const viewportTag = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">';
  const mobileStyles = `<style>
    * { box-sizing: border-box; }
    body { max-width: 100vw !important; overflow-x: hidden !important; margin: 0; padding: 8px; }
    table { width: 100% !important; max-width: 100vw !important; table-layout: fixed !important; font-size: 12px !important; }
    td, th { word-wrap: break-word !important; overflow-wrap: break-word !important; padding: 4px !important; }
    img { max-width: 100% !important; height: auto !important; }
  </style>`;
  
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${viewportTag}${mobileStyles}`);
  } else if (html.includes('<html')) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${viewportTag}${mobileStyles}</head>`);
  }
  return `<!DOCTYPE html><html><head>${viewportTag}${mobileStyles}</head><body>${html}</body></html>`;
}

const WEEKDAY_KEYS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

export function WorkoutExecution({ training, athleteId, onFinish, onBack }: WorkoutExecutionProps) {
  // Live training data + realtime patches from daily_workouts.changes_json
  const [liveTraining, setLiveTraining] = useState<TrainingAssignment>(training);
  const [dailyOverride, setDailyOverride] = useState<any>(null);

  const todayKey = WEEKDAY_KEYS[new Date().getDay()];
  const todayISO = new Date().toISOString().slice(0, 10);

  // Apply daily override (from ajuste-treino) on top of base exercises
  const baseExercises = liveTraining.training_data?.exercises || [];
  const todayBase = baseExercises.filter((e: any) => e.training_day === todayKey);
  const baseList = todayBase.length > 0 ? todayBase : baseExercises;

  // FIX SISTEMA: exercícios resolvidos dinamicamente via prescrever_treino
  // quando a atribuição não trouxe training_data.exercises pronto (cobre
  // 'periodization' e 'html' — qualquer origem sem estrutura estática).
  //
  // BUGFIX (race condition): resolvingPlayer começa TRUE sempre que a
  // resolução via prescrever_treino é possível — antes começava false, o que
  // deixava uma janela no primeiro render onde isStructured=false E
  // stillResolving=false ao mesmo tempo. Nessa janela o fetch do HTML legado
  // (mais rápido, é só um GET de storage) populava htmlContent primeiro, e o
  // iframe antigo aparecia no lugar do player guiado mesmo quando a
  // resolução ia funcionar — era exatamente o "abriu e não teve player".
  const hasStaticExercisesInit = baseExercises.length > 0;
  const [resolvedExercises, setResolvedExercises] = useState<any[] | null>(null);
  const [resolvingPlayer, setResolvingPlayer] = useState(
    liveTraining.training_type !== 'link' && !hasStaticExercisesInit,
  );
  const [resolveFailed, setResolveFailed] = useState(false);

  useEffect(() => {
    setResolvedExercises(null);
    setResolveFailed(false);
    const hasStaticExercises = baseExercises.length > 0;
    const canTryPrescricao = liveTraining.training_type !== 'link' && !hasStaticExercises && athleteId;
    if (!canTryPrescricao) { setResolvingPlayer(false); return; }

    setResolvingPlayer(true);

    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase.rpc('prescrever_treino' as any, {
          p_aluno_id: athleteId,
          p_data: today,
        });

        if (error) { setResolveFailed(true); return; }
        const flat = flattenPrescricao(data);
        if (flat.length > 0) setResolvedExercises(flat);
        else setResolveFailed(true);
      } finally {
        setResolvingPlayer(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveTraining.id, athleteId]);

  const exercises = (() => {
    const source = baseList.length > 0 ? baseList : (resolvedExercises || []);
    if (!dailyOverride) return source;
    // Support two formats: full replacement or per-exercise patch
    if (Array.isArray(dailyOverride.exercises)) return dailyOverride.exercises;
    if (dailyOverride.intensity_pct || dailyOverride.fatigue_adjustment) {
      const factor = (dailyOverride.intensity_pct ?? 100) / 100;
      return source.map((e: any) => ({
        ...e,
        sets: Math.max(1, Math.round((e.sets || 3) + (dailyOverride.fatigue_adjustment ?? 0))),
        _adjusted: true,
        _intensity: dailyOverride.intensity_pct,
      }));
    }
    return source;
  })();

  // FIX SISTEMA: o player guiado agora é o destino padrão — só cai no
  // conteúdo html legado quando não há NENHUMA forma de resolver exercícios
  // (nem training_data estático, nem prescrever_treino, e a tentativa já terminou).
  const isStructured = exercises.length > 0;
  const stillResolving = resolvingPlayer && baseList.length === 0;

  // Current exercise index (for structured workouts)
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentExercise = exercises[currentIdx];

  // Load initial override + subscribe to realtime changes on daily_workouts
  const refreshDaily = async () => {
    const { data } = await supabase
      .from("daily_workouts")
      .select("changes_json, override_locked, updated_at")
      .eq("athlete_id", athleteId)
      .eq("workout_date", todayISO)
      .maybeSingle();
    if (data?.changes_json) setDailyOverride(data.changes_json);
  };

  useEffect(() => { refreshDaily(); /* eslint-disable-next-line */ }, [athleteId]);

  useRealtimeTable(
    { table: "daily_workouts", filter: `athlete_id=eq.${athleteId}`, enabled: !!athleteId },
    (payload: any) => {
      const row = payload.new;
      if (row?.workout_date === todayISO && row?.changes_json) {
        setDailyOverride(row.changes_json);
        toast.info("Treino do dia foi ajustado ✨");
      }
    },
  );

  // Refresh training assignment (professor can edit on the fly)
  useRealtimeTable(
    { table: "student_training_assignments", filter: `id=eq.${training.id}`, enabled: !!training.id },
    async () => {
      const { data } = await supabase
        .from("student_training_assignments")
        .select("*")
        .eq("id", training.id)
        .maybeSingle();
      if (data) {
        setLiveTraining(data as any);
        toast.info("Treino atualizado pelo seu professor");
      }
    },
  );

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerInitial, setTimerInitial] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Workout timer
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const workoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Weight tracking per exercise
  const [weights, setWeights] = useState<Record<number, number>>({});
  const [completedSets, setCompletedSets] = useState<Record<string, boolean[]>>({});
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [persisting, setPersisting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionAttempt, setExecutionAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("fn_start_workout_execution" as any, {
        p_assignment_id: training.id,
      } as any);
      if (cancelled) return;
      if (error || !data) {
        setExecutionError("Não foi possível iniciar uma execução persistente.");
        return;
      }

      const id = String(data);
      setExecutionId(id);
      const { data: savedSets, error: setsError } = await supabase
        .from("workout_exercise_sets")
        .select("exercise_order, set_number, completed, actual_weight")
        .eq("execution_id", id);
      if (cancelled || setsError) return;

      const restored: Record<string, boolean[]> = {};
      const restoredWeights: Record<number, number> = {};
      for (const row of savedSets ?? []) {
        const exerciseOrder = Number(row.exercise_order);
        const setNumber = Number(row.set_number);
        const list = restored[String(exerciseOrder)] ?? [];
        list[Math.max(0, setNumber - 1)] = row.completed === true;
        restored[String(exerciseOrder)] = list;
        if (row.actual_weight !== null) restoredWeights[exerciseOrder] = Number(row.actual_weight);
      }
      setCompletedSets(restored);
      setWeights(restoredWeights);
    })();

    return () => { cancelled = true; };
  }, [training.id, executionAttempt]);

  // HTML content (for html-type trainings) — só carrega quando o player
  // guiado não conseguiu resolver exercícios de nenhuma forma (fallback final)
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // PSE Modal
  const [showPSE, setShowPSE] = useState(false);

  // Video modal
  const [showVideo, setShowVideo] = useState(false);

  // Start workout timer
  useEffect(() => {
    if (!executionId) return;
    workoutTimerRef.current = setInterval(() => setWorkoutSeconds(s => s + 1), 1000);
    return () => { if (workoutTimerRef.current) clearInterval(workoutTimerRef.current); };
  }, [executionId]);

  // Rest timer
  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => {
          if (s <= 1) { setTimerRunning(false); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, timerSeconds]);

  // Set rest timer from exercise prescription
  useEffect(() => {
    if (isStructured && currentExercise?.rest_seconds) {
      setTimerInitial(currentExercise.rest_seconds);
      setTimerSeconds(currentExercise.rest_seconds);
    }
  }, [currentIdx]);

  // Load HTML content — só como último recurso, quando não há exercícios
  // estruturados nem estáticos nem resolvidos via prescrever_treino, e a
  // tentativa de resolução já terminou (stillResolving=false).
  useEffect(() => {
    if (!isStructured && !stillResolving && liveTraining.html_file_url && liveTraining.training_type !== 'link') {
      setLoadingContent(true);
      fetch(liveTraining.html_file_url)
        .then(r => r.text())
        .then(text => {
          if (text.startsWith('<html') || text.startsWith('<!DOCTYPE') || text.startsWith('<HTML')) {
            setHtmlContent(text);
          } else {
            setHtmlContent(`<!DOCTYPE html><html><body>${text}</body></html>`);
          }
        })
        .catch(() => setHtmlContent(null))
        .finally(() => setLoadingContent(false));
    }
  }, [liveTraining, isStructured, stillResolving]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const currentWeight = weights[currentIdx] ?? 20;
  const setWeight = (v: number) => setWeights(prev => ({ ...prev, [currentIdx]: v }));

  const toggleSet = async (exerciseIdx: number, setIdx: number) => {
    if (!executionId || persisting) {
      toast.error(executionError ?? "Aguarde o treino terminar de carregar.");
      return;
    }

    const key = `${exerciseIdx}`;
    const previous = [...(completedSets[key] || Array(exercises[exerciseIdx]?.sets || 3).fill(false))];
    const next = [...previous];
    next[setIdx] = !next[setIdx];
    setCompletedSets(current => ({ ...current, [key]: next }));
    setPersisting(true);

    const exercise = exercises[exerciseIdx] ?? {};
    const parsedReps = Number.parseInt(String(exercise.reps ?? exercise.reps_range ?? ""), 10);
    const { error } = await supabase.rpc("fn_save_workout_set" as any, {
      p_execution_id: executionId,
      p_exercise_name: String(exercise.name ?? "Exercício"),
      p_exercise_order: exerciseIdx,
      p_set_number: setIdx + 1,
      p_completed: next[setIdx],
      p_actual_reps: Number.isFinite(parsedReps) ? parsedReps : null,
      p_actual_weight: weights[exerciseIdx] ?? null,
      p_planned_reps: String(exercise.reps ?? exercise.reps_range ?? ""),
      p_rest_seconds: exercise.rest_seconds ?? null,
      p_tempo: exercise.tempo ?? null,
    } as any);
    setPersisting(false);

    if (error) {
      setCompletedSets(current => ({ ...current, [key]: previous }));
      setExecutionError(error.message);
      toast.error("Não foi possível salvar esta série. Tente novamente.");
    } else {
      setExecutionError(null);
    }
  };

  const handleFinishWorkout = async () => {
    if (!executionId || persisting) {
      toast.error(executionError ?? "A execução ainda não está pronta.");
      return;
    }

    setPersisting(true);
    const { data, error } = await supabase.rpc("fn_complete_workout_execution" as any, {
      p_execution_id: executionId,
      p_duration_seconds: workoutSeconds,
    } as any);
    setPersisting(false);

    if (error || !(data as any)?.ok) {
      toast.error((data as any)?.error === "no_completed_sets"
        ? "Conclua ao menos uma série antes de finalizar."
        : "Não foi possível concluir o treino.");
      return;
    }

    if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    await mirrorEvent("workout_completed", {
      execution_id: executionId,
      training_id: training.id,
      training_name: liveTraining.training_name,
      duration_seconds: workoutSeconds,
      completed_sets: (data as any).completed_sets,
    });
    setShowPSE(true);
  };

  // For link training
  if (liveTraining.training_type === 'link' && liveTraining.html_file_url) {
    window.open(liveTraining.html_file_url, '_blank');
    onBack();
    return null;
  }

  // P0: nunca abrir o player nem iniciar cronômetro sem execução persistida.
  if (!executionId || executionError) {
    const retry = () => {
      setExecutionError(null);
      setExecutionId(null);
      setExecutionAttempt((attempt) => attempt + 1);
    };
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          {executionError ? <p className="text-sm text-destructive">{executionError}</p> : <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />}
          <p className="text-sm text-muted-foreground">{executionError ? "O treino não foi iniciado. Nada foi marcado como concluído." : "Preparando uma execução segura…"}</p>
          {executionError && <Button onClick={retry} className="w-full">Tentar novamente</Button>}
          <Button variant="ghost" onClick={onBack} className="w-full">Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="text-center">
          <p className="text-xs text-primary font-bold uppercase tracking-widest">Em Execução</p>
          <p className="text-sm font-bold text-foreground truncate max-w-[200px]">{liveTraining.training_name}</p>
        </div>
        <div className="flex items-center gap-1 text-primary">
          <Timer className="w-4 h-4" />
          <span className="text-sm font-mono font-bold">{formatTime(workoutSeconds)}</span>
        </div>
      </div>

      {/* Wearable */}
      <div className="px-4 py-2 flex-shrink-0">
        <WearableConnectBox isWorkoutActive={true} />
      </div>

      {dailyOverride && (
        <div className="mx-4 mb-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 flex items-center gap-2 text-xs text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          Ajuste aplicado hoje
          {dailyOverride.intensity_pct && <span className="font-bold">• {dailyOverride.intensity_pct}%</span>}
          {typeof dailyOverride.fatigue_adjustment === "number" && (
            <span className="font-bold">• fadiga {dailyOverride.fatigue_adjustment > 0 ? "+" : ""}{dailyOverride.fatigue_adjustment}</span>
          )}
        </div>
      )}


      {/* Content Area */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {isStructured ? (
          /* Structured Exercise View */
          <div className="space-y-4">
            {/* Exercise Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="w-8 h-8 bg-muted rounded flex items-center justify-center disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                Exercício {currentIdx + 1} de {exercises.length}
              </p>
              <button
                onClick={() => setCurrentIdx(i => Math.min(exercises.length - 1, i + 1))}
                disabled={currentIdx === exercises.length - 1}
                className="w-8 h-8 bg-muted rounded flex items-center justify-center disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Current Exercise Card */}
            {currentExercise && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Video/GIF player — usa o player real (loading, fallback, toggle gif/video) */}
                {currentExercise.exercise_id ? (
                  <ExerciseVideoPlayer
                    exerciseId={currentExercise.exercise_id}
                    exerciseName={currentExercise.name}
                    className="w-full aspect-video"
                    showGif={true}
                  />
                ) : currentExercise.video_url ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={currentExercise.video_url}
                      className="w-full h-full border-0"
                      allowFullScreen
                      title={currentExercise.name}
                    />
                  </div>
                ) : currentExercise.gif_url ? (
                  <img src={currentExercise.gif_url} alt="" className="w-full h-48 object-cover" />
                ) : null}

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-lg font-black text-foreground">{currentExercise.name}</h3>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {currentExercise.target_muscles?.map((m: string) => (
                        <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                      ))}
                      {currentExercise.override_locked && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                          🔒 Bloqueado pelo Prof.
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Prescription */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Séries</p>
                      <p className="text-xl font-black text-foreground">{currentExercise.sets}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Reps</p>
                      <p className="text-xl font-black text-foreground">{currentExercise.reps}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Descanso</p>
                      <p className="text-xl font-black text-foreground">{currentExercise.rest_seconds ? `${currentExercise.rest_seconds}s` : "—"}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-0.5">
                        <Gauge className="w-2.5 h-2.5" /> Cadência
                      </p>
                      <p className="text-xl font-black text-foreground">{currentExercise.tempo || "—"}</p>
                    </div>
                  </div>

                  {/* Set Tracking */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Séries completadas</p>
                    <div className="flex gap-2">
                      {Array.from({ length: currentExercise.sets || 3 }).map((_, i) => {
                        const done = completedSets[`${currentIdx}`]?.[i] || false;
                        return (
                          <button
                            key={i}
                            onClick={() => toggleSet(currentIdx, i)}
                            className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all ${
                              done
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            {done ? <Check className="w-4 h-4" /> : i + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {currentExercise.notes && (
                    <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                      📝 {currentExercise.notes}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Exercise List Mini */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Todos os exercícios</p>
              {exercises.map((ex: any, idx: number) => {
                const allDone = (completedSets[`${idx}`] || []).length > 0 &&
                  (completedSets[`${idx}`] || []).every(Boolean);
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIdx(idx)}
                    className={`w-full flex items-center gap-2 p-2 rounded text-left text-sm transition-colors ${
                      idx === currentIdx ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
                    } ${allDone ? "line-through opacity-60" : ""}`}
                  >
                    <span className="w-5 text-xs font-bold">{idx + 1}.</span>
                    <span className="flex-1 truncate">{ex.name}</span>
                    <span className="text-xs">{ex.sets}x{ex.reps}</span>
                    {allDone && <Check className="w-3 h-3 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        ) : stillResolving ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Montando seu treino guiado...</p>
          </div>
        ) : loadingContent ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : htmlContent ? (
          <iframe
            srcDoc={injectMobileViewport(htmlContent)}
            sandbox="allow-scripts allow-popups allow-forms"
            className="w-full h-[60vh] border-0 rounded-lg"
            title={liveTraining.training_name}
          />
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Nenhum conteúdo disponível</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex-shrink-0 bg-card border-t border-border">
        {/* Rest Timer */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Descanso</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setTimerSeconds(timerInitial); setTimerRunning(false); }}
                className="w-8 h-8 bg-muted rounded-sm flex items-center justify-center">
                <RotateCcw className="w-3 h-3 text-muted-foreground" />
              </button>
              <button onClick={() => setTimerRunning(!timerRunning)}
                className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                  timerRunning ? "bg-primary/20 text-primary" : "bg-primary text-primary-foreground"
                }`}>
                {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <span className={`text-lg font-mono font-black w-16 text-center ${
                timerSeconds === 0 ? "text-primary animate-pulse" : "text-foreground"
              }`}>
                {formatTime(timerSeconds)}
              </span>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {[30, 45, 60, 90, 120].map(s => (
              <button key={s} onClick={() => { setTimerInitial(s); setTimerSeconds(s); setTimerRunning(false); }}
                className={`text-[10px] px-2 py-1 rounded-sm border transition-colors ${
                  timerInitial === s ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted border-border text-muted-foreground"
                }`}>
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* Weight Control */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Dumbbell className="w-4 h-4" /> Carga Atual
            </span>
            <div className="flex items-center gap-3">
              <button onClick={() => setWeight(Math.max(0, currentWeight - 2.5))}
                className="w-10 h-10 bg-muted rounded-sm flex items-center justify-center">
                <Minus className="w-4 h-4 text-foreground" />
              </button>
              <span className="text-2xl font-black text-foreground w-20 text-center">
                {currentWeight}<span className="text-sm text-muted-foreground ml-1">kg</span>
              </span>
              <button onClick={() => setWeight(currentWeight + 2.5)}
                className="w-10 h-10 bg-muted rounded-sm flex items-center justify-center">
                <Plus className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Finish */}
        <div className="px-4 py-3">
          <Button onClick={handleFinishWorkout} disabled={!executionId || persisting}
            className="w-full bg-primary text-primary-foreground font-black italic uppercase py-6 text-base">
            {persisting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Zap className="w-5 h-5 mr-2" />}
            {persisting ? "Salvando..." : "Concluir Treino"}
          </Button>
        </div>
      </div>

      <PostWorkoutModal open={showPSE} onClose={() => { setShowPSE(false); onFinish(); }}
        athleteId={athleteId} trainingName={liveTraining.training_name} />
    </div>
  );
}
