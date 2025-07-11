
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
  Clock,
  Home,
  Trophy,
  Target,
  Bell,
  Menu,
  ArrowLeft,
  Play,
  Timer,
  Camera
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
  const [activeTab, setActiveTab] = useState("home");
  const [studentStats, setStudentStats] = useState<StudentStats>({
    totalWorkouts: 0,
    completedWorkouts: 0,
    currentPhase: 'Não definida',
    adherenceRate: 0
  });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [studentName, setStudentName] = useState('');

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

      if (studentData) {
        setStudentName(studentData.nome);
      }

      // Buscar treinos do aluno
      const { data: workoutsData } = await supabase
        .from('workouts')
        .select('*')
        .eq('student_id', studentData?.id);

      // Buscar periodização ativa
      const { data: periodizationData } = await supabase
        .from('periodizations')
        .select('current_phase')
        .eq('user_id', studentData?.id)
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

  // Tela de Login
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">BIORITMO</CardTitle>
            <p className="text-gray-400">Acesso do Aluno</p>
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
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
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
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white">BIORITMO</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Bell className="w-6 h-6 text-white" />
            <Menu className="w-6 h-6 text-white" />
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="pb-20">
        {activeTab === "home" && (
          <div className="p-4 space-y-6">
            {/* Perfil do Usuário */}
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-gray-600 rounded-full mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-white mb-2">Olá, {studentName || 'Aluno'}</h2>
              <p className="text-gray-400 text-sm">DÉBITO AUTOMÁTICO - PERMANÊNCIA MÍNIMA 12 MESES</p>
              <p className="text-gray-400 text-sm">- SHOPPING MORUMBI TOWN</p>
            </div>

            {/* Menu de Opções */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">CONTA</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                  <span className="text-white">Conquistas</span>
                  <span className="text-gray-400">›</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                  <span className="text-white">Minha jornada</span>
                  <span className="text-gray-400">›</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                  <span className="text-white">Minha frequência</span>
                  <span className="text-gray-400">›</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                  <span className="text-white">Meu plano</span>
                  <span className="text-gray-400">›</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                  <span className="text-white">Trancamento de férias</span>
                  <span className="text-gray-400">›</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                  <span className="text-white">Editar informações</span>
                  <span className="text-gray-400">›</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                  <span className="text-white">Avaliações Físicas</span>
                  <span className="text-gray-400">›</span>
                </div>
              </div>
            </div>

            {/* Seção de Treinos */}
            <div className="mt-8">
              <div className="relative">
                <img 
                  src="/lovable-uploads/50c7d2be-e22b-4cac-b456-e0a80c7180f6.png" 
                  alt="Treinos"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex flex-col justify-center items-center">
                  <h3 className="text-3xl font-bold text-white mb-2">TREINOS</h3>
                  <p className="text-white text-center px-4">
                    Eleve seu poder com treinos exclusivos e personalizados.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "aulas" && (
          <div className="p-4">
            <div className="text-center py-8">
              <img 
                src="/lovable-uploads/ae95e72e-72b0-4ac4-9e34-698d640ecfe4.png" 
                alt="Aulas"
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
              <div className="bg-gray-900 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-2">Shopping Morumbi Town</h3>
                <p className="text-gray-400 mb-4">Reserve seu horário com antecedência</p>
                <Button className="w-full bg-white text-black hover:bg-gray-200 mb-4">
                  RESERVAR AGORA
                </Button>
                <Button variant="outline" className="w-full border-gray-600 text-white">
                  Ver créditos ›
                </Button>
              </div>
              
              <div className="mt-8 text-center">
                <h4 className="text-lg font-semibold text-white mb-2">Nenhuma aula reservada</h4>
                <p className="text-gray-400 mb-2">Você ainda não agendou</p>
                <p className="text-gray-400">nenhuma atividade</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "treino" && (
          <div className="p-4">
            <StudentWorkoutViewer />
          </div>
        )}

        {activeTab === "perfil" && (
          <div className="p-4 space-y-6">
            {/* Perfil */}
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-gray-600 rounded-full mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-white mb-2">{studentName || 'Aluno'}</h2>
              <p className="text-gray-400 text-sm">{user.email}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{studentStats.completedWorkouts}</div>
                <div className="text-gray-400 text-sm">Treinos Concluídos</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{studentStats.adherenceRate}%</div>
                <div className="text-gray-400 text-sm">Taxa de Adesão</div>
              </div>
            </div>

            {/* Logout */}
            <Button 
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800">
        <div className="flex justify-around py-2">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center p-2 ${activeTab === "home" ? "text-white" : "text-gray-500"}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button
            onClick={() => setActiveTab("aulas")}
            className={`flex flex-col items-center p-2 ${activeTab === "aulas" ? "text-white" : "text-gray-500"}`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-xs mt-1">Aulas</span>
          </button>
          
          <button
            onClick={() => setActiveTab("treino")}
            className={`flex flex-col items-center p-2 ${activeTab === "treino" ? "text-white" : "text-gray-500"}`}
          >
            <Dumbbell className="w-6 h-6" />
            <span className="text-xs mt-1">Treino</span>
          </button>
          
          <button
            onClick={() => setActiveTab("perfil")}
            className={`flex flex-col items-center p-2 ${activeTab === "perfil" ? "text-white" : "text-gray-500"}`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">Perfil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentApp;
