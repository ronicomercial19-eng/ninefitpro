import { useNavigate } from "react-router-dom";
import { 
  Utensils, 
  Calendar, 
  BarChart2, 
  Crown,
  ChevronRight,
  Flame,
  Clock,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusData {
  dieta: {
    consumed: number;
    goal: number;
  };
  aulas: {
    booked: number;
    nextClass?: string;
    credits: number;
  };
  progresso: {
    lastAssessment?: string;
    daysAgo?: number;
  };
}

interface EcosystemStatusCardsProps {
  data: StatusData;
}

export function EcosystemStatusCards({ data }: EcosystemStatusCardsProps) {
  const navigate = useNavigate();

  const dietaProgress = Math.min((data.dieta.consumed / data.dieta.goal) * 100, 100);
  const needsAssessment = !data.progresso.lastAssessment || (data.progresso.daysAgo && data.progresso.daysAgo > 30);

  return (
    <div className="px-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        Seu Progresso
      </h2>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Dieta Card */}
        <button
          onClick={() => navigate("/9fit/dieta")}
          className="bg-card border border-border rounded-sm p-4 text-left hover:border-primary/50 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Utensils className="w-5 h-5 text-green-400" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h3 className="font-bold text-foreground text-sm mb-1">Dieta</h3>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${dietaProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {data.dieta.consumed}/{data.dieta.goal} kcal
          </p>
        </button>

        {/* Aulas Card */}
        <button
          onClick={() => navigate("/9fit/aulas-creditos")}
          className="bg-card border border-border rounded-sm p-4 text-left hover:border-primary/50 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h3 className="font-bold text-foreground text-sm mb-1">Aulas</h3>
          {data.aulas.booked > 0 ? (
            <>
              <p className="text-lg font-black text-blue-400">{data.aulas.booked} agendadas</p>
              {data.aulas.nextClass && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {data.aulas.nextClass}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {data.aulas.credits} créditos disponíveis
            </p>
          )}
        </button>

        {/* Progresso Card */}
        <button
          onClick={() => window.open("https://nineprogresstracker.lovable.app/", "_blank")}
          className={cn(
            "bg-card border rounded-sm p-4 text-left transition-all group",
            needsAssessment 
              ? "border-primary/50 animate-pulse-slow" 
              : "border-border hover:border-primary/50"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-purple-400" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h3 className="font-bold text-foreground text-sm mb-1">Progresso</h3>
          {data.progresso.lastAssessment ? (
            <p className="text-xs text-muted-foreground">
              Última: {data.progresso.lastAssessment}
              {needsAssessment && (
                <span className="block text-primary font-medium mt-1">
                  ⚠️ Atualizar avaliação
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs text-primary font-medium">
              Faça sua primeira avaliação
            </p>
          )}
        </button>

        {/* Premium Card */}
        <button
          onClick={() => navigate("/9fit/premium")}
          className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-sm p-4 text-left hover:border-yellow-500/50 transition-all group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            <ChevronRight className="w-4 h-4 text-yellow-400/60 group-hover:text-yellow-400 transition-colors" />
          </div>
          <h3 className="font-bold text-foreground text-sm mb-1">Premium</h3>
          <p className="text-xs text-muted-foreground">
            Desbloqueie recursos
          </p>
        </button>
      </div>
    </div>
  );
}
