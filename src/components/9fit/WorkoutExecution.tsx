import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, Play, Pause, RotateCcw, Plus, Minus, 
  Timer, Dumbbell, Zap, 
  Loader2, Check, Sparkles, CheckCircle2, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WearableConnectBox } from "./WearableConnectBox";
import { PostWorkoutModal, type ExerciseSetRecord } from "./PostWorkoutModal";
import { mirrorEvent } from "@/services/intelligenceHub.service";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { toast } from "sonner";
import { TrendingUp, Layers, CalendarRange } from "lucide-react";


interface TrainingAssignment {
  id: string;
  training_name: string;
  training_description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  training_type?: string;
  html_file_url?: string;
  periodization_html?: string;
  periodization_file_url?: string;
  training_data?: any;
}

interface WorkoutExecutionProps {
  training: TrainingAssignment;
  athleteId: string;
  onFinish: () => void;
  onBack: () => void;
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

  const exercises = (() => {
    if (!dailyOverride) return baseList;
    // Support two formats: full replacement or per-exercise patch
    if (Array.isArray(dailyOverride.exercises)) return dailyOverride.exercises;
    if (dailyOverride.intensity_pct || dailyOverride.fatigue_adjustment) {
      const factor = (dailyOverride.intensity_pct ?? 100) / 100;
      return baseList.map((e: any) => ({
        ...e,
        sets: Math.max(1, Math.round((e.sets || 3) + (dailyOverride.fatigue_adjustment ?? 0))),
        _adjusted: true,
        _intensity: dailyOverride.intensity_pct,
      }));
    }
    return baseList;
  })();

  const isStructured = exercises.length > 0;

  // FIX (player guiado): fluxo agora é PASSO A PASSO — um exercício em
  // tela cheia por vez, "Concluir Exercício" avança automaticamente pro
  // próximo, e ao terminar o último mostra tela de resumo (tempo total,
  // exercícios realizados) antes de ir pro RPE. Igual ao padrão de app
  // de treino guiado (referência enviada pelo Rony).
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
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

  // HTML content (for html-type trainings)
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Periodization content (for periodization-type trainings)
  const [periodizationModel, setPeriodizationModel] = useState<any>(null);
  const [loadingPeriodization, setLoadingPeriodization] = useState(false);

  // PSE Modal
  const [showPSE, setShowPSE] = useState(false);

  // Start workout timer
  useEffect(() => {
    workoutTimerRef.current = setInterval(() => setWorkoutSeconds(s => s + 1), 1000);
    return () => { if (workoutTimerRef.current) clearInterval(workoutTimerRef.current); };
  }, []);

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

