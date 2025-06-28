
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Activity, 
  Target, 
  Calendar, 
  TrendingUp, 
  User, 
  Settings,
  Play,
  Award,
  Clock,
  Zap
} from "lucide-react";

const AppDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const stats = [
    { label: "Treinos Concluídos", value: "24", icon: Activity, color: "text-orange-500" },
    { label: "Dias Consecutivos", value: "12", icon: Target, color: "text-green-500" },
    { label: "Calorias Queimadas", value: "3.2k", icon: Zap, color: "text-blue-500" },
    { label: "Tempo Total", value: "18h", icon: Clock, color: "text-purple-500" }
  ];

  const recentWorkouts = [
    { name: "Treino A - Superiores", date: "Hoje", duration: "45min", completed: true },
    { name: "Treino B - Inferiores", date: "Ontem", duration: "50min", completed: true },
    { name: "Cardio HIIT", date: "2 dias", duration: "30min", completed: true },
    { name: "Treino C - Core", date: "3 dias", duration: "40min", completed: true }
  ];

  const nextWorkouts = [
    { name: "Treino A - Superiores", scheduled: "Amanhã 07:00", type: "Força" },
    { name: "Cardio Moderado", scheduled: "Sexta 18:00", type: "Cardio" },
    { name: "Treino B - Inferiores", scheduled: "Sábado 08:00", type: "Força" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-black text-white px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <div 
              className="text-2xl font-bold cursor-pointer"
              onClick={() => navigate('/')}
            >
              Fit<span className="text-orange-500">Evolution</span>
            </div>
            
            <div className="hidden md:flex space-x-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-2 rounded ${activeTab === "overview" ? "bg-orange-500 text-black" : "text-gray-300 hover:text-white"}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/workout-manager')}
                className="text-gray-300 hover:text-white px-3 py-2"
              >
                Treinos
              </button>
              <button
                onClick={() => navigate('/assessment')}
                className="text-gray-300 hover:text-white px-3 py-2"
              >
                Avaliação
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Olá, {user?.name || user?.email?.split('@')[0]}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">
            Bem-vindo de volta, <span className="text-orange-500">{user?.name || 'Atleta'}</span>
          </h1>
          <p className="text-gray-600">Vamos continuar sua evolução minimalista</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-black">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Workout */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-black">Treino de Hoje</h3>
              <Badge className="bg-orange-500 text-black">Agendado</Badge>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-black mb-2">Treino A - Superiores</h4>
              <p className="text-gray-600 mb-3">Foco em peitorais, ombros e tríceps</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  45-50 min
                </span>
                <span className="flex items-center">
                  <Target className="w-4 h-4 mr-1" />
                  6 exercícios
                </span>
              </div>
            </div>

            <Button 
              className="w-full bg-orange-500 hover:bg-orange-600 text-black font-medium"
              onClick={() => navigate('/workout-manager')}
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar Treino
            </Button>
          </Card>

          {/* Progress Chart */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-black mb-4">Progresso Semanal</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Segunda</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{width: "100%"}}></div>
                  </div>
                  <Award className="w-4 h-4 text-orange-500" />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Terça</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{width: "100%"}}></div>
                  </div>
                  <Award className="w-4 h-4 text-orange-500" />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Quarta</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: "60%"}}></div>
                  </div>
                  <span className="text-xs text-gray-400">60%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Hoje</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                    <div className="bg-gray-300 h-2 rounded-full" style={{width: "0%"}}></div>
                  </div>
                  <span className="text-xs text-gray-400">0%</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Workouts */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-black mb-4">Treinos Recentes</h3>
            <div className="space-y-3">
              {recentWorkouts.map((workout, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-black">{workout.name}</p>
                    <p className="text-sm text-gray-600">{workout.date} • {workout.duration}</p>
                  </div>
                  <Award className="w-5 h-5 text-green-500" />
                </div>
              ))}
            </div>
          </Card>

          {/* Next Workouts */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-black mb-4">Próximos Treinos</h3>
            <div className="space-y-3">
              {nextWorkouts.map((workout, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-black">{workout.name}</p>
                    <p className="text-sm text-gray-600">{workout.scheduled}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {workout.type}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-black mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="p-4 h-auto flex-col space-y-2"
              onClick={() => navigate('/assessment')}
            >
              <User className="w-6 h-6" />
              <span>Nova Avaliação</span>
            </Button>
            <Button 
              variant="outline" 
              className="p-4 h-auto flex-col space-y-2"
              onClick={() => navigate('/workout-manager')}
            >
              <Calendar className="w-6 h-6" />
              <span>Agendar Treino</span>
            </Button>
            <Button 
              variant="outline" 
              className="p-4 h-auto flex-col space-y-2"
            >
              <TrendingUp className="w-6 h-6" />
              <span>Ver Relatórios</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDashboard;
