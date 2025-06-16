
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartLine, Calendar, ArrowUp } from "lucide-react";
import { EvolutionChart } from "@/components/dashboard/EvolutionChart";
import { WorkoutCard } from "@/components/dashboard/WorkoutCard";
import { AchievementsBadge } from "@/components/dashboard/AchievementsBadge";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Bem-vindo de volta, João!</span>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                Novo Treino
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Peso Atual</p>
                <p className="text-2xl font-bold">78.5 kg</p>
                <p className="text-sm text-green-500 flex items-center">
                  <ArrowUp className="w-4 h-4 mr-1" />
                  -2.3kg este mês
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <ChartLine className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Treinos/Semana</p>
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm text-green-500">Meta: 4 treinos</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sequência</p>
                <p className="text-2xl font-bold">12 dias</p>
                <p className="text-sm text-green-500">Recorde pessoal!</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-500 font-bold">🔥</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medalhas</p>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-orange-500">+2 esta semana</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-500 font-bold">🏆</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Evolution Chart */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Evolução Física</h2>
                <Button variant="outline" size="sm">Ver Detalhes</Button>
              </div>
              <EvolutionChart />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Next Workout */}
            <WorkoutCard />
            
            {/* Recent Achievements */}
            <AchievementsBadge />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
