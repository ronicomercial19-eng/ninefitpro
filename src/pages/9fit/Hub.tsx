import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { HUDBar } from "@/components/9fit/HUDBar";
import { MissionCard } from "@/components/9fit/MissionCard";
import { EcosystemStatusCards } from "@/components/9fit/EcosystemStatusCards";
import { RecoveryMission } from "@/components/9fit/RecoveryMission";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { SkeletonCard } from "@/components/9fit/SkeletonCard";
import { WeeklyProgressChart } from "@/components/9fit/WeeklyProgressChart";
import { QuickCheckIn } from "@/components/9fit/QuickCheckIn";
import { HomeFeed } from "@/components/9fit/HomeFeed";
import { FeatureOnboarding } from "@/components/onboarding/FeatureOnboarding";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dumbbell, Bell, ChevronRight, Flame, Clock, Play, Trophy, Star, Users
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
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

interface SocialAchievement {
  id: string;
  name: string;
  level: number;
  total_xp: number;
  type: "level_up" | "workout";
  message: string;
}

export default function NineFitHub() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { athleteId, athleteName, loading: athleteLoading } = useAthleteId();
  
  const [isLoading, setIsLoading] = useState(true);
  const [todayTraining, setTodayTraining] = useState<TodayTraining | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socialFeed, setSocialFeed] = useState<SocialAchievement[]>([]);

  const [stats, setStats] = useState({
    calories: 0,
    caloriesGoal: 2500,
    streak: 0,
    completedWorkouts: 0
  });

  const [ecosystemData, setEcosystemData] = useState({
    dieta: { consumed: 0, goal: 2500 },
    aulas: { booked: 0, credits: 10 },
    progresso: { lastAssessment: undefined as string | undefined, daysAgo: undefined as number | undefined }
  });

  useEffect(() => {
    if (!athleteLoading) {
      if (athleteId) {
        fetchData(athleteId);
      } else {
        setIsLoading(false);
      }
    }
  }, [athleteId, athleteLoading, user]);

  const fetchData = async (athleteId: string) => {
    setIsLoading(true);

    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Fetch training assignments
      const { data: trainingData } = await supabase
        .from("student_training_assignments")
        .select("*")
        .eq("student_id", athleteId)
        .eq("is_active", true)
        .lte("start_date", today)
        .order("created_at", { ascending: false })
        .limit(1);

      if (trainingData && trainingData.length > 0) {
        const training = trainingData[0];
        const endDateValid = !training.end_date || training.end_date >= today;
        if (endDateValid) {
          const trainingDays = (training as any).training_data?.training_days as string[] | undefined;
          const exerciseCount = (training as any).training_data?.exercise_count || trainingDays?.length || 0;
          const estimatedDuration = (training as any).training_data?.estimated_duration || 0;
          setTodayTraining({
            id: training.id,
            name: training.training_name,
            type: training.training_type || "Treino",
            exerciseCount,
            estimatedDuration,
            html_file_url: training.html_file_url
          });
        }
      }

      // Fetch bookings + credits + assessment in parallel
      const [bookingsRes, creditsRes, assessmentRes, progressRes, socialRes] = await Promise.all([
        supabase.from("class_bookings").select("id").eq("user_id", user?.id).eq("status", "confirmed"),
        supabase.from("student_credits").select("total_credits, used_credits").eq("student_id", athleteId).maybeSingle(),
        supabase.from("avaliacoes_unificadas").select("data_avaliacao").eq("aluno_id", athleteId).order("data_avaliacao", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("workout_progress").select("*").eq("aluno_id", athleteId).order("completed_at", { ascending: false }).limit(30),
        supabase.from("athletes").select("id, name, total_xp, level").gt("total_xp", 0).order("total_xp", { ascending: false }).limit(10),
      ]);

      const availableCredits = (creditsRes.data?.total_credits || 0) - (creditsRes.data?.used_credits || 0);

      let daysAgo: number | undefined;
      if (assessmentRes.data?.data_avaliacao) {
        const diffTime = Math.abs(new Date().getTime() - new Date(assessmentRes.data.data_avaliacao).getTime());
        daysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      setEcosystemData({
        dieta: { consumed: stats.calories, goal: stats.caloriesGoal },
        aulas: { booked: bookingsRes.data?.length || 0, credits: availableCredits },
        progresso: { 
          lastAssessment: assessmentRes.data?.data_avaliacao ? format(new Date(assessmentRes.data.data_avaliacao), "dd/MM/yy") : undefined,
          daysAgo
        }
      });

      if (progressRes.data) {
        const totalCalories = progressRes.data.reduce((sum, p) => sum + ((p as any).calories_burned || 0), 0);
        const uniqueDates = new Set(progressRes.data.map(p => (p as any).date));
        let streak = 0;
        const sortedDates = [...uniqueDates].sort().reverse();
        const todayStr = format(new Date(), "yyyy-MM-dd");
        for (let i = 0; i < sortedDates.length; i++) {
          const expectedDate = format(addDays(new Date(), -i), "yyyy-MM-dd");
          if (i === 0 && sortedDates[0] !== todayStr && sortedDates[0] !== format(addDays(new Date(), -1), "yyyy-MM-dd")) break;
          if (sortedDates[i] === expectedDate || (i === 0 && sortedDates[0] === format(addDays(new Date(), -1), "yyyy-MM-dd"))) {
            streak++;
          } else break;
        }
        setStats(prev => ({ ...prev, calories: totalCalories, completedWorkouts: uniqueDates.size, streak }));
      }

      // Social feed
      if (socialRes.data) {
        const feed: SocialAchievement[] = socialRes.data.map((a) => ({
          id: a.id,
          name: a.name.split(" ")[0],
          level: a.level || 1,
          total_xp: a.total_xp || 0,
          type: (a.level || 1) >= 5 ? "level_up" as const : "workout" as const,
          message: (a.level || 1) >= 5 ? `Atingiu Nível ${a.level}! 🔥` : `Acumulou ${a.total_xp} XP`,
        }));
        setSocialFeed(feed);
      }

      // Notifications
      if (user?.id) {
        const { data: notifData } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(3);
        if (notifData) setNotifications(notifData);
      }

    } catch (error) {
      console.error("[Hub] Error fetching data:", error);
    }

    setIsLoading(false);
  };

  const handleStartTraining = () => navigate("/9fit/train");
  const handleRecoveryComplete = (calories: number) => {
    setStats(prev => ({ ...prev, calories: prev.calories + calories }));
  };

  const userName = athleteName?.split(" ")[0] || profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Atleta";

  const getSocialIcon = (type: string) => {
    switch (type) {
      case "level_up": return <Star className="w-4 h-4 text-yellow-500" />;
      default: return <Dumbbell className="w-4 h-4 text-primary" />;
    }
  };

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const getGreeting = () => {
    if (hour < 12) return { text: "Bom dia", subtitle: "Hora de treinar! Energia máxima pela manhã 💪", tip: "Hidrate-se bem antes do treino" };
    if (hour < 18) return { text: "Boa tarde", subtitle: "Mantenha o foco! Verifique suas aulas agendadas 🏋️", tip: "Lembre-se de se hidratar" };
    return { text: "Boa noite", subtitle: "Hora de recuperar! Descanse bem para amanhã 🌙", tip: "Boa recuperação = melhor performance" };
  };
  const greeting = getGreeting();

  // Check if user needs habit recovery (>2 days without training)
  const needsRecovery = stats.streak === 0 && stats.completedWorkouts > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <HUDBar calories={stats.calories} caloriesGoal={stats.caloriesGoal} streak={stats.streak} />

      {/* Welcome - Dynamic */}
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground">{greeting.text}, {userName}!</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
        <p className="text-xs text-primary mt-1">{greeting.tip}</p>
      </div>

      {/* Habit Recovery Card */}
      {needsRecovery && (
        <div className="px-4 mb-4">
          <div className="bg-primary/10 border border-primary/30 rounded-sm p-4 flex items-center gap-3">
            <Flame className="w-6 h-6 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Recuperação de Hábito</p>
              <p className="text-xs text-muted-foreground">Faz alguns dias! Que tal um treino rápido?</p>
            </div>
            <button onClick={handleStartTraining} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-sm">
              IR
            </button>
          </div>
        </div>
      )}

      {/* Today's Training */}
      <div className="px-4 mb-6">
        {isLoading ? (
          <SkeletonCard variant="training" />
        ) : todayTraining ? (
          <button
            onClick={handleStartTraining}
            className="w-full bg-gradient-to-br from-card to-muted border border-border rounded-sm overflow-hidden text-left hover:border-primary/50 transition-all group"
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Treino de Hoje</p>
                  <h2 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">{todayTraining.name}</h2>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <Play className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {todayTraining.type}{todayTraining.exerciseCount > 0 ? ` • ${todayTraining.exerciseCount} exercícios` : ''}
              </p>
              <div className="flex items-center gap-4 mb-4">
                {todayTraining.estimatedDuration > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">~{todayTraining.estimatedDuration}min</span>
                  </div>
                )}
                {stats.calories > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">{stats.calories.toLocaleString()} kcal</span>
                  </div>
                )}
              </div>
              <div className="w-full btn-neon py-3 rounded-sm flex items-center justify-center gap-2">
                Iniciar Treino
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </button>
        ) : (
          <RecoveryMission onComplete={handleRecoveryComplete} />
        )}
      </div>

      {/* Dynamic Home Feed (contextual: manhã/treino/noite) */}
      <HomeFeed stats={stats} hasTraining={!!todayTraining} />

      {/* Quick Check-in */}
      <div className="px-4 mb-4">
        <QuickCheckIn />
      </div>

      {/* Ecosystem Status Cards */}
      <div className="mb-6">
        <EcosystemStatusCards data={ecosystemData} />
      </div>

      {/* Weekly Progress */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Progresso Semanal</h3>
          <button onClick={() => navigate("/9fit/stats")} className="text-xs text-primary flex items-center gap-1">
            + {stats.completedWorkouts} TREINOS
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <WeeklyProgressChart athleteId={athleteId} />
      </div>

      {/* Social Feed - Gym Rats style */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Comunidade
          </h3>
          <button onClick={() => navigate("/9fit/social")} className="text-xs text-primary flex items-center gap-1">
            Ver tudo
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {isLoading ? (
          <SkeletonCard />
        ) : socialFeed.length === 0 ? (
          <div className="bg-card border border-border rounded-sm p-6 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Complete treinos para aparecer na comunidade!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {socialFeed.slice(0, 5).map((a, i) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 p-3 rounded-sm border transition-all ${
                  i < 3 ? "bg-primary/5 border-primary/20" : "bg-card border-border"
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                  i === 0 ? "bg-yellow-500 text-yellow-950" :
                  i === 1 ? "bg-gray-300 text-gray-800" :
                  i === 2 ? "bg-orange-400 text-orange-950" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">{a.message}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {getSocialIcon(a.type)}
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-primary">Lv.{a.level}</p>
                    <p className="text-[9px] text-muted-foreground">{a.total_xp} XP</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="px-4 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">Notificações</h3>
          <div className="space-y-2">
            {notifications.slice(0, 2).map((notif) => (
              <div key={notif.id} className="bg-card border border-primary/30 rounded-sm p-3 flex items-start gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{notif.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
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
          mission={todayTraining ? {
            title: `Complete ${todayTraining.name}`,
            description: "Baseado no seu objetivo e nível atual, este treino vai maximizar seus resultados.",
            caloriesReward: 150,
            type: "treino"
          } : {
            title: "Dia de Recuperação",
            description: "Complete as tarefas de recuperação ativa para manter seu streak!",
            caloriesReward: 100,
            type: "mentalidade"
          }}
          isLoading={isLoading}
          onComplete={() => {
            setStats(prev => ({ ...prev, calories: prev.calories + 150, completedWorkouts: prev.completedWorkouts + 1 }));
          }}
        />
      </div>

      <FeatureOnboarding featureKey="hub" />
      <BottomNavigation />
    </div>
  );
}
