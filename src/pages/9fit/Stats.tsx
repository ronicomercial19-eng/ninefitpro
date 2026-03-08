import { useState, useEffect } from "react";
import { Flame, Dumbbell, Trophy, Calendar, Loader2, Star } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatsData {
  totalCalories: number;
  streak: number;
  totalWorkouts: number;
  totalXP: number;
  level: number;
}

interface WeekDay {
  day: string;
  value: number;
  calories: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export default function NineFitStats() {
  const { athleteId, loading: athleteLoading } = useAthleteId();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({
    totalCalories: 0, streak: 0, totalWorkouts: 0, totalXP: 0, level: 1
  });
  const [weeklyData, setWeeklyData] = useState<WeekDay[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!athleteLoading && athleteId) fetchStats(athleteId);
    else if (!athleteLoading) setLoading(false);
  }, [athleteId, athleteLoading]);

  const fetchStats = async (id: string) => {
    try {
      // Fetch athlete XP/level
      const { data: athlete } = await supabase
        .from("athletes")
        .select("total_xp, level")
        .eq("id", id)
        .single();

      // Fetch workout progress
      const { data: workouts } = await supabase
        .from("workout_progress")
        .select("*")
        .eq("aluno_id", id)
        .order("created_at", { ascending: false });

      const totalWorkouts = workouts?.length || 0;
      const totalCalories = workouts?.reduce((sum, w) => sum + (w.calories_burned || 150), 0) || 0;

      // Calculate streak from workout dates
      let streak = 0;
      if (workouts && workouts.length > 0) {
        const dates = [...new Set(workouts.map(w => 
          format(new Date(w.completed_at || w.created_at), "yyyy-MM-dd")
        ))].sort().reverse();
        
        const today = format(new Date(), "yyyy-MM-dd");
        const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
        
        if (dates[0] === today || dates[0] === yesterday) {
          streak = 1;
          for (let i = 1; i < dates.length; i++) {
            const expected = format(subDays(new Date(dates[0]), i), "yyyy-MM-dd");
            if (dates[i] === expected) streak++;
            else break;
          }
        }
      }

      // Weekly data
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
      const weekly: WeekDay[] = dayLabels.map((day, i) => {
        const date = format(addDays(weekStart, i), "yyyy-MM-dd");
        const dayWorkouts = workouts?.filter(w => 
          format(new Date(w.completed_at || w.created_at), "yyyy-MM-dd") === date
        ) || [];
        const cal = dayWorkouts.reduce((s, w) => s + (w.calories_burned || 150), 0);
        return { day, value: dayWorkouts.length > 0 ? Math.min(100, 60 + dayWorkouts.length * 20) : 0, calories: cal };
      });

      // Achievements
      const achs: Achievement[] = [
        { id: "1", name: "Primeiro Treino", description: "Complete seu primeiro treino", unlocked: totalWorkouts >= 1 },
        { id: "2", name: "Guerreiro da Semana", description: "7 dias de sequência", unlocked: streak >= 7 },
        { id: "3", name: "Dedicado", description: "10 treinos completados", unlocked: totalWorkouts >= 10 },
        { id: "4", name: "Centenário", description: "100 treinos completados", unlocked: totalWorkouts >= 100 },
        { id: "5", name: "Nível 5", description: "Alcance o nível 5", unlocked: (athlete?.level || 1) >= 5 },
      ];

      setStats({
        totalCalories,
        streak,
        totalWorkouts,
        totalXP: athlete?.total_xp || 0,
        level: athlete?.level || 1
      });
      setWeeklyData(weekly);
      setAchievements(achs);
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const xpForNextLevel = stats.level * 500;
  const xpProgress = ((stats.totalXP % 500) / 500) * 100;

  const statCards = [
    { label: "Total Calorias", value: stats.totalCalories.toLocaleString(), icon: Flame, color: "text-orange-500", unit: "kcal" },
    { label: "Sequência", value: String(stats.streak), icon: Calendar, color: "text-primary", unit: "dias" },
    { label: "Treinos", value: String(stats.totalWorkouts), icon: Dumbbell, color: "text-blue-400", unit: "sessões" },
    { label: "XP Total", value: stats.totalXP.toLocaleString(), icon: Star, color: "text-yellow-500", unit: "xp" },
  ];

  if (loading || athleteLoading) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
          Progresso
        </h1>
      </div>

      {/* Level Bar */}
      <div className="px-4 mb-6">
        <div className="bg-card border border-border rounded-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-foreground flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Nível {stats.level}
            </span>
            <span className="text-xs text-muted-foreground">
              {stats.totalXP % 500}/{500} XP
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-primary rounded-full transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-sm p-4 min-w-0">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-black text-foreground truncate">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly Activity */}
      <div className="px-4 mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
          Atividade Semanal
        </h2>
        <div className="bg-card border border-border rounded-sm p-4">
          <div className="flex items-end justify-between h-32 gap-2">
            {weeklyData.map((day) => (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-sm transition-all ${
                      day.value > 0 ? "bg-primary" : "bg-muted"
                    }`}
                    style={{ height: `${Math.max(day.value, 4)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase truncate">
                  {day.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="px-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
          Conquistas
        </h2>
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`flex items-center gap-3 p-4 rounded-sm border transition-colors ${
                achievement.unlocked
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card border-border opacity-60"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                achievement.unlocked ? "bg-primary" : "bg-muted"
              }`}>
                <Trophy className={`w-5 h-5 ${
                  achievement.unlocked ? "text-primary-foreground" : "text-muted-foreground"
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{achievement.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase truncate">
                  {achievement.description}
                </p>
              </div>
              {achievement.unlocked && (
                <span className="text-[10px] text-primary font-bold uppercase flex-shrink-0">
                  ✓
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
