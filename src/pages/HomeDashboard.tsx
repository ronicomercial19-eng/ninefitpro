import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  Trophy, 
  Calendar, 
  Dumbbell,
  Search,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardStats {
  totalClients: number;
  activeAssociations: number;
  completedSessions: number;
  newPlans: number;
}

interface RecentActivity {
  id: string;
  type: 'session' | 'plan' | 'record';
  title: string;
  student: string;
  time: string;
}

export default function HomeDashboard() {
  const { user, profile } = useAuth();
  const isProfessor = profile?.role === 'professor';
  const isStudent = profile?.role === 'student';
  const [stats, setStats] = useState({
    totalClients: 0,
    activeAssociations: 0,
    completedSessions: 0,
    newPlans: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      if (isProfessor) {
        // Fetch professor dashboard data
        const [studentsRes, sessionsRes, plansRes] = await Promise.all([
          supabase.from('estudantes').select('id').eq('professor_id', user?.id),
          supabase.from('user_workout_logs').select('id').eq('professor_id', user?.id),
          supabase.from('modelos_de_treino').select('id').eq('professor_id', user?.id)
        ]);

        setStats({
          totalClients: studentsRes.data?.length || 0,
          activeAssociations: studentsRes.data?.filter(() => true).length || 0,
          completedSessions: sessionsRes.data?.length || 0,
          newPlans: plansRes.data?.length || 0
        });

        // Fetch recent activities
        const activitiesRes = await supabase
          .from('user_workout_logs')
          .select('*, estudantes(nome)')
          .eq('professor_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (activitiesRes.data) {
          const activities: RecentActivity[] = activitiesRes.data.map((log: any) => ({
            id: log.id,
            type: 'session' as const,
            title: 'Sessão de Treino Completa',
            student: log.estudantes?.nome || 'Aluno',
            time: new Date(log.created_at).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }));
          setRecentActivities(activities);
        }
      } else {
        // Student dashboard - personal stats
        const sessionsRes = await supabase
          .from('user_workout_logs')
          .select('id')
          .eq('user_email', user?.email);

        setStats({
          totalClients: 1,
          activeAssociations: 1,
          completedSessions: sessionsRes.data?.length || 0,
          newPlans: 1
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Bem-vindo, {profile?.full_name || 'Usuário'}!
            </h1>
            <p className="text-muted-foreground">
              Aqui está um resumo das suas atividades hoje
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            Buscar
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isProfessor ? 'Total de Clientes' : 'Meus Treinos'}
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.totalClients.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +2.1% do mês passado
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isProfessor ? 'Associações Ativas' : 'Plano Ativo'}
              </CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.activeAssociations.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +5.2% da semana passada
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sessões Completas
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.completedSessions}
              </div>
              <p className="text-xs text-muted-foreground">
                +12.3% esta semana
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isProfessor ? 'Novos Planos' : 'Records Pessoais'}
              </CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.newPlans}
              </div>
              <p className="text-xs text-muted-foreground">
                Hoje
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trends Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Tendências de Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Gráfico de tendências será implementado aqui</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.student} • {activity.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma atividade recente
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Link to="/descobrir">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-primary/5">
                  <Search className="w-6 h-6" />
                  <span className="text-sm">Descobrir</span>
                </Button>
              </Link>
              
              <Link to="/alunos">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-primary/5">
                  <Users className="w-6 h-6" />
                  <span className="text-sm">Lista de Alunos</span>
                </Button>
              </Link>
              
              <Link to="/dashboard">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-primary/5">
                  <Trophy className="w-6 h-6" />
                  <span className="text-sm">Painel Geral</span>
                </Button>
              </Link>
              
              <Link to="/treino-ia">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-primary/5">
                  <Dumbbell className="w-6 h-6" />
                  <span className="text-sm">Painel de Treino</span>
                </Button>
              </Link>
              
              <Link to="/exercicios">
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2 hover:bg-primary/5">
                  <Calendar className="w-6 h-6" />
                  <span className="text-sm">Biblioteca de Exercícios</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}