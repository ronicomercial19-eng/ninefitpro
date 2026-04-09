import { 
  ArrowLeft, Play, Clock, Target, Dumbbell, Zap, FileText, Globe, Code2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

interface WorkoutOverviewProps {
  training: TrainingAssignment;
  onBack: () => void;
  onStart: () => void;
}

export function WorkoutOverview({ training, onBack, onStart }: WorkoutOverviewProps) {
  const exercises = training.training_data?.exercises || [];
  const exerciseCount = exercises.length || training.training_data?.exercise_count || 0;
  const duration = training.training_data?.estimated_duration || 45;
  const trainingDays = training.training_data?.training_days || [];

  const getTypeIcon = () => {
    if (training.training_type === 'link') return <Globe className="w-5 h-5 text-green-400" />;
    if (training.training_type === 'html') {
      if (training.training_data?.source === 'html_code_paste') return <Code2 className="w-5 h-5 text-cyan-400" />;
      return <FileText className="w-5 h-5 text-blue-400" />;
    }
    return <Dumbbell className="w-5 h-5 text-primary" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-10 h-10 bg-card border border-border rounded-sm flex items-center justify-center hover:border-primary/50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] text-primary uppercase tracking-widest font-bold">Visão Geral</p>
          <h2 className="text-lg font-black italic uppercase tracking-tight text-foreground truncate">
            {training.training_name}
          </h2>
        </div>
        {getTypeIcon()}
      </div>

      {/* Training Info Card */}
      <div className="bg-gradient-to-br from-card to-muted border border-border rounded-sm p-5">
        {training.training_description && (
          <p className="text-sm text-muted-foreground mb-4">{training.training_description}</p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-background/50 rounded-sm p-3 text-center">
            <Target className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Exercícios</p>
            <p className="text-lg font-black text-foreground">{exerciseCount || "—"}</p>
          </div>
          <div className="bg-background/50 rounded-sm p-3 text-center">
            <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Duração</p>
            <p className="text-lg font-black text-foreground">~{duration}min</p>
          </div>
          <div className="bg-background/50 rounded-sm p-3 text-center">
            <Zap className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">XP</p>
            <p className="text-lg font-black text-foreground">+150</p>
          </div>
        </div>

        {trainingDays.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Dias de treino</p>
            <div className="flex flex-wrap gap-1">
              {trainingDays.map((day: string) => (
                <span key={day} className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-sm capitalize font-bold">{day}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Início: {new Date(training.start_date).toLocaleDateString("pt-BR")}</span>
          {training.end_date && <span>Fim: {new Date(training.end_date).toLocaleDateString("pt-BR")}</span>}
        </div>
      </div>

      {/* Exercise List - Structured workouts */}
      <div className="bg-card border border-border rounded-sm p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          Conteúdo do Treino
        </h3>

        {exercises.length > 0 ? (
          <div className="space-y-2">
            {exercises.map((ex: any, idx: number) => (
              <div key={ex.exercise_id || idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded-sm border border-border/50">
                {ex.gif_url ? (
                  <img src={ex.gif_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{ex.sets}x{ex.reps}</Badge>
                    {ex.rest_seconds && (
                      <span className="text-[10px] text-muted-foreground">{ex.rest_seconds}s desc</span>
                    )}
                    {ex.tempo && (
                      <span className="text-[10px] text-muted-foreground">Tempo: {ex.tempo}</span>
                    )}
                  </div>
                  {ex.target_muscles?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {ex.target_muscles.slice(0, 2).map((m: string) => (
                        <Badge key={m} variant="secondary" className="text-[10px] px-1 py-0">{m}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-bold">#{idx + 1}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {training.training_type === 'link' 
              ? "Este treino será aberto em um link externo."
              : training.training_type === 'html'
                ? "O treino será exibido no visualizador interativo."
                : "Treino estruturado com exercícios detalhados."
            }
          </p>
        )}
      </div>

      {/* Start Button */}
      <Button
        onClick={onStart}
        className="w-full bg-primary text-primary-foreground font-black italic uppercase py-6 text-base hover:bg-primary/90 transition-all"
      >
        <Play className="w-5 h-5 mr-2" />
        Iniciar Treino
      </Button>
    </div>
  );
}
