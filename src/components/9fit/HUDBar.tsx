import { Flame, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HUDBarProps {
  level: number;
  xp: number;
  maxXp: number;
  streak: number;
}

export function HUDBar({ level, xp, maxXp, streak }: HUDBarProps) {
  const navigate = useNavigate();
  const xpProgress = (xp / maxXp) * 100;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      {/* Level Badge */}
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-full border-2 border-neon-400/30 flex items-center justify-center bg-dark-800">
          <span className="text-xs font-black text-foreground">LVL {level}</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-24 h-1.5 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-neon-400 rounded-full transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 uppercase">
            {xp}/{maxXp} XP
          </span>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Streak Counter */}
        <div className="flex items-center gap-1.5 bg-dark-800 rounded-full px-3 py-1.5 border border-dark-700">
          <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
          <span className="text-xs font-bold text-foreground">{streak}</span>
        </div>

        {/* Settings */}
        <button
          onClick={() => navigate("/9fit/profile")}
          className="text-gray-500 hover:text-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
