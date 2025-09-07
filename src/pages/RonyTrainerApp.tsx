
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Dumbbell, 
  TrendingUp, 
  Calendar, 
  Play, 
  User, 
  Settings,
  BarChart3,
  Target,
  Clock,
  Trophy,
  Shield,
  ArrowLeft,
  LogOut
} from "lucide-react";
import { WorkoutGenerator } from "@/components/training/WorkoutGenerator";
import { PeriodizationUpload } from "@/components/training/PeriodizationUpload";
import { TrainerAdminPanel } from "@/components/admin/TrainerAdminPanel";
import { supabase } from "@/integrations/supabase/client";

interface UserStats {
  totalWorkouts: number;
  totalWeight: string;
  activeTime: string;
  monthlyGoal: string;
}

const RonyTrainerApp = () => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("workouts");
  const [isTrainerMode, setIsTrainerMode] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    totalWorkouts: 0,
    totalWeight: "0kg",
    activeTime: "0h",
    monthlyGoal: "0%"
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Redirect non-admin/professor users
  useEffect(() => {
    if (user && profile && !['admin', 'professor'].includes(profile.role)) {
      navigate('/');
    }
  }, [user, profile, navigate]);

  // Fetch stats when user is available
  useEffect(() => {
    if (user) {
      fetchRealUserStats();
    }
  }, [user]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Erro ao obter usuário:', error);
    }
  };

  const fetchRealUserStats = async () => {
    if (!user) return;

    try {
      // Buscar total de treinos gerados
      const { data: workoutsData } = await supabase
        .from('generated_workout_plans')
        .select('id, user_profiles!inner(user_id)')
        .eq('user_profiles.user_id', user.id);

      // Buscar peso total levantado dos registros de força
      const { data: strengthData } = await supabase
        .from('strength_records')
        .select('weight_kg, sets, reps')
        .eq('user_id', user.id);

      // Calcular peso total levantado
      const totalWeight = strengthData?.reduce((total, record) => {
        return total + (record.weight_kg * record.sets * record.reps);
      }, 0) || 0;

      // Estimar tempo ativo baseado no número de treinos (assumindo 1h por treino)
      const totalWorkouts = workoutsData?.length || 0;
      const activeHours = totalWorkouts * 1; // 1 hora por treino

      // Calcular meta mensal baseada na frequência de treinos
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      
      const { data: monthlyWorkouts } = await supabase
        .from('generated_workout_plans')
        .select('id, user_profiles!inner(user_id)')
        .eq('user_profiles.user_id', user.id)
        .gte('generated_at', firstDayOfMonth.toISOString());

      const monthlyWorkoutCount = monthlyWorkouts?.length || 0;
      const expectedMonthlyWorkouts = 12; // Meta de 12 treinos por mês
      const monthlyProgress = Math.min((monthlyWorkoutCount / expectedMonthlyWorkouts) * 100, 100);

      setUserStats({
        totalWorkouts: totalWorkouts,
        totalWeight: totalWeight > 1000 ? `${(totalWeight / 1000).toFixed(1)}t` : `${totalWeight.toFixed(0)}kg`,
        activeTime: `${activeHours}h`,
        monthlyGoal: `${Math.round(monthlyProgress)}%`
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas reais:', error);
    }
  };

  const statsCards = [
    { title: "Treinos Realizados", value: userStats.totalWorkouts.toString(), icon: Dumbbell, color: "text-blue-600" },
    { title: "Peso Levantado", value: userStats.totalWeight, icon: Trophy, color: "text-yellow-600" },
    { title: "Tempo Ativo", value: userStats.activeTime, icon: Clock, color: "text-green-600" },
    { title: "Meta Mensal", value: userStats.monthlyGoal, icon: Target, color: "text-purple-600" }
  ];

  if (isTrainerMode) {
    return <TrainerAdminPanel />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Rony Trainer</h1>
                <p className="text-sm text-gray-300">Seu Coach de Performance</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/10"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao App
              </Button>
              <div className="flex items-center space-x-2">
                <Label htmlFor="trainer-mode" className="text-white text-sm">
                  Modo Professor
                </Label>
                <Switch
                  id="trainer-mode"
                  checked={isTrainerMode}
                  onCheckedChange={setIsTrainerMode}
                />
                <Shield className="w-4 h-4 text-orange-500" />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/10"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!user && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-200 text-center">
              Faça login para ver suas estatísticas reais e gerar treinos personalizados
            </p>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-black/30 border-white/20">
            <TabsTrigger value="workouts" className="text-white data-[state=active]:bg-white/20">
              <Dumbbell className="w-4 h-4 mr-2" />
              Treinos
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white/20">
              <BarChart3 className="w-4 h-4 mr-2" />
              Análises
            </TabsTrigger>
            <TabsTrigger value="periodization" className="text-white data-[state=active]:bg-white/20">
              <Calendar className="w-4 h-4 mr-2" />
              Periodização
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-white/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" className="mt-6">
            <div className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Treino de Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-white">Treino Personalizado</h3>
                        <p className="text-sm text-gray-300">Baseado na sua periodização atual</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400">
                        {user ? 'Disponível' : 'Login necessário'}
                      </Badge>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      disabled={!user}
                    >
                      {user ? 'Iniciar Treino' : 'Faça login para treinar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
                <WorkoutGenerator />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Progressão de Força</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 mx-auto mb-4" />
                     {user ? (
                        <div>
                          <p className="text-white text-lg font-semibold">{userStats.totalWeight}</p>
                          <p>Total levantado</p>
                        </div>
                      ) : (
                        <p>Faça login para ver sua progressão</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Volume de Treino</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <TrendingUp className="w-16 h-16 mx-auto mb-4" />
                      {user ? (
                        <div>
                          <p className="text-white text-lg font-semibold">{userStats.totalWorkouts}</p>
                          <p>Treinos realizados</p>
                        </div>
                      ) : (
                        <p>Faça login para ver seu volume</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="periodization" className="mt-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
              <PeriodizationUpload />
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Desempenho Semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 mx-auto mb-4" />
                      {user ? (
                        <p className="text-white">Dados baseados em seus treinos reais</p>
                      ) : (
                        <p>Faça login para ver seu dashboard personalizado</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Metas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Meta Mensal</span>
                      <span className="text-white font-semibold">{userStats.monthlyGoal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Treinos Feitos</span>
                      <span className="text-white font-semibold">{userStats.totalWorkouts}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Tempo Ativo</span>
                      <span className="text-white font-semibold">{userStats.activeTime}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RonyTrainerApp;
