
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhysicalAssessment } from "@/components/assessment/PhysicalAssessment";
import { WorkoutAdminPanel } from "@/components/workout/WorkoutAdminPanel";
import { Users, Calendar, BarChart3, Settings, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const ProfessorDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    scheduledWorkouts: 0,
    completedAssessments: 0,
    pendingReviews: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Buscar estatísticas do professor
      const [studentsRes, schedulesRes, assessmentsRes] = await Promise.all([
        supabase.from('user_profiles_extended').select('id').eq('user_type', 'student'),
        supabase.from('workout_schedules').select('id').eq('professor_id', user?.id),
        supabase.from('physical_assessments').select('id').eq('professor_id', user?.id)
      ]);

      setStats({
        totalStudents: studentsRes.data?.length || 0,
        scheduledWorkouts: schedulesRes.data?.length || 0,
        completedAssessments: assessmentsRes.data?.length || 0,
        pendingReviews: 3 // Mock data
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const statsCards = [
    { title: "Total de Alunos", value: stats.totalStudents, icon: Users, color: "text-blue-600" },
    { title: "Treinos Agendados", value: stats.scheduledWorkouts, icon: Calendar, color: "text-green-600" },
    { title: "Avaliações Realizadas", value: stats.completedAssessments, icon: BarChart3, color: "text-orange-600" },
    { title: "Revisões Pendentes", value: stats.pendingReviews, icon: FileText, color: "text-red-600" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Painel do Professor</h1>
          <p className="text-gray-600">Gerencie seus alunos e acompanhe o progresso</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-black">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="assessments" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="assessments">Avaliação Física</TabsTrigger>
            <TabsTrigger value="workouts">Gerenciar Treinos</TabsTrigger>
            <TabsTrigger value="students">Alunos</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="assessments">
            <PhysicalAssessment />
          </TabsContent>

          <TabsContent value="workouts">
            <WorkoutAdminPanel />
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Alunos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Mock student data */}
                  {[1, 2, 3].map((student) => (
                    <div key={student} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">A{student}</span>
                        </div>
                        <div>
                          <p className="font-semibold">Aluno {student}</p>
                          <p className="text-sm text-gray-600">aluno{student}@email.com</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Ativo</Badge>
                        <Button size="sm" variant="outline">
                          Ver Perfil
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurações do Professor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Preferências de Notificação</h3>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked />
                      <span>Notificar sobre novos agendamentos</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked />
                      <span>Notificar sobre avaliações pendentes</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" />
                      <span>Relatórios semanais de progresso</span>
                    </label>
                  </div>
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
