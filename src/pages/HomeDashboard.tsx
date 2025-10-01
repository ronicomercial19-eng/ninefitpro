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
  Award,
  Zap,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navigation9Fit } from "@/components/shared/Navigation9Fit";

interface DashboardStats {
  totalClients: number;
  activeMembers: number;
  weeklyWorkouts: number;
  upcomingAppointments: number;
}

interface RecentActivity {
  id: number;
  type: string;
  message: string;
  time: string;
}

export default function HomeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 1234,
    activeMembers: 567,
    weeklyWorkouts: 2845,
    upcomingAppointments: 43
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([
    { id: 1, type: 'session', message: 'João completou sessão de HIIT Cardio', time: '2 min atrás' },
    { id: 2, type: 'plan', message: 'Novo plano de força criado para Maria', time: '15 min atrás' },
    { id: 3, type: 'record', message: 'Pedro bateu record pessoal em agachamento', time: '1 hora atrás' }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const studentsData = await supabase.from('estudantes').select('id');
      const plansData = await supabase.from('modelos_de_treino').select('id');
      const workoutsData = await supabase.from('workouts').select('id');
      
      setStats({
        totalClients: studentsData.data?.length || 1234,
        activeMembers: studentsData.data?.length || 567,
        weeklyWorkouts: workoutsData.data?.length || 2845,
        upcomingAppointments: 43
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "Descobrir",
      description: "Explore novos conteúdos e exercícios",
      icon: <BookOpen className="w-6 h-6" />,
      href: "/descobrir",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Lista de Alunos", 
      description: "Gerencie seus alunos",
      icon: <Users className="w-6 h-6" />,
      href: "/lista-de-alunos",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Painel Geral",
      description: "Visão macro do sistema",
      icon: <BarChart3 className="w-6 h-6" />,
      href: "/painel-geral",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Painel de Treino",
      description: "Gerencie cronograma de treinos",
      icon: <Dumbbell className="w-6 h-6" />,
      href: "/painel-de-treino", 
      gradient: "from-[#FF8426] to-[#F04E23]"
    },
    {
      title: "Biblioteca de Exercícios",
      description: "Acesse exercícios e programas",
      icon: <Target className="w-6 h-6" />,
      href: "/biblioteca-de-exercicios",
      gradient: "from-red-500 to-orange-500" 
    },
    {
      title: "Calendário",
      description: "Gerencie agendamentos e eventos",
      icon: <Calendar className="w-6 h-6" />,
      href: "/calendario",
      gradient: "from-indigo-500 to-blue-500" 
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#F8FAFB] to-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#FF8426]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFB] to-white">
      <Navigation9Fit />

      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-8 bg-gradient-to-r from-[#FF8426] to-[#F04E23] rounded-2xl p-8 text-white shadow-9fit">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8" />
            <h2 className="text-4xl font-bold">Bem-vindo ao 9FIT</h2>
          </div>
          <p className="text-white/90 mb-6 text-lg">Seu hub completo de fitness e gerenciamento de treinos</p>
          <div className="flex gap-4">
            <Button 
              className="bg-white text-[#FF8426] hover:bg-gray-100 font-semibold"
              onClick={() => navigate('/descobrir')}
            >
              Explorar Recursos
            </Button>
            <Button 
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={() => navigate('/lista-de-alunos')}
            >
              Ver Alunos
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-none shadow-card hover:shadow-9fit transition-all cursor-pointer" onClick={() => navigate('/lista-de-alunos')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Clientes
              </CardTitle>
              <Users className="w-4 h-4 text-[#FF8426]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#282E3A]">{stats.totalClients.toLocaleString()}</div>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12% este mês
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-card hover:shadow-9fit transition-all cursor-pointer" onClick={() => navigate('/painel-geral')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Associações Ativas
              </CardTitle>
              <Activity className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#282E3A]">{stats.activeMembers.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">
                89% de taxa de retenção
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-card hover:shadow-9fit transition-all cursor-pointer" onClick={() => navigate('/painel-de-treino')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Treinos Esta Semana
              </CardTitle>
              <Dumbbell className="w-4 h-4 text-[#FF8426]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#282E3A]">{stats.weeklyWorkouts.toLocaleString()}</div>
              <p className="text-xs text-blue-600 flex items-center mt-1">
                <Target className="w-3 h-3 mr-1" />
                94% da meta semanal
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-card hover:shadow-9fit transition-all cursor-pointer" onClick={() => navigate('/calendario')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Próximos Agendamentos
              </CardTitle>
              <Calendar className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#282E3A]">{stats.upcomingAppointments}</div>
              <p className="text-xs text-gray-500 mt-1">
                Próximas 24 horas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-[#282E3A] mb-4">Acesso Rápido</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <Card 
                key={action.title} 
                className="border-none shadow-card hover:shadow-9fit transition-all cursor-pointer group overflow-hidden" 
                onClick={() => navigate(action.href)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${action.gradient} text-white`}>
                      {action.icon}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#FF8426] group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-lg text-[#282E3A]">{action.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activities & Calendar Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <Card className="border-none shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#282E3A]">Atividades Recentes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/estatisticas")} className="text-[#FF8426] hover:text-[#F04E23]">
                  Ver Todas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-2 h-2 bg-[#FF8426] rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#282E3A]">{activity.message}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.time}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-white">{activity.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Calendar Preview */}
          <Card className="border-none shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#282E3A]">Próximos Eventos</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/calendario")} className="text-[#FF8426] hover:text-[#F04E23]">
                  <Calendar className="w-4 h-4 mr-2" />
                  Ver Calendário
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#282E3A]">Aula de Pilates - Turma A</p>
                    <p className="text-xs text-gray-500">Hoje, 14:00</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#282E3A]">Avaliação física - João Silva</p>
                    <p className="text-xs text-gray-500">Amanhã, 09:30</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#282E3A]">Reunião de equipe</p>
                    <p className="text-xs text-gray-500">Sexta, 16:00</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
