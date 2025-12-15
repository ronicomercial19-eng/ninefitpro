import { CheckCircle, Flag, Sparkles, Target, Search } from "lucide-react";
import { useState } from "react";

interface DailyMission {
  title: string;
  description: string;
  xpReward: number;
  type: "workout" | "nutrition" | "mindset";
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
            <div className="h-4 w-20 bg-dark-700 rounded animate-pulse" />
            <div className="h-4 w-16 bg-dark-700 rounded animate-pulse" />
          </div>
          <div className="h-8 w-3/4 bg-dark-700 rounded animate-pulse" />
          <div className="h-4 w-full bg-dark-700 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-dark-700 rounded animate-pulse" />
        </div>
        <p className="text-gray-600 text-sm mt-4">Decrypting Mission...</p>
      </div>
    );
  }

  if (!mission) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-sm border p-6 transition-all duration-300 ${
        isCompleted
          ? "bg-neon-400/10 border-neon-400"
          : "bg-card border-dark-700 hover:border-foreground/20"
      }`}
    >
      {/* AI Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1 text-neon-400">
        <Target className="w-3 h-3" />
        <span className="text-[10px] font-bold uppercase">9FIT Intelligence</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="bg-neon-400 text-primary-foreground text-[10px] font-black uppercase px-2 py-1 rounded-sm">
          Daily Mission
        </span>
        <span className="text-gray-500 text-[10px] uppercase">{mission.type}</span>
        <span className="text-neon-400 text-xs font-bold ml-auto">
          +{mission.xpReward} XP
        </span>
      </div>

      {/* Content */}
      <h3 className="text-2xl font-black italic tracking-tighter uppercase text-foreground mb-2">
        {mission.title}
      </h3>
      <p className="text-sm text-gray-400 leading-relaxed mb-4">
        {mission.description}
      </p>

      {/* Source */}
      <div className="flex items-center gap-1 text-gray-500 text-xs mb-4">
        <Search className="w-3 h-3" />
        <span>Verified Source</span>
      </div>

      {/* Action */}
      {isCompleted ? (
        <div className="flex items-center gap-2 text-neon-400">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-bold uppercase">Mission Accomplished</span>
        </div>
      ) : (
        <button
          onClick={handleComplete}
          className="flex items-center gap-2 text-foreground border-b border-foreground hover:text-neon-400 hover:border-neon-400 transition-colors"
        >
          <Flag className="w-4 h-4" />
          <span className="text-sm font-bold uppercase">Mark Complete</span>
        </button>
      )}

      {/* Glow effect when completed */}
      {isCompleted && (
        <div className="absolute inset-0 bg-neon-400/5 pointer-events-none" />
      )}
    </div>
  );
}
