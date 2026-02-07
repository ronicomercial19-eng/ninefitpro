import { useState } from "react";
import { 
  Droplets, 
  PersonStanding, 
  CheckCircle, 
  Flame,
  Heart,
  Footprints,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RecoveryTask {
  id: string;
  title: string;
  description: string;
  icon: typeof Droplets;
  calories: number;
  completed: boolean;
}

interface RecoveryMissionProps {
  onComplete?: (calories: number) => void;
}

export function RecoveryMission({ onComplete }: RecoveryMissionProps) {
  const [tasks, setTasks] = useState<RecoveryTask[]>([
    {
      id: "hydration",
      title: "Hidratação",
      description: "Beba 500ml de água",
      icon: Droplets,
      calories: 10,
      completed: false
    },
    {
      id: "stretching",
      title: "Alongamento",
      description: "10 min de alongamento leve",
      icon: PersonStanding,
      calories: 30,
      completed: false
    },
    {
      id: "walk",
      title: "Caminhada",
      description: "15 min de caminhada leve",
      icon: Footprints,
      calories: 60,
      completed: false
    }
  ]);

  const totalCalories = tasks.reduce((acc, t) => acc + (t.completed ? t.calories : 0), 0);
  const allCompleted = tasks.every(t => t.completed);

  const handleToggle = (taskId: string) => {
    setTasks(prev => {
      const updated = prev.map(t => 
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      
      // Calculate new total
      const newTotal = updated.reduce((acc, t) => acc + (t.completed ? t.calories : 0), 0);
      onComplete?.(newTotal);
      
      return updated;
    });
  };

  return (
    <div className="bg-gradient-to-br from-card to-muted border border-border rounded-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Dia de Recuperação Ativa</h3>
              <p className="text-xs text-muted-foreground">
                Complete as tarefas para manter o streak
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <Flame className="w-4 h-4" />
            <span className="text-sm font-bold">+{totalCalories} kcal</span>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="p-4 space-y-3">
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
            <button
              key={task.id}
              onClick={() => handleToggle(task.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-sm border transition-all",
                task.completed 
                  ? "bg-primary/10 border-primary" 
                  : "bg-muted/50 border-border hover:border-muted-foreground"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                task.completed ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {task.completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className={cn(
                  "font-medium",
                  task.completed ? "text-primary line-through" : "text-foreground"
                )}>
                  {task.title}
                </p>
                <p className="text-xs text-muted-foreground">{task.description}</p>
              </div>
              <span className={cn(
                "text-xs font-bold",
                task.completed ? "text-primary" : "text-muted-foreground"
              )}>
                +{task.calories} kcal
              </span>
            </button>
          );
        })}
      </div>

      {/* All Complete */}
      {allCompleted && (
        <div className="p-4 bg-primary/10 border-t border-primary/30 flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-primary">
            Recuperação Completa! Streak Mantido 🔥
          </span>
        </div>
      )}
    </div>
  );
}
