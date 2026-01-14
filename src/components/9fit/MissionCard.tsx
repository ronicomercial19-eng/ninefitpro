import { CheckCircle, Flag, Target, Search, Flame } from "lucide-react";
import { useState } from "react";

interface DailyMission {
  title: string;
  description: string;
  caloriesReward: number;
  type: "treino" | "nutrição" | "mentalidade";
}

interface MissionCardProps {
  mission?: DailyMission;
  isLoading?: boolean;
  onComplete?: () => void;
}

export function MissionCard({ mission, isLoading = false, onComplete }: MissionCardProps) {
  const [isCompleted, setIsCompleted] = useState(false);

  const handleComplete = () => {
    setIsCompleted(true);
    onComplete?.();
  };

  if (isLoading) {
    return (
      <div className="card-9fit animate-shimmer">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        </div>
        <p className="text-muted-foreground text-sm mt-4">Decifrando Missão...</p>
      </div>
    );
  }

  if (!mission) return null;

  const typeLabel = {
    treino: "Treino",
    nutrição: "Nutrição",
    mentalidade: "Mentalidade",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-sm border p-6 transition-all duration-300 ${
        isCompleted
          ? "bg-primary/10 border-primary"
          : "bg-card border-border hover:border-foreground/20"
      }`}
    >
      {/* AI Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1 text-primary">
        <Target className="w-3 h-3" />
        <span className="text-[10px] font-bold uppercase">9FIT Inteligência</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="bg-primary text-primary-foreground text-[10px] font-black uppercase px-2 py-1 rounded-sm">
          Missão Diária
        </span>
        <span className="text-muted-foreground text-[10px] uppercase">{typeLabel[mission.type]}</span>
        <span className="text-primary text-xs font-bold ml-auto flex items-center gap-1">
          <Flame className="w-3 h-3" />
          +{mission.caloriesReward} kcal
        </span>
      </div>

      {/* Content */}
      <h3 className="text-2xl font-black italic tracking-tighter uppercase text-foreground mb-2">
        {mission.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {mission.description}
      </p>

      {/* Source */}
      <div className="flex items-center gap-1 text-muted-foreground text-xs mb-4">
        <Search className="w-3 h-3" />
        <span>Fonte Verificada</span>
      </div>

      {/* Action */}
      {isCompleted ? (
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-bold uppercase">Missão Cumprida</span>
        </div>
      ) : (
        <button
          onClick={handleComplete}
          className="flex items-center gap-2 text-foreground border-b border-foreground hover:text-primary hover:border-primary transition-colors"
        >
          <Flag className="w-4 h-4" />
          <span className="text-sm font-bold uppercase">Marcar Completa</span>
        </button>
      )}

      {/* Glow effect when completed */}
      {isCompleted && (
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      )}
    </div>
  );
}
