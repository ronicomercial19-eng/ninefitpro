import { Flame, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HUDBarProps {
  calories: number;
  caloriesGoal: number;
  streak: number;
}

export function HUDBar({ calories, caloriesGoal, streak }: HUDBarProps) {
  const navigate = useNavigate();
  const caloriesProgress = Math.min((calories / caloriesGoal) * 100, 100);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      {/* Calories Badge */}
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center bg-card glow-soft">
          <Flame className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${caloriesProgress}%` }}
            />
          </div>
          <span className="text-[10px] font-data tabular-nums text-muted-foreground tracking-wider">
            {calories.toLocaleString()}/{caloriesGoal.toLocaleString()}<span className="ml-1 font-display uppercase">kcal</span>
          </span>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Streak Counter */}
        <div className="flex items-center gap-1.5 bg-card rounded-full px-3 py-1.5 border border-border">
          <Flame className={`w-4 h-4 text-orange-500 ${streak >= 7 ? "animate-pulse" : ""}`} />
          <span className="text-xs font-data tabular-nums font-bold text-foreground">{streak}</span>
          <span className="text-[8px] font-display uppercase tracking-widest text-muted-foreground">dias</span>
        </div>

        {/* Settings */}
        <button
          onClick={() => navigate("/9fit/profile")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
