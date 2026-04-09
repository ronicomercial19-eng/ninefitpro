import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, Play, Pause, RotateCcw, Plus, Minus, 
  ChevronRight, ChevronLeft, Timer, Dumbbell, Zap, 
  Loader2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WearableConnectBox } from "./WearableConnectBox";
import { PostWorkoutModal } from "./PostWorkoutModal";

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

export function WorkoutExecution({ training, athleteId, onFinish, onBack }: WorkoutExecutionProps) {
  const exercises = training.training_data?.exercises || [];
  const isStructured = exercises.length > 0;

  // Current exercise index (for structured workouts)
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentExercise = exercises[currentIdx];

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

  // PSE Modal
  const [showPSE, setShowPSE] = useState(false);

  // Video modal
  const [showVideo, setShowVideo] = useState(false);

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

  // Load HTML content for html-type
  useEffect(() => {
    if (!isStructured && training.html_file_url && training.training_type !== 'link') {
      setLoadingContent(true);
      fetch(training.html_file_url)
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
  }, [training]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const currentWeight = weights[currentIdx] ?? 20;
  const setWeight = (v: number) => setWeights(prev => ({ ...prev, [currentIdx]: v }));

  const toggleSet = (exerciseIdx: number, setIdx: number) => {
    const key = `${exerciseIdx}`;
    setCompletedSets(prev => {
      const sets = [...(prev[key] || Array(exercises[exerciseIdx]?.sets || 3).fill(false))];
      sets[setIdx] = !sets[setIdx];
      return { ...prev, [key]: sets };
    });
  };

  const handleFinishWorkout = () => {
    if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    setShowPSE(true);
  };

  // For link training
  if (training.training_type === 'link' && training.html_file_url) {
    window.open(training.html_file_url, '_blank');
    onBack();
    return null;
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
          <p className="text-sm font-bold text-foreground truncate max-w-[200px]">{training.training_name}</p>
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
                {/* Video/Image */}
                {currentExercise.video_url ? (
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
                    {currentExercise.target_muscles?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {currentExercise.target_muscles.map((m: string) => (
                          <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Prescription */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Séries</p>
                      <p className="text-xl font-black text-foreground">{currentExercise.sets}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Reps</p>
                      <p className="text-xl font-black text-foreground">{currentExercise.reps}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Tempo</p>
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
        ) : loadingContent ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : htmlContent ? (
          <iframe
            srcDoc={injectMobileViewport(htmlContent)}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            className="w-full h-[60vh] border-0 rounded-lg"
            title={training.training_name}
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
          <Button onClick={handleFinishWorkout}
            className="w-full bg-primary text-primary-foreground font-black italic uppercase py-6 text-base">
            <Zap className="w-5 h-5 mr-2" />
            Concluir Treino
          </Button>
        </div>
      </div>

      <PostWorkoutModal open={showPSE} onClose={() => { setShowPSE(false); onFinish(); }}
        athleteId={athleteId} trainingName={training.training_name} />
    </div>
  );
}
