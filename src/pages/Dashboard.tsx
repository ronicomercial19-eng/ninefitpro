import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Dumbbell, TrendingUp, Calendar, BarChart3, BookOpen, ArrowRight, Activity, Target, Zap, Clock, Plus, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { MetricsDisplay } from "@/components/analytics/MetricsDisplay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { listAthletesByCoach } from '@/services/athletes.service';
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalClients: number;
  activeMembers: number;
  weeklyWorkouts: number;
  upcomingAppointments: number;
  studentsWithoutTraining: number;
  overdueTraining: number;
  expiringPlans: { id: string; name: string; email: string | null; data_fim_plano: string }[];
  rpeAlerts: { name: string; avgRpe: number; type: "high" | "low" }[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0, activeMembers: 0, weeklyWorkouts: 0, upcomingAppointments: 0,
    studentsWithoutTraining: 0, overdueTraining: 0, expiringPlans: [], rpeAlerts: []
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { setLoading(false); return; }

      const today = new Date().toISOString().split('T')[0];

      // Use service layer for athletes
      const athletesResult = await listAthletesByCoach(currentUser.id);
      const allAthletes = athletesResult.data ?? [];

      // Parallel fetch for remaining data
      const [workoutsRes, appointmentsRes, activeAssignmentsRes, expiredAssignmentsRes] = await Promise.all([
        supabase.from('workouts').select('id, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('appointments').select('id, scheduled_at').gte('scheduled_at', new Date().toISOString()),
        supabase.from('student_training_assignments').select('student_id').eq('is_active', true),
        supabase.from('student_training_assignments').select('student_id').eq('is_active', true).lt('end_date', today)
      ]);

      const totalClients = allAthletes.length;
      const activeMembers = allAthletes.filter((s: any) => s.activated)?.length || 0;
      const trainingIds = new Set((activeAssignmentsRes.data || []).map((t: any) => t.student_id));
      const studentsWithoutTraining = allAthletes.filter((a: any) => a.activated && !trainingIds.has(a.id)).length;
      const overdueTraining = new Set((expiredAssignmentsRes.data || []).map((t: any) => t.student_id)).size;

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const { data: expiringAssignments } = await supabase
        .from('student_training_assignments')
        .select('id, student_id, training_name, end_date')
        .eq('is_active', true).gte('end_date', today).lte('end_date', futureDate.toISOString().split('T')[0]);

      const expiringStudentIds = [...new Set((expiringAssignments || []).map((a: any) => a.student_id))];
      let expiringPlans: DashboardStats['expiringPlans'] = [];
      if (expiringStudentIds.length > 0) {
        const nameMap = new Map(allAthletes.filter((a: any) => expiringStudentIds.includes(a.id)).map((a: any) => [a.id, a]));
        expiringPlans = (expiringAssignments || []).map((a: any) => ({
          id: a.id,
          name: (nameMap.get(a.student_id) as any)?.name || a.training_name,
          email: (nameMap.get(a.student_id) as any)?.email || null,
          data_fim_plano: a.end_date || ''
        }));
      }

      // RPE Alerts - check workout_progress for high/low RPE averages
      const rpeAlerts: DashboardStats['rpeAlerts'] = [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: recentProgress } = await supabase
        .from('workout_progress')
        .select('aluno_id, rpe')
        .not('rpe', 'is', null)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

      if (recentProgress && recentProgress.length > 0) {
        const byAthlete = new Map<string, number[]>();
        recentProgress.forEach((p: any) => {
          const arr = byAthlete.get(p.aluno_id) || [];
          arr.push(p.rpe);
          byAthlete.set(p.aluno_id, arr);
        });
        
        const athleteNameMap = new Map(allAthletes.map((a: any) => [a.id, a.name]));
        byAthlete.forEach((rpes, athleteId) => {
          const avg = rpes.reduce((a, b) => a + b, 0) / rpes.length;
          if (avg > 8) rpeAlerts.push({ name: athleteNameMap.get(athleteId) || 'Aluno', avgRpe: Math.round(avg * 10) / 10, type: 'high' });
          else if (avg < 4) rpeAlerts.push({ name: athleteNameMap.get(athleteId) || 'Aluno', avgRpe: Math.round(avg * 10) / 10, type: 'low' });
        });
      }

      setStats({ totalClients, activeMembers, weeklyWorkouts: workoutsRes.data?.length || 0, upcomingAppointments: appointmentsRes.data?.length || 0, studentsWithoutTraining, overdueTraining, expiringPlans, rpeAlerts });
      if (workoutsRes.data) setRecentActivities(workoutsRes.data.slice(0, 4));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally { setLoading(false); }
  };

  const quickActions = [
    { title: "Alunos", description: "Gerencie seus alunos", icon: <Users className="w-6 h-6" />, href: "/app/alunos", gradient: "from-green-500 to-emerald-500" },
    { title: "Exercícios", description: "Biblioteca de exercícios", icon: <Target className="w-6 h-6" />, href: "/app/exercicios", gradient: "from-red-500 to-orange-500" },
    { title: "Agenda", description: "Gerencie agendamentos", icon: <Calendar className="w-6 h-6" />, href: "/app/agenda", gradient: "from-indigo-500 to-blue-500" },
    { title: "Treino IA", description: "Gere treinos com IA", icon: <Dumbbell className="w-6 h-6" />, href: "/app/treino-ia", gradient: "from-[#FF8426] to-[#F04E23]" },
    { title: "Estatísticas", description: "Análises e relatórios", icon: <BarChart3 className="w-6 h-6" />, href: "/app/estatisticas", gradient: "from-purple-500 to-pink-500" },
    { title: "Relatórios", description: "Relatórios detalhados", icon: <BookOpen className="w-6 h-6" />, href: "/app/relatorios", gradient: "from-blue-500 to-cyan-500" }
  ];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="xl" label="Carregando dashboard..." /></div>;

  return (
    <>
      <OnboardingTour />
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-2"><Zap className="w-8 h-8 animate-pulse-soft" /><h2 className="text-4xl font-bold">Dashboard Principal</h2></div>
          <p className="text-primary-foreground/90 mb-6 text-lg">Bem-vindo, {profile?.full_name || 'Professor'}! Gerencie seus alunos e treinos.</p>
          <div className="flex gap-4">
            <Button className="bg-background text-primary hover:bg-background/90 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg" onClick={() => navigate('/app/alunos')}>Gerenciar Alunos<ArrowRight className="ml-2 w-4 h-4" /></Button>
            <Button variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 transition-all duration-300 hover:scale-105" onClick={() => navigate('/app/treino-ia')}><Zap className="mr-2 w-4 h-4" />Criar Treino IA</Button>
          </div>
        </div>

        <div className="animate-in slide-in-from-bottom duration-500 delay-300"><MetricsDisplay showDetailedMetrics={false} /></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom duration-500 delay-400">
          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group border-l-4 border-l-primary" onClick={() => navigate('/app/alunos')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total de Alunos</CardTitle><div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors"><Users className="w-4 h-4 text-primary" /></div></CardHeader>
            <CardContent><div className="text-3xl font-bold group-hover:text-primary transition-colors">{stats.totalClients}</div><p className="text-xs text-green-600 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" />{stats.activeMembers} ativos</p></CardContent>
          </Card>
          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 group border-l-4 border-l-orange-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Sem Treino</CardTitle><div className="p-2 rounded-lg bg-orange-50 group-hover:bg-orange-100 transition-colors"><Activity className="w-4 h-4 text-orange-600" /></div></CardHeader>
            <CardContent><div className="text-3xl font-bold group-hover:text-orange-600 transition-colors">{stats.studentsWithoutTraining}</div><p className="text-xs text-muted-foreground mt-1">Necessitam atenção</p></CardContent>
          </Card>
          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 group border-l-4 border-l-red-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Treinos Vencidos</CardTitle><div className="p-2 rounded-lg bg-red-50 group-hover:bg-red-100 transition-colors"><Dumbbell className="w-4 h-4 text-red-600" /></div></CardHeader>
            <CardContent><div className="text-3xl font-bold group-hover:text-red-600 transition-colors">{stats.overdueTraining}</div><p className="text-xs text-red-600 flex items-center mt-1">Requer atualização</p></CardContent>
          </Card>
          <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group border-l-4 border-l-purple-600" onClick={() => navigate('/app/agenda')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Próximos Agendamentos</CardTitle><div className="p-2 rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors"><Calendar className="w-4 h-4 text-purple-600" /></div></CardHeader>
            <CardContent><div className="text-3xl font-bold group-hover:text-purple-600 transition-colors">{stats.upcomingAppointments}</div><p className="text-xs text-muted-foreground mt-1">Próximas 24 horas</p></CardContent>
          </Card>
        </div>

        {stats.expiringPlans.length > 0 && (
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader><CardTitle className="flex items-center gap-2 text-yellow-600"><AlertTriangle className="w-5 h-5" />Vencimentos Próximos ({stats.expiringPlans.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.expiringPlans.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">
                    <div><p className="text-sm font-medium">{plan.name}</p><p className="text-xs text-muted-foreground">{plan.email}</p></div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">Vence {new Date(plan.data_fim_plano).toLocaleDateString('pt-BR')}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="text-2xl font-bold mb-4">Acesso Rápido</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Card key={action.title} className="hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group overflow-hidden relative" onClick={() => navigate(action.href)}>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${action.gradient} text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>{action.icon}</div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all duration-300" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{action.title}</CardTitle>
                </CardHeader>
                <CardContent className="relative"><p className="text-muted-foreground group-hover:text-foreground transition-colors">{action.description}</p></CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Atividades Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/app/estatisticas")} className="hover:bg-primary/10 hover:text-primary transition-all">Ver Todas<ArrowRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.length > 0 ? recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted hover:shadow-md transition-all duration-300 cursor-pointer group">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse-soft" />
                  <div className="flex-1">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">Treino atualizado</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(activity.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <Badge variant="outline" className="group-hover:border-primary group-hover:text-primary transition-colors">{activity.status}</Badge>
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-8"><Activity className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhuma atividade recente</p></div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
