import { Bot, Dumbbell, Play, BarChart2, ShoppingBag, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const apps = [
  { id: "fit360", name: "Fit360", icon: Bot, color: "text-neon-400", path: "/9fit/fit360" },
  { id: "smarttreino", name: "SmartTreino", icon: Dumbbell, color: "text-blue-400", path: "/9fit/smarttreino" },
  { id: "9flix", name: "9FLIX", icon: Play, color: "text-red-500", path: "/9fit/9flix" },
  { id: "progress", name: "9Progress", icon: BarChart2, color: "text-purple-400", path: "/9fit/stats" },
  { id: "store", name: "Store", icon: ShoppingBag, color: "text-foreground", path: "/9fit/store" },
  { id: "premium", name: "Premium", icon: Crown, color: "text-yellow-500", path: "/9fit/premium" },
];

export function AppGrid() {
  const navigate = useNavigate();

  return (
    <div className="px-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
        Ecosystem
      </h2>
      
      <div className="grid grid-cols-3 gap-3">
        {apps.map((app) => (
          <button
            key={app.id}
            onClick={() => navigate(app.path)}
            className="aspect-square bg-dark-800 border border-dark-700 rounded-sm flex flex-col items-center justify-center gap-2 hover:bg-dark-700 hover:border-neon-400/30 transition-all duration-200"
          >
            <app.icon className={`w-8 h-8 ${app.color}`} />
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {app.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
