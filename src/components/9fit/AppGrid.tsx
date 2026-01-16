import { Bot, Dumbbell, Play, BarChart2, ShoppingBag, Crown, UserCheck, Activity, Brain, Calendar, Tv } from "lucide-react";

interface App {
  id: string;
  name: string;
  icon: typeof Bot;
  color: string;
  path?: string;
  externalUrl?: string;
}

const apps: App[] = [
  { id: "fit360", name: "Fit360", icon: Bot, color: "text-primary", path: "/9fit/fit360" },
  { id: "smarttreino", name: "SmartTreino", icon: Dumbbell, color: "text-blue-400", path: "/9fit/smarttreino" },
  { id: "9flix", name: "9FLIX", icon: Play, color: "text-red-500", path: "/9fit/9flix" },
  { id: "progress", name: "9Progresso", icon: BarChart2, color: "text-purple-400", path: "/9fit/stats" },
  { id: "store", name: "Loja", icon: ShoppingBag, color: "text-foreground", path: "/9fit/store" },
  { id: "premium", name: "Premium", icon: Crown, color: "text-yellow-500", path: "/9fit/premium" },
  // Apps Externos do Ecossistema 9FIT
  { id: "postura-pro", name: "Postura Pro", icon: UserCheck, color: "text-emerald-400", externalUrl: "https://postura-pro-analyzer.lovable.app/" },
  { id: "progress-tracker", name: "Avaliação Física", icon: Activity, color: "text-cyan-400", externalUrl: "https://nineprogresstracker.lovable.app/" },
  { id: "smart-reino", name: "Smart Treino IA", icon: Brain, color: "text-violet-400", externalUrl: "https://smartreino.lovable.app/" },
  { id: "periodizer", name: "Consultoria Online", icon: Calendar, color: "text-orange-400", externalUrl: "https://treino-smart-periodizer.lovable.app/" },
  { id: "healthflix", name: "HealthFlix", icon: Tv, color: "text-rose-400", externalUrl: "https://healthflixnine.lovable.app/" },
];

export function AppGrid() {
  const handleAppClick = (app: App) => {
    if (app.externalUrl) {
      window.open(app.externalUrl, '_blank', 'noopener,noreferrer');
    } else if (app.path) {
      window.location.href = app.path;
    }
  };

  return (
    <div className="px-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
        Ecossistema 9FIT
      </h2>
      
      <div className="grid grid-cols-3 gap-3">
        {apps.map((app) => (
          <button
            key={app.id}
            onClick={() => handleAppClick(app)}
            className="aspect-square bg-card border border-border rounded-sm flex flex-col items-center justify-center gap-2 hover:bg-muted hover:border-primary/30 transition-all duration-200 relative"
          >
            {app.externalUrl && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            )}
            <app.icon className={`w-8 h-8 ${app.color}`} />
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground text-center px-1 line-clamp-2">
              {app.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
