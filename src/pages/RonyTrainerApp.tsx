
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dumbbell, 
  TrendingUp, 
  Calendar, 
  Play, 
  User, 
  Settings,
  BarChart3,
  Target,
  Clock,
  Trophy
} from "lucide-react";
import { WorkoutGenerator } from "@/components/training/WorkoutGenerator";
import { PeriodizationUpload } from "@/components/training/PeriodizationUpload";

const RonyTrainerApp = () => {
  const [activeTab, setActiveTab] = useState("workouts");

  const statsCards = [
    { title: "Treinos Realizados", value: "24", icon: Dumbbell, color: "text-blue-600" },
    { title: "Peso Levantado", value: "2.8t", icon: Trophy, color: "text-yellow-600" },
    { title: "Tempo Ativo", value: "48h", icon: Clock, color: "text-green-600" },
    { title: "Meta Mensal", value: "85%", icon: Target, color: "text-purple-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Rony Trainer</h1>
                <p className="text-sm text-gray-300">Seu Coach de Performance</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <User className="w-4 h-4 mr-2" />
                Perfil
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">{stat.title}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-black/30 border-white/20">
            <TabsTrigger value="workouts" className="text-white data-[state=active]:bg-white/20">
              <Dumbbell className="w-4 h-4 mr-2" />
              Treinos
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-white data-[state=active]:bg-white/20">
              <BarChart3 className="w-4 h-4 mr-2" />
              Análises
            </TabsTrigger>
            <TabsTrigger value="periodization" className="text-white data-[state=active]:bg-white/20">
              <Calendar className="w-4 h-4 mr-2" />
              Periodização
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-white/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" className="mt-6">
            <div className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Treino de Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-white">Treino A - Push</h3>
                        <p className="text-sm text-gray-300">Peito, Ombros e Tríceps</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400">Pendente</Badge>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                      Iniciar Treino
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <WorkoutGenerator />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Progressão de Força</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    Gráfico de Progressão
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Volume de Treino</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    Gráfico de Volume
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="periodization" className="mt-6">
            <PeriodizationUpload />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Desempenho Semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    Dashboard Principal
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Metas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Frequência Semanal</span>
                      <span className="text-white font-semibold">4/5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Carga Progressiva</span>
                      <span className="text-white font-semibold">+5kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Consistência</span>
                      <span className="text-white font-semibold">85%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RonyTrainerApp;
