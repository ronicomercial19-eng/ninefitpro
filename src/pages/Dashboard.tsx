import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Dumbbell, 
  TrendingUp, 
  Calendar,
  BarChart3,
  BookOpen,
  ArrowRight,
  Activity,
  Target,
  Zap,
  Clock,
  CheckCircle,
  Plus,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { MetricsDisplay } from "@/components/analytics/MetricsDisplay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface DashboardStats {
  totalClients: number;
  activeMembers: number;
  weeklyWorkouts: number;
  upcomingAppointments: number;
  studentsWithoutTraining: number;
  overdueTraining: number;
  expiringPlans: { id: string; name: string; email: string | null; data_fim_plano: string }[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeMembers: 0,
    weeklyWorkouts: 0,
    upcomingAppointments: 0,
    studentsWithoutTraining: 0,
    overdueTraining: 0,
    expiringPlans: []
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all data in parallel
      const [athletesRes, workoutsRes, appointmentsRes, activeAssignmentsRes, expiredAssignmentsRes] = await Promise.all([
        supabase.from('athletes').select('id, activated').eq('coach_id', currentUser.id),
        supabase.from('workouts').select('id, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('appointments').select('id, scheduled_at').gte('scheduled_at', new Date().toISOString()),
        supabase.from('student_training_assignments').select('student_id').eq('is_active', true),
        supabase.from('student_training_assignments').select('student_id').eq('is_active', true).lt('end_date', today)
      ]);
      
      const allAthletes = athletesRes.data || [];
      const totalClients = allAthletes.length;
      const activeMembers = allAthletes.filter(s => s.activated)?.length || 0;

      // Real: athletes without any active training assignment
      const trainingIds = new Set((activeAssignmentsRes.data || []).map(t => t.student_id));
      const studentsWithoutTraining = allAthletes.filter(a => a.activated && !trainingIds.has(a.id)).length;

      // Real: athletes with expired training assignments
      const expiredIds = new Set((expiredAssignmentsRes.data || []).map(t => t.student_id));
      const overdueTraining = expiredIds.size;

      // Fetch expiring assignments (end_date in next 7 days)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const { data: expiringAssignments } = await supabase
        .from('student_training_assignments')
        .select('id, student_id, training_name, end_date')
        .eq('is_active', true)
        .gte('end_date', today)
        .lte('end_date', futureDate.toISOString().split('T')[0]);

      // Fetch athlete names for expiring
      const expiringStudentIds = [...new Set((expiringAssignments || []).map(a => a.student_id))];
      let expiringPlans: { id: string; name: string; email: string | null; data_fim_plano: string }[] = [];
      
      if (expiringStudentIds.length > 0) {
        const { data: athleteNames } = await supabase
          .from('athletes')
          .select('id, name, email')
          .in('id', expiringStudentIds);
        
        const nameMap = new Map((athleteNames || []).map(a => [a.id, a]));
        expiringPlans = (expiringAssignments || []).map(a => ({
          id: a.id,
          name: nameMap.get(a.student_id)?.name || a.training_name,
          email: nameMap.get(a.student_id)?.email || null,
          data_fim_plano: a.end_date || ''
        }));
      }
      
      setStats({
        totalClients,
        activeMembers,
        weeklyWorkouts: workoutsRes.data?.length || 0,
        upcomingAppointments: appointmentsRes.data?.length || 0,
        studentsWithoutTraining,
        overdueTraining,
        expiringPlans
      });

      if (workoutsRes.data) {
        setRecentActivities(workoutsRes.data.slice(0, 4));
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "Alunos",
      description: "Gerencie seus alunos",
      icon: <Users className="w-6 h-6" />,
      href: "/app/alunos",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Exercícios",
      description: "Biblioteca de exercícios",
      icon: <Target className="w-6 h-6" />,
      href: "/app/exercicios",
      gradient: "from-red-500 to-orange-500" 
    },
    {
      title: "Agenda",
      description: "Gerencie agendamentos",
      icon: <Calendar className="w-6 h-6" />,
      href: "/app/agenda",
      gradient: "from-indigo-500 to-blue-500" 
    },
    {
      title: "Treino IA",
      description: "Gere treinos com IA",
      icon: <Dumbbell className="w-6 h-6" />,
      href: "/app/treino-ia",
      gradient: "from-[#FF8426] to-[#F04E23]"
    },
    {
      title: "Estatísticas",
      description: "Análises e relatórios",
      icon: <BarChart3 className="w-6 h-6" />,
      href: "/app/estatisticas",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Relatórios",
      description: "Relatórios detalhados",
      icon: <BookOpen className="w-6 h-6" />,
      href: "/app/relatorios",
      gradient: "from-blue-500 to-cyan-500"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="xl" label="Carregando dashboard..." />
      </div>
    );
  }

  return (
    <>
      <OnboardingTour />
      
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Hero Section - Improved Hierarchy */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-2 animate-in slide-in-from-top duration-500">
            <Zap className="w-8 h-8 animate-pulse-soft" />
            <h2 className="text-4xl font-bold">Dashboard Principal</h2>
          </div>
          <p className="text-primary-foreground/90 mb-6 text-lg animate-in slide-in-from-bottom duration-500 delay-100">
            Bem-vindo, {profile?.full_name || 'Professor'}! Gerencie seus alunos e treinos.
          </p>
          <div className="flex gap-4 animate-in slide-in-from-bottom duration-500 delay-200">
            <Button 
              className="bg-background text-primary hover:bg-background/90 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
              onClick={() => navigate('/app/alunos')}
            >
              Gerenciar Alunos
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button 
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 transition-all duration-300 hover:scale-105"
              onClick={() => navigate('/app/treino-ia')}
            >
              <Zap className="mr-2 w-4 h-4" />
              Criar Treino IA
            </Button>
          </div>
        </div>

        {/* Metrics Display */}
        <div className="animate-in slide-in-from-bottom duration-500 delay-300">
          <MetricsDisplay showDetailedMetrics={false} />
        </div>

      {/* Stats Grid - Enhanced Visual Hierarchy */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom duration-500 delay-400">
        <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group border-l-4 border-l-primary" onClick={() => navigate('/app/alunos')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alunos
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Users className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold group-hover:text-primary transition-colors">{stats.totalClients}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              {stats.activeMembers} ativos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 group border-l-4 border-l-orange-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sem Treino
            </CardTitle>
            <div className="p-2 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors">
              <Activity className="w-4 h-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold group-hover:text-orange-600 transition-colors">{stats.studentsWithoutTraining}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Necessitam atenção
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 group border-l-4 border-l-red-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Treinos Vencidos
            </CardTitle>
            <div className="p-2 rounded-lg bg-red-50 group-hover:bg-red-100 transition-colors">
              <Dumbbell className="w-4 h-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold group-hover:text-red-600 transition-colors">{stats.overdueTraining}</div>
            <p className="text-xs text-red-600 flex items-center mt-1">
              Requer atualização
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group border-l-4 border-l-purple-600" onClick={() => navigate('/app/agenda')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximos Agendamentos
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors">
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold group-hover:text-purple-600 transition-colors">{stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Próximas 24 horas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Plans Alert */}
      {stats.expiringPlans.length > 0 && (
        <Card className="animate-in slide-in-from-bottom duration-500 delay-450 border-l-4 border-l-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-5 h-5" />
              Vencimentos Próximos ({stats.expiringPlans.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.expiringPlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.email}</p>
                  </div>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Vence {new Date(plan.data_fim_plano).toLocaleDateString('pt-BR')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions - Enhanced Micro-interactions */}
      <div className="animate-in slide-in-from-bottom duration-500 delay-500">
        <h3 className="text-2xl font-bold mb-4">Acesso Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Card 
              key={action.title} 
              className="hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group overflow-hidden relative"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate(action.href)}
            >
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <CardHeader className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${action.gradient} text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                    {action.icon}
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all duration-300" />
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {action.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activities - Enhanced Visual Feedback */}
      <Card className="animate-in slide-in-from-bottom duration-500 delay-600 hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Atividades Recentes
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/app/estatisticas")}
              className="hover:bg-primary/10 hover:text-primary transition-all"
            >
              Ver Todas
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted hover:shadow-md transition-all duration-300 cursor-pointer group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse-soft"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">
                      Treino atualizado
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge 
                    variant="outline"
                    className="group-hover:border-primary group-hover:text-primary transition-colors"
                  >
                    {activity.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma atividade recente</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