  // Load HTML content for html-type, and for periodization assigned as
  // HTML colado ou PDF (periodization_html / periodization_file_url),
  // que sao 2 das 3 formas que o professor pode atribuir periodizacao
  // (PeriodizationAssignDialog: aba PDF, aba HTML, aba Modelo).
  useEffect(() => {
    if (isStructured) return;

    // Periodizacao colada como HTML direto: sem fetch, ja e o conteudo.
    if (liveTraining.training_type === 'periodization' && liveTraining.periodization_html) {
      setHtmlContent(
        liveTraining.periodization_html.startsWith('<html') ||
        liveTraining.periodization_html.startsWith('<!DOCTYPE')
          ? liveTraining.periodization_html
          : `<!DOCTYPE html><html><body>${liveTraining.periodization_html}</body></html>`
      );
      return;
    }

    // Periodizacao como PDF: periodization_file_url aponta pro Storage.
    const urlToFetch = liveTraining.training_type === 'periodization'
      ? liveTraining.periodization_file_url
      : (liveTraining.training_type !== 'link' ? liveTraining.html_file_url : null);

    if (urlToFetch) {
      setLoadingContent(true);
      fetch(urlToFetch)
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
  }, [liveTraining]);

  // Load periodization model for periodization-type trainings.
  useEffect(() => {
    const hasDirectContent = !!(liveTraining.periodization_html || liveTraining.periodization_file_url);
    const modelId = liveTraining.training_type === 'periodization' && !hasDirectContent
      ? liveTraining.training_data?.model_id
      : null;
    if (!modelId) { setPeriodizationModel(null); return; }
    setLoadingPeriodization(true);
    supabase
      .from("periodization_models")
      .select("id, title, goal, duration, description, macrocycle, mesocycle, microcycle, graph_data")
      .eq("id", modelId)
      .maybeSingle()
      .then(({ data }) => setPeriodizationModel(data))
      .finally(() => setLoadingPeriodization(false));
  }, [liveTraining]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const currentWeight = weights[currentIdx] ?? 0;
  const setWeight = (v: number) => setWeights(prev => ({ ...prev, [currentIdx]: v }));

  // FIX #7 (QA Master): monta o payload de séries reais (carga + quais
  // foram marcadas) pra persistir em workout_exercise_sets via o modal.
  const buildRecordedSets = (): ExerciseSetRecord[] => {
    const records: ExerciseSetRecord[] = [];
    exercises.forEach((ex: any, exerciseIdx: number) => {
      const sets = completedSets[`${exerciseIdx}`] || [];
      sets.forEach((done, setIdx) => {
        if (done) {
          records.push({
            exercise_name: ex.name || `Exercício ${exerciseIdx + 1}`,
            exercise_order: exerciseIdx,
            set_number: setIdx + 1,
            actual_weight: weights[exerciseIdx] ?? null,
            completed: true,
          });
        }
      });
    });
    return records;
  };

  const exercisesRealizados = Object.keys(completedSets).filter(
    (k) => (completedSets[k] || []).some(Boolean)
  ).length;

  // Player guiado: "Concluir Exercício" marca todas as séries do
  // exercício atual e avança pro próximo automaticamente. No último,
  // mostra a tela de resumo em vez de avançar.
  const handleCompleteExercise = () => {
    const totalSets = currentExercise?.sets || 1;
    setCompletedSets((prev) => ({ ...prev, [`${currentIdx}`]: Array(totalSets).fill(true) }));

    if (currentIdx < exercises.length - 1) {
      setCurrentIdx((i) => i + 1);
      setTimerRunning(false);
    } else {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
      mirrorEvent("workout_completed", {
        training_id: training.id,
        training_name: liveTraining.training_name,
        duration_seconds: workoutSeconds,
      });
      setShowSummary(true);
    }
  };

  // For link training
  if (liveTraining.training_type === 'link' && liveTraining.html_file_url) {
    window.open(liveTraining.html_file_url, '_blank');
    onBack();
    return null;
  }

  // Tela de resumo final (mirrors "Treino Concluído") — ponte pro RPE
  if (showSummary) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border flex-shrink-0">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <p className="text-sm font-bold uppercase tracking-widest text-foreground">Treino</p>
          <div className="w-8" />
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 space-y-8">
          <div>
            <CheckCircle2 className="w-14 h-14 text-primary mb-4" />
            <h2 className="text-3xl font-black uppercase text-foreground leading-tight">Treino<br/>Concluído</h2>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Resumo</p>
              <p className="text-lg font-bold text-foreground">{liveTraining.training_name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tempo de treino</p>
              <p className="text-lg font-bold text-foreground">{formatTime(workoutSeconds)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Exercícios</p>
              <p className="text-lg font-bold text-foreground">{exercisesRealizados} realizados</p>
            </div>
          </div>

          <button
            onClick={() => toast.info("Compartilhamento em breve")}
            className="flex items-center gap-2 text-sm font-bold text-foreground underline underline-offset-4 w-fit"
          >
            <Share2 className="w-4 h-4" /> Compartilhar treino
          </button>
        </div>

        <div className="px-4 pb-6 pt-3">
          <Button
            onClick={() => setShowPSE(true)}
            className="w-full bg-primary text-primary-foreground font-black uppercase py-6 text-base"
          >
            Finalizar
          </Button>
        </div>

        <PostWorkoutModal
          open={showPSE}
          onClose={() => { setShowPSE(false); onFinish(); }}
          athleteId={athleteId}
          trainingName={liveTraining.training_name}
          recordedSets={buildRecordedSets()}
        />
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
      {isStructured && (
        <div className="px-4 py-2 flex-shrink-0">
          <WearableConnectBox isWorkoutActive={true} />
        </div>
      )}

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
      <div className="flex-1 overflow-auto pb-4">
        {isStructured ? (
          /* Player guiado — um exercício em tela cheia por vez */
          <div className="flex flex-col">
            {/* Mídia grande no topo */}
            <div className="w-full aspect-square max-h-72 bg-white/5 flex items-center justify-center overflow-hidden">
              {currentExercise?.video_url ? (
                <iframe
                  src={currentExercise.video_url}
                  className="w-full h-full border-0"
                  allowFullScreen
                  title={currentExercise.name}
                />
              ) : currentExercise?.gif_url ? (
                <img src={currentExercise.gif_url} alt={currentExercise.name} className="w-full h-full object-contain" />
              ) : (
                <Dumbbell className="w-14 h-14 text-muted-foreground" />
              )}
            </div>

            <div className="px-4 pt-4 space-y-4">
              <div>
                <p className="text-xs text-primary font-bold uppercase tracking-widest">
                  {currentIdx + 1} de {exercises.length}
                </p>
                <h3 className="text-xl font-black text-foreground leading-tight mt-0.5">
                  {currentIdx + 1} - {currentExercise?.name}
                </h3>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {currentExercise?.target_muscles?.map((m: string) => (
                    <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                  ))}
                  {currentExercise?.override_locked && (
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                      🔒 Bloqueado pelo Prof.
                    </Badge>
                  )}
                </div>
              </div>

              {/* Prescrição estilo "Séries 2x - 8-10 Repetições" */}
              <div className="bg-muted/40 rounded-xl p-3 space-y-2 text-center">
                <p className="text-sm font-bold text-foreground">
                  Séries {currentExercise?.sets}x{currentExercise?.reps ? ` - ${currentExercise.reps} Repetições` : ""}
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  {currentExercise?.rest_seconds && <span>⏱ {currentExercise.rest_seconds}s</span>}
                  {currentExercise?.tempo && <span>⏲ {currentExercise.tempo}</span>}
                </div>
              </div>

              {currentExercise?.notes && (
                <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                  📝 {currentExercise.notes}
                </p>
              )}

              {/* Carga Atual */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider text-center mb-2">Carga Atual (kg)</p>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setWeight(Math.max(0, currentWeight - 2.5))}
                    className="w-11 h-11 border border-border rounded-lg flex items-center justify-center">
                    <Minus className="w-4 h-4 text-foreground" />
                  </button>
                  <span className="text-3xl font-black text-foreground w-16 text-center">{currentWeight}</span>
                  <button onClick={() => setWeight(currentWeight + 2.5)}
                    className="w-11 h-11 border border-border rounded-lg flex items-center justify-center">
                    <Plus className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              </div>

              {/* Cronômetro de descanso */}
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider text-center mb-2">Cronômetro</p>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => { setTimerSeconds(timerInitial); setTimerRunning(false); }}
                    className="w-9 h-9 bg-background rounded-full flex items-center justify-center">
                    <RotateCcw className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <span className={`text-3xl font-mono font-black w-24 text-center ${
                    timerSeconds === 0 ? "text-primary animate-pulse" : "text-foreground"
                  }`}>
                    {formatTime(timerSeconds)}
                  </span>
                  <button onClick={() => setTimerRunning(!timerRunning)}
                    className="w-9 h-9 bg-background rounded-full flex items-center justify-center">
                    {timerRunning ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary" />}
                  </button>
                </div>
              </div>

              {/* Navegação mini entre exercícios (opcional, sem quebrar o fluxo linear) */}
              {exercises.length > 1 && (
                <div className="flex gap-1.5 justify-center pt-1">
                  {exercises.map((_: any, idx: number) => (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentIdx ? "w-6 bg-primary" : idx < currentIdx ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : loadingContent || loadingPeriodization ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : htmlContent ? (
          <iframe
            srcDoc={injectMobileViewport(htmlContent)}
            sandbox="allow-scripts allow-popups allow-forms"
            className="w-full h-[60vh] border-0 rounded-lg mx-4"
            title={liveTraining.training_name}
          />
        ) : liveTraining.training_type === 'periodization' && periodizationModel ? (
          <div className="space-y-4 px-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-black text-foreground">{periodizationModel.title}</h3>
              {periodizationModel.description && (
                <p className="text-sm text-muted-foreground mt-1">{periodizationModel.description}</p>
              )}
              <div className="flex gap-2 mt-2">
                {periodizationModel.goal && <Badge variant="secondary">{periodizationModel.goal}</Badge>}
                {periodizationModel.duration && <Badge variant="secondary">{periodizationModel.duration}</Badge>}
              </div>
            </div>

            {Array.isArray(periodizationModel.macrocycle) && periodizationModel.macrocycle.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <CalendarRange className="w-4 h-4" /> Macrociclo
                </p>
                <div className="space-y-2">
                  {periodizationModel.macrocycle.map((phase: string, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="text-sm text-foreground">{phase}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {periodizationModel.graph_data?.volume && periodizationModel.graph_data?.intensity && (
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Volume x Intensidade por fase
                </p>
                <div className="space-y-3">
                  {periodizationModel.graph_data.volume.map((v: number, i: number) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Fase {i + 1}</span>
                        <span>Volume {v}% · Intensidade {periodizationModel.graph_data.intensity[i]}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                        <div className="h-full bg-primary" style={{ width: `${v}%` }} />
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                        <div className="h-full bg-amber-500" style={{ width: `${periodizationModel.graph_data.intensity[i]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(periodizationModel.mesocycle) && periodizationModel.mesocycle.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Estratégia por Mesociclo
                </p>
                <div className="space-y-1">
                  {periodizationModel.mesocycle.flat().map((m: string, i: number) => (
                    <p key={i} className="text-sm text-foreground/85 flex gap-2">
                      <span className="text-primary">•</span> {m}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(periodizationModel.microcycle) && periodizationModel.microcycle.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Padrão Semanal (Microciclo)
                </p>
                <div className="space-y-1">
                  {periodizationModel.microcycle.flat().map((m: string, i: number) => (
                    <p key={i} className="text-sm text-foreground/85 flex gap-2">
                      <span className="text-primary">•</span> {m}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center px-4">
              Este é um plano de periodização (visão do ciclo completo). Fale com seu professor para o treino detalhado do dia.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Nenhum conteúdo disponível</p>
          </div>
        )}
      </div>

      {/* Bottom: só o botão de concluir exercício avança o player guiado */}
      {isStructured && (
        <div className="flex-shrink-0 bg-card border-t border-border px-4 py-3">
          <Button onClick={handleCompleteExercise}
            className="w-full bg-primary text-primary-foreground font-black uppercase py-6 text-base">
            {currentIdx < exercises.length - 1 ? (
              <>Concluir Exercício</>
            ) : (
              <><Zap className="w-5 h-5 mr-2" />Concluir Treino</>
            )}
          </Button>
        </div>
      )}

      {!isStructured && (
        <div className="flex-shrink-0 bg-card border-t border-border px-4 py-3">
          <Button
            onClick={() => {
              if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
              mirrorEvent("workout_completed", {
                training_id: training.id,
                training_name: liveTraining.training_name,
                duration_seconds: workoutSeconds,
              });
              setShowPSE(true);
            }}
            className="w-full bg-primary text-primary-foreground font-black italic uppercase py-6 text-base"
          >
            <Zap className="w-5 h-5 mr-2" />
            Concluir Treino
          </Button>
        </div>
      )}

      <PostWorkoutModal
        open={showPSE}
        onClose={() => { setShowPSE(false); onFinish(); }}
        athleteId={athleteId}
        trainingName={liveTraining.training_name}
        recordedSets={buildRecordedSets()}
      />
    </div>
  );
}
