import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HUDBar } from "@/components/9fit/HUDBar";
import { MissionCard } from "@/components/9fit/MissionCard";
import { AppGrid } from "@/components/9fit/AppGrid";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { EmptyState } from "@/components/9fit/EmptyState";
import { SkeletonCard } from "@/components/9fit/SkeletonCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dumbbell, 
  Calendar, 
  Bell, 
  ChevronRight,
  Flame,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TodayTraining {
  id: string;
  name: string;
  type: string;
  exerciseCount: number;
  estimatedDuration: number;
  html_file_url?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  is_read: boolean;
}

export default function NineFitHub() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [todayTraining, setTodayTraining] = useState<TodayTraining | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mission, setMission] = useState<any>(null);

  // Stats - would come from real data
  const [stats, setStats] = useState({
    calories: 0,
    caloriesGoal: 500,
    streak: 0,
    completedWorkouts: 0
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);

    try {
      // Fetch today's training assignment for this user
      const today = format(new Date(), "yyyy-MM-dd");
      
      // Get athlete profile linked to this user
      const { data: athleteData } = await supabase
        .from("athletes")
        .select("id, name")
        .eq("user_id", user?.id)
        .single();

      if (athleteData) {
        // Fetch training assignments for this athlete
        const { data: trainingData } = await supabase
          .from("student_training_assignments")
          .select("*")
          .eq("student_id", athleteData.id)
          .eq("is_active", true)
          .lte("start_date", today)
          .or(`end_date.is.null,end_date.gte.${today}`)
          .limit(1);

        if (trainingData && trainingData.length > 0) {
          const training = trainingData[0];
          setTodayTraining({
            id: training.id,
            name: training.training_name,
            type: training.training_type || "Treino de Força",
            exerciseCount: 4,
            estimatedDuration: 45,
            html_file_url: training.html_file_url
          });
        }

        // Fetch workout progress for stats
        const { data: progressData } = await supabase
          .from("progresso_aluno")
          .select("*")
          .eq("id_aluno", athleteData.id)
          .order("data_registro", { ascending: false })
          .limit(7);

        if (progressData) {
          setStats(prev => ({
            ...prev,
            completedWorkouts: progressData.length,
            streak: calculateStreak(progressData)
          }));
        }
      }

      // Fetch notifications for this user
      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(3);

      if (notifData) {
        setNotifications(notifData);
      }

      // Generate mission based on training
      setTimeout(() => {
        if (todayTraining) {
          setMission({
            title: `Complete ${todayTraining.name}`,
            description: "Baseado no seu objetivo e nível atual, este treino vai maximizar seus resultados.",
            caloriesReward: 150,
            type: "treino"
          });
        } else {
          setMission({
            title: "Dia de Descanso Ativo",
            description: "Nenhum treino programado. Faça uma caminhada leve ou alongamentos.",
            caloriesReward: 50,
            type: "descanso"
          });
        }
      }, 1000);

    } catch (error) {
      console.error("Error fetching data:", error);
    }

    setIsLoading(false);
  };

  const calculateStreak = (progressData: any[]) => {
    // Simple streak calculation
    return progressData.length;
  };

  const handleStartTraining = () => {
    if (todayTraining?.html_file_url) {
      navigate("/9fit/train");
    } else {
      navigate("/9fit/train");
    }
  };

  const userName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Atleta";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* HUD Bar */}
      <HUDBar
        calories={stats.calories}
        caloriesGoal={stats.caloriesGoal}
        streak={stats.streak}
      />

      {/* Welcome Header */}
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {userName}!
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Today's Training Card */}
      <div className="px-4 mb-6">
        {isLoading ? (
          <SkeletonCard variant="training" />
        ) : todayTraining ? (
          <div className="bg-gradient-to-br from-card to-muted border border-border rounded-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Treino de Hoje
                  </p>
                  <h2 className="text-xl font-black text-foreground">
                    {todayTraining.name}
                  </h2>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-primary" />
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {todayTraining.type} • {todayTraining.exerciseCount} exercícios
              </p>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    ~{todayTraining.estimatedDuration}min
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">
                    ~150 kcal
                  </span>
                </div>
              </div>
              
              <button 
                onClick={handleStartTraining}
                className="w-full btn-neon py-3 rounded-sm flex items-center justify-center gap-2"
              >
                Iniciar Treino
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="Sem treino hoje"
            description="Você não tem treino agendado para hoje. Desfrute de um dia de descanso ou explore novos treinos!"
            actionLabel="Explorar Treinos"
            onAction={() => navigate("/9fit/train")}
          />
        )}
      </div>

      {/* Weekly Progress */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Progresso Semanal
          </h3>
          <button 
            onClick={() => navigate("/9fit/stats")}
            className="text-xs text-primary flex items-center gap-1"
          >
            + {stats.completedWorkouts} TREINOS
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        
        <div className="bg-card border border-border rounded-sm p-4">
          <div className="flex items-end justify-between h-20 gap-2">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day, i) => {
              const value = i < stats.completedWorkouts ? 80 + Math.random() * 20 : Math.random() * 30;
              const isToday = i === new Date().getDay() - 1;
              
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-sm transition-all ${
                        value > 50 ? "bg-primary" : value > 0 ? "bg-primary/40" : "bg-muted"
                      } ${isToday ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                      style={{ height: `${Math.max(value, 5)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] uppercase ${
                    isToday ? "text-primary font-bold" : "text-muted-foreground"
                  }`}>
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="px-4 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">
            Notificações
          </h3>
          <div className="space-y-2">
            {notifications.slice(0, 2).map((notif) => (
              <div 
                key={notif.id}
                className="bg-card border border-primary/30 rounded-sm p-3 flex items-start gap-3"
              >
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {notif.message}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mission Card */}
      <div className="px-4 mb-8">
        <MissionCard
          mission={mission}
          isLoading={isLoading}
          onComplete={() => {
            setStats(prev => ({
              ...prev,
              calories: prev.calories + 150,
              completedWorkouts: prev.completedWorkouts + 1
            }));
          }}
        />
      </div>

      {/* App Grid */}
      <AppGrid />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
