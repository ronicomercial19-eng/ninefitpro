import { useState } from "react";
import { 
  Dumbbell, Play, Calendar, Zap, 
  Clock, Target, Shield
} from "lucide-react";
import { Slider } from "@/components/ui/slider";

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

interface WorkoutHomeProps {
  trainings: TrainingAssignment[];
  athleteName: string;
  completedCount: number;
  onSelectWorkout: (training: TrainingAssignment) => void;
  onStartQuick: () => void;
}

const supportLevels = [
  { label: "Solo", desc: "Sem assistência", icon: "🔥" },
  { label: "Guiado", desc: "Orientações básicas", icon: "📋" },
  { label: "Assistido", desc: "Apoio completo", icon: "🤝" },
];

/**
 * Redesign Nine Pro v2 (14/09): "número ao vivo grande como hero" — treinos
 * realizados vira o elemento de maior peso visual da tela (protagonista,
 * com glow radial atrás), no lugar de ficar espremido entre outras 2
 * métricas do mesmo tamanho. Só o card de protocolo e o próximo treino
 * recomendado brilham; o resto (nível de suporte, treinos seguintes) fica
 * contido — glow com propósito, não decoração repetida.
 */
export function WorkoutHome({ trainings, athleteName, completedCount, onSelectWorkout, onStartQuick }: WorkoutHomeProps) {
  const [supportLevel, setSupportLevel] = useState([1]);
  const currentSupport = supportLevels[supportLevel[0]];

  const startDate = trainings.length > 0 
    ? new Date(trainings[0].start_date).toLocaleDateString("pt-BR") 
    : "--";

  return (
    <div className="space-y-6">
      {/* Protocol Header — Realizados vira o hero da tela */}
      <div className="journey-card p-5 relative overflow-hidden">
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.25), transparent 70%)" }}
        />
        <div className="relative flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] text-primary uppercase tracking-widest font-bold mb-1">Meu Protocolo</p>
            <h2 className="text-xl font-black italic uppercase tracking-tight text-foreground">
              Smart Training
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Treinador • 9FIT PRO
            </p>
          </div>
          <div className="w-12 h-12 bg-primary/20 rounded-sm flex items-center justify-center shrink-0">
            <Target className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Hero number */}
        <div className="relative text-center py-2 mb-3">
          <p className="font-display leading-none tracking-tight text-foreground" style={{ fontSize: "64px", textShadow: "0 0 40px hsl(var(--primary) / 0.35)" }}>
            {completedCount}
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold mt-1">Treinos realizados</p>
        </div>

        {/* Contexto secundário, contido */}
        <div className="relative flex items-center justify-center gap-6 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs">Início {startDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-xs">{currentSupport.icon} {currentSupport.label}</span>
          </div>
        </div>
      </div>

      {/* Support Level — contido */}
      <div className="neural-node p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Nível de Suporte</p>
        </div>
        <Slider
          value={supportLevel}
          onValueChange={setSupportLevel}
          max={2}
          step={1}
          className="mb-3"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-primary">{currentSupport.label}</span>
          <span className="text-xs text-muted-foreground">{currentSupport.desc}</span>
        </div>
      </div>

      {/* Workout Cards — só o próximo (index 0) brilha */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          Próximos Treinos
        </h3>

        {trainings.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-8 text-center">
            <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum treino atribuído</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trainings.map((training, i) => {
              const exerciseCount = training.training_data?.exercise_count || 0;
              const duration = training.training_data?.estimated_duration || 45;
              const isNext = i === 0;

              return (
                <button
                  key={training.id}
                  onClick={() => onSelectWorkout(training)}
                  className={`w-full p-4 text-left transition-all group ${
                    isNext
                      ? "neural-node border-primary/50"
                      : "neural-node hover:border-primary/50"
                  }`}
                  style={isNext ? { boxShadow: "0 0 24px -8px hsl(var(--primary) / 0.4)" } : undefined}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-sm flex items-center justify-center flex-shrink-0 transition-colors ${
                      isNext ? "bg-primary/20" : "bg-primary/10 group-hover:bg-primary/20"
                    }`}>
                      <Dumbbell className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {training.training_name}
                      </h4>
                      {training.training_description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {training.training_description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {exerciseCount > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Target className="w-3 h-3" /> {exerciseCount} exercícios
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ~{duration}min
                        </span>
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center transition-transform group-hover:scale-105 ${
                      isNext ? "bg-primary" : "border border-border bg-transparent"
                    }`}>
                      <Play className={`w-5 h-5 ${isNext ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* (Botão Treino Rápido já existe no header de Train.tsx — duplicação removida) */}
    </div>
  );
}
