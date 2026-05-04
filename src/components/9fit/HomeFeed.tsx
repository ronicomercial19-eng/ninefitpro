import { Sun, Sunset, Moon, Coffee, Dumbbell, Bed, Droplet, Trophy, Flame } from "lucide-react";
import { getCurrentContext, type HomeContext } from "@/services/apiService";

interface HomeFeedProps {
  stats: {
    calories: number;
    caloriesGoal: number;
    streak: number;
    completedWorkouts: number;
  };
  hasTraining: boolean;
  onAction?: (action: string) => void;
}

export function HomeFeed({ stats, hasTraining, onAction }: HomeFeedProps) {
  const context: HomeContext = getCurrentContext();

  const handle = (action: string) => onAction?.(action);

  if (context === "manha") {
    return (
      <div className="px-4 mb-6 space-y-3">
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-5 h-5 text-yellow-500" />
            <p className="text-xs uppercase tracking-wider font-bold text-yellow-500">Modo Manhã</p>
          </div>
          <h3 className="text-lg font-black text-foreground mb-2">Pré-treino</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-background/50 rounded p-2 text-center">
              <Coffee className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">Kcal alvo</p>
              <p className="text-sm font-black">{stats.caloriesGoal}</p>
            </div>
            <div className="bg-background/50 rounded p-2 text-center">
              <Droplet className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">Água</p>
              <p className="text-sm font-black">2L</p>
            </div>
            <div className="bg-background/50 rounded p-2 text-center">
              <Bed className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">Sono</p>
              <p className="text-sm font-black">8h</p>
            </div>
          </div>
          <button
            onClick={() => handle("hydrate")}
            className="mt-3 w-full py-2 bg-primary/20 text-primary text-xs font-bold uppercase rounded"
          >
            Registrar hidratação
          </button>
        </div>
      </div>
    );
  }

  if (context === "treino") {
    return (
      <div className="px-4 mb-6">
        <div className="bg-gradient-to-br from-primary/10 to-orange-500/5 border border-primary/30 rounded-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sunset className="w-5 h-5 text-primary" />
            <p className="text-xs uppercase tracking-wider font-bold text-primary">Modo Treino</p>
          </div>
          <h3 className="text-lg font-black text-foreground mb-3">
            {hasTraining ? "Hora de treinar!" : "Recuperação ativa"}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background/50 rounded p-2 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Recuperação</p>
                <p className="text-sm font-bold">Pronto</p>
              </div>
            </div>
            <div className="bg-background/50 rounded p-2 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Streak</p>
                <p className="text-sm font-bold">{stats.streak}d</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // noite
  return (
    <div className="px-4 mb-6">
      <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="w-5 h-5 text-indigo-400" />
          <p className="text-xs uppercase tracking-wider font-bold text-indigo-400">Modo Noite</p>
        </div>
        <h3 className="text-lg font-black text-foreground mb-3">Resumo do dia</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-background/50 rounded p-2 text-center">
            <Dumbbell className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Treinos</p>
            <p className="text-sm font-black">{stats.completedWorkouts}</p>
          </div>
          <div className="bg-background/50 rounded p-2 text-center">
            <Flame className="w-4 h-4 text-orange-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Kcal</p>
            <p className="text-sm font-black">{stats.calories}</p>
          </div>
          <div className="bg-background/50 rounded p-2 text-center">
            <Trophy className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Streak</p>
            <p className="text-sm font-black">{stats.streak}d</p>
          </div>
        </div>
        <button
          onClick={() => handle("prepare_tomorrow")}
          className="mt-3 w-full py-2 bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase rounded"
        >
          Preparar amanhã
        </button>
      </div>
    </div>
  );
}
