import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  Dumbbell, 
  TrendingUp, 
  Calendar,
  BarChart3,
  BookOpen,
  Settings,
  ArrowRight,
  Activity,
  Target,
  Award
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardStats {
  totalClients: number;
  activeAssociations: number;
  completedSessions: number;
  newPlans: number;
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
    activeAssociations: 567,
    completedSessions: 89,
    newPlans: 23
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([
    { id: 1, type: 'session', message: 'João completou sessão de HIIT', time: '2 min atrás' },
    { id: 2, type: 'plan', message: 'Novo plano criado para Maria', time: '15 min atrás' },
    { id: 3, type: 'record', message: 'Pedro bateu record pessoal', time: '1 hora atrás' }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch basic data
      const studentsData = await supabase.from('estudantes').select('id');
      const plansData = await supabase.from('modelos_de_treino').select('id');
      
      setStats({
        totalClients: studentsData.data?.length || 1234,
        activeAssociations: studentsData.data?.length || 567,
        completedSessions: 89,
        newPlans: plansData.data?.length || 23
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
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
    },
    {
      title: "Lista de Alunos", 
      description: "Gerencie seus alunos",
      icon: <Users className="w-6 h-6" />,
      href: "/lista-de-alunos",
      color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
    },
    {
      title: "Painel Geral",
      description: "Visão macro do sistema",
      icon: <BarChart3 className="w-6 h-6" />,
      href: "/painel-geral",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
    },
    {
      title: "Painel de Treino",
      description: "Gerencie cronograma de treinos",
      icon: <Dumbbell className="w-6 h-6" />,
      href: "/painel-de-treino", 
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
    },
    {
      title: "Biblioteca de Exercícios",
      description: "Acesse exercícios e programas",
      icon: <Target className="w-6 h-6" />,
      href: "/biblioteca-de-exercicios",
      color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" 
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Bem-vindo ao Lar</h1>
              <p className="text-muted-foreground">
                Painel principal com visão geral de suas atividades e acesso rápido às principais áreas
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate("/perfil")}
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalClients.toLocaleString()}</div>
              <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12%
              </Badge>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Associações Ativas</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.activeAssociations.toLocaleString()}</div>
              <Badge className="mt-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                <Activity className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessões Completas</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.completedSessions}</div>
              <Badge className="mt-2 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                Esta semana
              </Badge>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos Planos</CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.newPlans}</div>
              <Badge className="mt-2 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                Este mês
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover-scale cursor-pointer group" onClick={() => navigate(action.href)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    {action.icon}
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-lg">{action.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Atividades Recentes</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/estatisticas")}>
                Ver Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge variant="outline">{activity.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Próximos Eventos</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/calendario")}>
                <Calendar className="w-4 h-4 mr-2" />
                Ver Calendário
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Aula de Pilates - Turma A</p>
                  <p className="text-xs text-muted-foreground">Hoje, 14:00</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Avaliação física - João Silva</p>
                  <p className="text-xs text-muted-foreground">Amanhã, 09:30</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Reunião de equipe</p>
                  <p className="text-xs text-muted-foreground">Sexta, 16:00</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}