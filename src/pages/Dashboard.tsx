import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Dumbbell, TrendingUp, Calendar, BarChart3, BookOpen, ArrowRight, Activity, Target, Zap, Clock, Plus, AlertTriangle, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { MetricsDisplay } from "@/components/analytics/MetricsDisplay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { loadCoachStudentsPerformance } from '@/integrations/coachStudentPerformance';
import { scopeAthletes, computeTrainingCounters } from '@/lib/coachDashboard';
import { isAdminRole } from '@/lib/authRole';
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { EcosystemGrid } from "@/components/9fit/EcosystemGrid";

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
  const { user, profile, userRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0, activeMembers: 0, weeklyWorkouts: 0, upcomingAppointments: 0,
    studentsWithoutTraining: 0, overdueTraining: 0, expiringPlans: [], rpeAlerts: []
  });
  const [recentActivities, setRecentActivities] = useState<{ id: string; status: string | null; created_at: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => { fetchDashboardData(); }, [user, userRole]);

  // Mission Control realtime — auto-refresh when athletes / workouts / events change
  useRealtimeTable({ table: "athletes", filter: user?.id ? `coach_id=eq.${user.id}` : undefined, enabled: !!user?.id }, () => fetchDashboardData());
  useRealtimeTable({ table: "workout_executions", enabled: !!user?.id }, () => fetchDashboardData());
  useRealtimeTable({ table: "master_registry", enabled: !!user?.id }, () => fetchDashboardData());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { setLoading(false); return; }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const in24h = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();

      // Fonte canônica Professor ↔ Aluno (security_invoker + RLS), escopada ao coach
      const athletes = scopeAthletes(await loadCoachStudentsPerformance(), currentUser.id, userRole);
      const ids = athletes.map((a) => a.athlete_id);
      const nameMap = new Map(athletes.map((a) => [a.athlete_id, a]));
      const noIds = ['00000000-0000-0000-0000-000000000000'];
      const scopeIds = ids.length ? ids : noIds;

      let apptQ = supabase.from('appointments').select('id', { count: 'exact', head: true })
        .gte('scheduled_at', now.toISOString()).lte('scheduled_at', in24h);
      if (!isAdminRole(userRole)) apptQ = apptQ.eq('teacher_id', currentUser.id);

      const [execRes, apptRes, assignRes] = await Promise.all([
        supabase.from('workout_executions').select('id, status, completed_at, athlete_id')
          .in('athlete_id', scopeIds).eq('status', 'completed').gte('completed_at', weekAgo)
          .order('completed_at', { ascending: false }),
        apptQ,
        supabase.from('student_training_assignments').select('id, student_id, training_name, end_date')
          .eq('is_active', true).in('student_id', scopeIds),
      ]);
      const failed = [execRes.error, apptRes.error, assignRes.error].find(Boolean);
      if (failed) throw failed;

      const assignments = (assignRes.data || []) as Array<{ id: string; student_id: string; training_name: string | null; end_date: string | null }>;
      const counters = computeTrainingCounters(athletes, assignments, today);

      const future = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const expiringPlans: DashboardStats['expiringPlans'] = assignments
        .filter((a) => a.end_date && a.end_date >= today && a.end_date <= future)
        .map((a) => ({
          id: a.id,
          name: nameMap.get(a.student_id)?.athlete_name || a.training_name || 'Aluno',
          email: nameMap.get(a.student_id)?.athlete_email || null,
          data_fim_plano: a.end_date || '',
        }));

      const rpeAlerts: DashboardStats['rpeAlerts'] = [];
      const { data: recentProgress, error: rpeErr } = await supabase
        .from('workout_progress').select('aluno_id, rpe')
        .in('aluno_id', scopeIds).not('rpe', 'is', null).gte('date', weekAgo.split('T')[0]);
      if (rpeErr) console.warn('[Dashboard] RPE indisponível', rpeErr);
      const byAthlete = new Map<string, number[]>();
      (recentProgress || []).forEach((p: { aluno_id: string; rpe: number }) => {
        byAthlete.set(p.aluno_id, [...(byAthlete.get(p.aluno_id) || []), p.rpe]);
      });
      byAthlete.forEach((rpes, athleteId) => {
        const avg = rpes.reduce((a, b) => a + b, 0) / rpes.length;
        const name = nameMap.get(athleteId)?.athlete_name || 'Aluno';
        if (avg > 8) rpeAlerts.push({ name, avgRpe: Math.round(avg * 10) / 10, type: 'high' });
        else if (avg < 4) rpeAlerts.push({ name, avgRpe: Math.round(avg * 10) / 10, type: 'low' });
      });

      const execs = execRes.data || [];
      setStats({ ...counters, weeklyWorkouts: execs.length, upcomingAppointments: apptRes.count || 0, expiringPlans, rpeAlerts });
      setRecentActivities(execs.slice(0, 4).map((e) => ({ id: e.id, status: e.status, created_at: e.completed_at })));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setLoadError('Não foi possível carregar os dados do painel.');
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

        {/* RPE Alerts */}
        {stats.rpeAlerts.length > 0 && (
          <Card className="border-l-4 border-l-red-500">
            <CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><Heart className="w-5 h-5" />Alertas de RPE ({stats.rpeAlerts.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.rpeAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-500/10 rounded-lg">
                    <div><p className="text-sm font-medium">{alert.name}</p><p className="text-xs text-muted-foreground">RPE médio: {alert.avgRpe}</p></div>
                    <Badge variant="outline" className={alert.type === 'high' ? "text-red-600 border-red-600" : "text-yellow-600 border-yellow-600"}>
                      {alert.type === 'high' ? '⚠️ Sobrecarga' : '⚡ Baixa intensidade'}
                    </Badge>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Módulos integrados
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Catálogo compartilhado com o front do aluno. O status é lido dos módulos e conectores ativos no Supabase.
            </p>
          </CardHeader>
          <CardContent>
            <EcosystemGrid showAll variant="dense" />
          </CardContent>
        </Card>

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
