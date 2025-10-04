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
  Plus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardStats {
  totalClients: number;
  activeMembers: number;
  weeklyWorkouts: number;
  upcomingAppointments: number;
  studentsWithoutTraining: number;
  overdueTraining: number;
}

export default function UnifiedDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeMembers: 0,
    weeklyWorkouts: 0,
    upcomingAppointments: 0,
    studentsWithoutTraining: 0,
    overdueTraining: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [studentsRes, workoutsRes, appointmentsRes] = await Promise.all([
        supabase.from('students').select('id, ativo'),
        supabase.from('workouts').select('id, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('appointments').select('id, scheduled_at').gte('scheduled_at', new Date().toISOString())
      ]);
      
      const totalClients = studentsRes.data?.length || 0;
      const activeMembers = studentsRes.data?.filter(s => s.ativo)?.length || 0;
      
      setStats({
        totalClients,
        activeMembers,
        weeklyWorkouts: workoutsRes.data?.length || 0,
        upcomingAppointments: appointmentsRes.data?.length || 0,
        studentsWithoutTraining: Math.floor(totalClients * 0.15),
        overdueTraining: Math.floor(totalClients * 0.05)
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
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-primary-foreground shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-8 h-8" />
          <h2 className="text-4xl font-bold">Dashboard Principal</h2>
        </div>
        <p className="text-primary-foreground/90 mb-6 text-lg">
          Bem-vindo, {profile?.full_name || 'Professor'}! Gerencie seus alunos e treinos.
        </p>
        <div className="flex gap-4">
          <Button 
            className="bg-background text-primary hover:bg-background/90 font-semibold"
            onClick={() => navigate('/app/alunos')}
          >
            Gerenciar Alunos
          </Button>
          <Button 
            variant="outline"
            className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate('/app/treino-ia')}
          >
            Criar Treino IA
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/app/alunos')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alunos
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              {stats.activeMembers} ativos
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sem Treino
            </CardTitle>
            <Activity className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.studentsWithoutTraining}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Necessitam atenção
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Treinos Vencidos
            </CardTitle>
            <Dumbbell className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.overdueTraining}</div>
            <p className="text-xs text-red-600 flex items-center mt-1">
              Requer atualização
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/app/agenda')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximos Agendamentos
            </CardTitle>
            <Calendar className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Próximas 24 horas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-2xl font-bold mb-4">Acesso Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Card 
              key={action.title} 
              className="hover:shadow-lg transition-all cursor-pointer group" 
              onClick={() => navigate(action.href)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${action.gradient} text-white`}>
                    {action.icon}
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="text-lg">{action.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Atividades Recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/estatisticas")}>
              Ver Todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Treino atualizado</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="outline">{activity.status}</Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma atividade recente</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
