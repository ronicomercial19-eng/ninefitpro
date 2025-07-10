
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dumbbell, 
  Calendar, 
  TrendingUp, 
  User,
  LogOut,
  CheckCircle,
  Clock
} from "lucide-react";
import { StudentWorkoutViewer } from "@/components/training/StudentWorkoutViewer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface StudentStats {
  totalWorkouts: number;
  completedWorkouts: number;
  currentPhase: string;
  adherenceRate: number;
}

const StudentApp = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("workouts");
  const [studentStats, setStudentStats] = useState<StudentStats>({
    totalWorkouts: 0,
    completedWorkouts: 0,
    currentPhase: 'Não definida',
    adherenceRate: 0
  });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStudentStats();
    }
  }, [user]);

  const fetchStudentStats = async () => {
    if (!user) return;

    try {
      // Buscar dados do aluno
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('email', user.email)
        .single();

      if (!studentData) return;

      // Buscar treinos do aluno
      const { data: workoutsData } = await supabase
        .from('workouts')
        .select('*')
        .eq('student_id', studentData.id);

      // Buscar periodização ativa
      const { data: periodizationData } = await supabase
        .from('periodizations')
        .select('current_phase')
        .eq('user_id', studentData.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const totalWorkouts = workoutsData?.length || 0;
      const completedWorkouts = workoutsData?.filter(w => w.status === 'completed').length || 0;
      const adherenceRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

      setStudentStats({
        totalWorkouts,
        completedWorkouts,
        currentPhase: periodizationData?.[0]?.current_phase || 'Não definida',
        adherenceRate
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Digite email e senha');
      return;
    }

    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });

      if (error) throw error;
      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error('Erro no login: ' + error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      logout();
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };

  const statsCards = [
    { 
      title: "Treinos Totais", 
      value: studentStats.totalWorkouts.toString(), 
      icon: Dumbbell, 
      color: "text-blue-600" 
    },
    { 
      title: "Concluídos", 
      value: studentStats.completedWorkouts.toString(), 
      icon: CheckCircle, 
      color: "text-green-600" 
    },
    { 
      title: "Taxa de Adesão", 
      value: `${studentStats.adherenceRate}%`, 
      icon: TrendingUp, 
      color: "text-purple-600" 
    },
    { 
      title: "Fase Atual", 
      value: studentStats.currentPhase, 
      icon: Clock, 
      color: "text-orange-600" 
    }
  ];

  // Tela de Login
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Rony Trainer</CardTitle>
            <p className="text-gray-300">Acesso do Aluno</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  placeholder="seu-email@exemplo.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password" className="text-white">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isLoggingIn ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // App Principal do Aluno
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
                <h1 className="text-xl font-bold text-white">Meus Treinos</h1>
                <p className="text-sm text-gray-300">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <User className="w-4 h-4 mr-2" />
                Perfil
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/10"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-all">
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
          <TabsList className="grid w-full grid-cols-3 bg-black/30 border-white/20">
            <TabsTrigger value="workouts" className="text-white data-[state=active]:bg-white/20">
              <Dumbbell className="w-4 h-4 mr-2" />
              Treinos
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-white data-[state=active]:bg-white/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Progresso
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-white data-[state=active]:bg-white/20">
              <Calendar className="w-4 h-4 mr-2" />
              Agenda
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" className="mt-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
              <StudentWorkoutViewer />
            </div>
          </TabsContent>

          <TabsContent value="progress" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Progresso Pessoal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-white font-semibold">Estatísticas Gerais</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-300">
                        <span>Taxa de Adesão:</span>
                        <Badge className={`${studentStats.adherenceRate >= 80 ? 'bg-green-500' : studentStats.adherenceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                          {studentStats.adherenceRate}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Fase Atual:</span>
                        <Badge variant="outline" className="text-white border-white/20">
                          {studentStats.currentPhase}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-white font-semibold">Próximos Objetivos</h3>
                    <div className="space-y-2 text-gray-300">
                      <p>• Manter consistência nos treinos</p>
                      <p>• Progredir para próxima fase</p>
                      <p>• Melhorar técnica de execução</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Agenda de Treinos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-300">
                    Funcionalidade de agenda em desenvolvimento
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

export default StudentApp;
