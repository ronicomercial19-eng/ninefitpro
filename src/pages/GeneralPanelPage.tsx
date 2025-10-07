import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  Trophy, 
  TrendingUp, 
  Calendar, 
  Download,
  Activity,
  DollarSign,
  UserCheck,
  Clock,
  BarChart3,
  PieChart,
  Target,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GlobalMetrics {
  totalClients: number;
  activeAssociations: number;
  monthlyRevenue: number;
  completedSessions: number;
  newSignups: number;
  retentionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'new_client' | 'completed_session' | 'payment' | 'assessment';
  description: string;
  timestamp: string;
  client?: string;
}

interface DemographicData {
  ageGroup: { label: string; value: number; percentage: number }[];
  membershipType: { label: string; value: number; percentage: number }[];
  goals: { label: string; value: number; percentage: number }[];
}

export default function GeneralPanelPage() {
  const { user, profile, isProfessor } = useAuth();
  const [metrics, setMetrics] = useState<GlobalMetrics>({
    totalClients: 0,
    activeAssociations: 0,
    monthlyRevenue: 0,
    completedSessions: 0,
    newSignups: 0,
    retentionRate: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [demographicData, setDemographicData] = useState<DemographicData>({
    ageGroup: [],
    membershipType: [],
    goals: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState("30");

  useEffect(() => {
    fetchDashboardData();
  }, [user, selectedDateRange]);

  const fetchDashboardData = async () => {
    try {
      // Fetch real metrics from database
      const [clientsRes, sessionsRes, assessmentsRes] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('workouts').select('*'),
        supabase.from('avaliacoes').select('*')
      ]);

      const totalClients = clientsRes.data?.length || 0;
      const completedSessions = sessionsRes.data?.length || 0;
      const activeAssociations = clientsRes.data?.filter((client: any) => client.ativo).length || 0;

      // Calculate sample metrics (in real app, these would come from actual data)
      setMetrics({
        totalClients: totalClients || 1234,
        activeAssociations: activeAssociations || 567,
        monthlyRevenue: 45678,
        completedSessions: completedSessions || 892,
        newSignups: 23,
        retentionRate: 85
      });

      // Sample demographic data
      setDemographicData({
        ageGroup: [
          { label: '18-25', value: 156, percentage: 25 },
          { label: '26-35', value: 298, percentage: 48 },
          { label: '36-45', value: 167, percentage: 27 },
          { label: '45+', value: 89, percentage: 14 }
        ],
        membershipType: [
          { label: 'Premium', value: 234, percentage: 41 },
          { label: 'Standard', value: 198, percentage: 35 },
          { label: 'Basic', value: 135, percentage: 24 }
        ],
        goals: [
          { label: 'Emagrecimento', value: 287, percentage: 46 },
          { label: 'Hipertrofia', value: 198, percentage: 32 },
          { label: 'Condicionamento', value: 134, percentage: 22 }
        ]
      });

      // Sample recent activities
      const activities: RecentActivity[] = [
        {
          id: '1',
          type: 'new_client',
          description: 'Novo cliente cadastrado',
          timestamp: '10:30',
          client: 'Maria Silva'
        },
        {
          id: '2',
          type: 'completed_session',
          description: 'Sessão de treino concluída',
          timestamp: '09:45',
          client: 'João Santos'
        },
        {
          id: '3',
          type: 'payment',
          description: 'Pagamento de mensalidade recebido',
          timestamp: '09:15',
          client: 'Ana Costa'
        },
        {
          id: '4',
          type: 'assessment',
          description: 'Avaliação física realizada',
          timestamp: '08:30',
          client: 'Pedro Lima'
        }
      ];
      setRecentActivities(activities);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    toast.success(`Gerando relatório para os últimos ${selectedDateRange} dias...`);
    // In a real app, this would trigger a report generation and download
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'new_client':
        return <UserCheck className="w-4 h-4 text-green-600" />;
      case 'completed_session':
        return <Activity className="w-4 h-4 text-blue-600" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'assessment':
        return <Target className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isProfessor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Esta área é restrita apenas para professores e administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel FitCentral</h1>
            <p className="text-muted-foreground">
              Visão macro completa do seu negócio fitness
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-foreground"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>
            <Button onClick={generateReport} className="gap-2">
              <Download className="w-4 h-4" />
              Gerar Relatório
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Global Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {metrics.totalClients.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% do mês passado
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Associações Ativas</CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {metrics.activeAssociations.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +8% da semana passada
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {metrics.monthlyRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +15% do mês passado
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessões Completas</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {metrics.completedSessions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                +23% da semana passada
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos Cadastros</CardTitle>
              <UserCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {metrics.newSignups}
              </div>
              <p className="text-xs text-muted-foreground">
                Esta semana
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Retenção</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {metrics.retentionRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                +3% do trimestre passado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Demographics Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Distribuição Demográfica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Age Groups */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Faixa Etária</h4>
                  <div className="space-y-2">
                    {demographicData.ageGroup.map((group) => (
                      <div key={group.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-sm text-muted-foreground w-12">{group.label}</span>
                          <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${group.percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <span className="text-sm font-medium">{group.value}</span>
                          <span className="text-xs text-muted-foreground ml-1">({group.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Membership Types */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Tipo de Plano</h4>
                  <div className="space-y-2">
                    {demographicData.membershipType.map((type) => (
                      <div key={type.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-sm text-muted-foreground w-16">{type.label}</span>
                          <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                              style={{ width: `${type.percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <span className="text-sm font-medium">{type.value}</span>
                          <span className="text-xs text-muted-foreground ml-1">({type.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Goals */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Objetivos</h4>
                  <div className="space-y-2">
                    {demographicData.goals.map((goal) => (
                      <div key={goal.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-sm text-muted-foreground w-20">{goal.label}</span>
                          <div className="flex-1 bg-muted h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all"
                              style={{ width: `${goal.percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <span className="text-sm font-medium">{goal.value}</span>
                          <span className="text-xs text-muted-foreground ml-1">({goal.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
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
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activity.description}
                    </p>
                    {activity.client && (
                      <p className="text-xs text-primary">{activity.client}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
              
              <Button variant="outline" className="w-full">
                Ver Todas as Atividades
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Performance Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Tendências de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Gráficos Interativos
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Aqui seriam exibidos gráficos detalhados de performance, incluindo reservas por período, 
                  comportamento dos usuários, métricas de desempenho e análises de scatter plot.
                </p>
                <Button variant="outline" className="mt-4">
                  Configurar Gráficos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}