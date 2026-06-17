import { useState } from "react";
import { 
  Dumbbell, Play, Calendar, ChevronRight, Zap, 
  Clock, Target, TrendingUp, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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

export function WorkoutHome({ trainings, athleteName, completedCount, onSelectWorkout, onStartQuick }: WorkoutHomeProps) {
  const [supportLevel, setSupportLevel] = useState([1]);
  const currentSupport = supportLevels[supportLevel[0]];

  const startDate = trainings.length > 0 
    ? new Date(trainings[0].start_date).toLocaleDateString("pt-BR") 
    : "--";

  return (
    <div className="space-y-6">
      {/* Protocol Header */}
      <div className="bg-gradient-to-br from-card to-muted border border-border rounded-sm p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] text-primary uppercase tracking-widest font-bold mb-1">Meu Protocolo</p>
            <h2 className="text-xl font-black italic uppercase tracking-tight text-foreground">
              Smart Training
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Treinador • 9FIT PRO
            </p>
          </div>
          <div className="w-12 h-12 bg-primary/20 rounded-sm flex items-center justify-center">
            <Target className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background/50 rounded-sm p-3 text-center">
            <Calendar className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Início</p>
            <p className="text-sm font-bold text-foreground">{startDate}</p>
          </div>
          <div className="bg-background/50 rounded-sm p-3 text-center">
            <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Realizados</p>
            <p className="text-sm font-bold text-foreground">{completedCount}</p>
          </div>
          <div className="bg-background/50 rounded-sm p-3 text-center">
            <Zap className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Nível</p>
            <p className="text-sm font-bold text-foreground">{currentSupport.icon}</p>
          </div>
        </div>
      </div>

      {/* Support Level */}
      <div className="bg-card border border-border rounded-sm p-4">
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

      {/* Workout Cards */}
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

              return (
                <button
                  key={training.id}
                  onClick={() => onSelectWorkout(training)}
                  className="w-full bg-card border border-border rounded-sm p-4 text-left hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-sm flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
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
                    <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Play className="w-5 h-5 text-primary-foreground" />
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
