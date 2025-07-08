
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Dumbbell, 
  BarChart3, 
  Settings, 
  Plus,
  Calendar,
  Target,
  TrendingUp,
  Video
} from "lucide-react";
import { VideoManager } from "../training/VideoManager";
import { StudentsManagement } from "../students/StudentsManagement";

export const TrainerAdminPanel = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const statsCards = [
    { title: "Alunos Ativos", value: "47", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Treinos Criados", value: "128", icon: Dumbbell, color: "text-green-600", bg: "bg-green-100" },
    { title: "Taxa de Adesão", value: "87%", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
    { title: "Vídeos", value: "32", icon: Video, color: "text-orange-600", bg: "bg-orange-100" }
  ];

  const recentStudents = [
    { name: "Ana Silva", status: "Ativo", lastWorkout: "Hoje", progress: "Excelente" },
    { name: "João Santos", status: "Ativo", lastWorkout: "Ontem", progress: "Bom" },
    { name: "Maria Costa", status: "Inativo", lastWorkout: "3 dias", progress: "Regular" },
    { name: "Pedro Lima", status: "Ativo", lastWorkout: "Hoje", progress: "Excelente" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Painel do Professor</h1>
          <p className="text-gray-600">Gerencie seus alunos, treinos e conteúdos</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-white border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Alunos
            </TabsTrigger>
            <TabsTrigger value="workouts" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Dumbbell className="w-4 h-4 mr-2" />
              Treinos
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Video className="w-4 h-4 mr-2" />
              Vídeos
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Análises
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statsCards.map((stat, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-3xl font-bold text-black">{stat.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Students */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Alunos Recentes</span>
                    <Button 
                      size="sm" 
                      className="bg-orange-500 hover:bg-orange-600"
                      onClick={() => setActiveTab("students")}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Aluno
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentStudents.map((student, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold">{student.name}</h4>
                          <p className="text-sm text-gray-600">Último treino: {student.lastWorkout}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={student.status === 'Ativo' ? 'default' : 'secondary'}>
                            {student.status}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">{student.progress}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button className="h-16 flex-col gap-2 bg-blue-500 hover:bg-blue-600">
                      <Dumbbell className="w-6 h-6" />
                      <span className="text-sm">Criar Treino</span>
                    </Button>
                    <Button 
                      className="h-16 flex-col gap-2 bg-green-500 hover:bg-green-600"
                      onClick={() => setActiveTab("students")}
                    >
                      <Users className="w-6 h-6" />
                      <span className="text-sm">Novo Aluno</span>
                    </Button>
                    <Button className="h-16 flex-col gap-2 bg-purple-500 hover:bg-purple-600">
                      <Calendar className="w-6 h-6" />
                      <span className="text-sm">Agendar</span>
                    </Button>
                    <Button 
                      className="h-16 flex-col gap-2 bg-orange-500 hover:bg-orange-600"
                      onClick={() => setActiveTab("videos")}
                    >
                      <Video className="w-6 h-6" />
                      <span className="text-sm">Vídeo</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students" className="mt-6">
            <StudentsManagement />
          </TabsContent>

          <TabsContent value="workouts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Biblioteca de Treinos</span>
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Treino
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Dumbbell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">Biblioteca de Treinos</h3>
                  <p className="text-gray-600">
                    Crie, edite e organize todos os treinos para seus alunos
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videos" className="mt-6">
            <VideoManager />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance dos Alunos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    Gráfico de Performance
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Engajamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    Gráfico de Engajamento
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Settings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">Configurações do Sistema</h3>
                  <p className="text-gray-600">
                    Personalize suas preferências e configurações da conta
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
