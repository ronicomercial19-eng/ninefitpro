import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { Calendar as CalendarIcon, Dumbbell, TrendingUp, Award, Bell, CheckCircle, MessageCircle } from 'lucide-react';
import { WorkoutScheduler } from '@/components/schedule/WorkoutScheduler';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface WorkoutBlock {
  tipo: 'aquecimento' | 'principal' | 'desaquecimento';
  exercicios: string[];
  duracao: string;
}

interface DailyWorkout {
  data: Date;
  treino: string;
  blocos: WorkoutBlock[];
  completo: boolean;
}

export const OptimizedStudentDashboard = () => {
  const { user, profile } = useAuth();
  const { trackApiCall } = usePerformanceMonitor('OptimizedStudentDashboard');
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showScheduler, setShowScheduler] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [weekStreak, setWeekStreak] = useState(12);
  const [currentWeight, setCurrentWeight] = useState(75);
  const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, total: 5 });

  // Workouts virão do Supabase
  const weeklyWorkouts: DailyWorkout[] = useMemo(() => [
    {
      data: new Date(),
      treino: 'Treino A - Peito e Tríceps',
      completo: false,
      blocos: [
        {
          tipo: 'aquecimento',
          exercicios: ['5 min esteira', 'Alongamento dinâmico'],
          duracao: '10 min'
        },
        {
          tipo: 'principal',
          exercicios: [
            'Supino reto - 4x8-10',
            'Supino inclinado - 3x10-12',
            'Crucifixo - 3x12',
            'Tríceps testa - 3x10-12',
            'Tríceps corda - 3x12-15'
          ],
          duracao: '45 min'
        },
        {
          tipo: 'desaquecimento',
          exercicios: ['Alongamento estático', 'Respiração'],
          duracao: '5 min'
        }
      ]
    }
  ], []);

  // Memoizar workout selecionado
  const selectedWorkout = useMemo(() => {
    if (!selectedDate) return null;
    return weeklyWorkouts.find(
      w => format(w.data, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );
  }, [selectedDate, weeklyWorkouts]);

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // Buscar avaliações mais recentes
      const { data: assessment } = await supabase
        .from('avaliacoes')
        .select('peso')
        .eq('estudante_id', user?.id)
        .order('data_avaliacao', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assessment) {
        setCurrentWeight(Number(assessment.peso));
      }

      trackApiCall();
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Callbacks otimizados
  const handleDateSelect = useCallback((date: Date | undefined) => {
    setSelectedDate(date);
    trackApiCall();
  }, [trackApiCall]);

  const handleSchedulerOpen = useCallback(() => {
    setShowScheduler(true);
  }, []);

  const handleCheckIn = useCallback(async () => {
    toast({
      title: 'Check-in realizado!',
      description: 'Seu treino foi registrado com sucesso.',
    });
    setWeeklyProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
    setWeekStreak(prev => prev + 1);
  }, [toast]);

  const handleSendDoubt = useCallback(() => {
    navigate('/suporte');
  }, [navigate]);

  const handleMarkComplete = useCallback(async () => {
    if (!selectedWorkout) return;

    try {
      toast({
        title: 'Treino concluído!',
        description: 'Parabéns! Continue assim.',
      });
      
      setWeeklyProgress(prev => ({ 
        ...prev, 
        completed: Math.min(prev.completed + 1, prev.total) 
      }));
    } catch (error) {
      console.error('Error marking workout complete:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar o treino como completo.',
        variant: 'destructive',
      });
    }
  }, [selectedWorkout, toast]);

  const handleViewNotifications = useCallback(() => {
    toast({
      title: 'Notificações',
      description: 'Você tem 3 novas atualizações!',
    });
  }, [toast]);

  const getBlockIcon = useCallback((tipo: string) => {
    switch (tipo) {
      case 'aquecimento': return '🔥';
      case 'principal': return '💪';
      case 'desaquecimento': return '🧘';
      default: return '📋';
    }
  }, []);

  const getBlockColor = useCallback((tipo: string) => {
    switch (tipo) {
      case 'aquecimento': return 'border-orange-500 bg-orange-500/10';
      case 'principal': return 'border-primary bg-primary/10';
      case 'desaquecimento': return 'border-blue-500 bg-blue-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header com métricas rápidas */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Olá, {profile?.full_name || 'Atleta'}! 👋
            </h1>
            <p className="text-gray-300">
              Seu progresso esta semana está excelente!
            </p>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="relative"
            onClick={handleViewNotifications}
          >
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                {notifications}
              </span>
            )}
          </Button>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Treinos Semana</p>
                  <p className="text-2xl font-bold text-white">
                    {weeklyProgress.completed}/{weeklyProgress.total}
                  </p>
                  <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all" 
                      style={{ width: `${(weeklyProgress.completed / weeklyProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Sequência</p>
                  <p className="text-2xl font-bold text-white">{weekStreak} dias</p>
                  <p className="text-xs text-green-400 mt-1">🔥 Continue assim!</p>
                </div>
                <Award className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Peso Atual</p>
                  <p className="text-2xl font-bold text-white">{currentWeight}kg</p>
                  <p className="text-xs text-blue-400 mt-1">Última avaliação</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Próximo Treino</p>
                  <p className="text-2xl font-bold text-white">Hoje</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendário e ações */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Calendário de Treinos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                locale={ptBR}
                className="rounded-md border-slate-700"
              />
              
              <div className="space-y-2">
                <Button 
                  onClick={handleSchedulerOpen}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Agendar Treino
                </Button>
                <Button 
                  onClick={handleCheckIn}
                  className="w-full" 
                  variant="outline"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Check-in
                </Button>
                <Button 
                  onClick={handleSendDoubt}
                  className="w-full" 
                  variant="outline"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Enviar Dúvida
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Treino do dia */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
                  </CardTitle>
                  {selectedWorkout && (
                    <Badge variant={selectedWorkout.completo ? 'default' : 'outline'}>
                      {selectedWorkout.completo ? 'Completo' : 'Pendente'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedDate && (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Selecione uma data no calendário</p>
                  </div>
                )}

                {selectedDate && !selectedWorkout && (
                  <div className="text-center py-12">
                    <Dumbbell className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhum treino agendado para esta data</p>
                    <Button onClick={handleSchedulerOpen} className="mt-4">
                      Agendar Treino
                    </Button>
                  </div>
                )}

                {selectedWorkout && (
                  <div className="space-y-4">
                    <div className="bg-primary/10 border border-primary rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {selectedWorkout.treino}
                      </h3>
                    </div>

                    {selectedWorkout.blocos.map((bloco, idx) => (
                      <Card key={idx} className={`${getBlockColor(bloco.tipo)} border-2`}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                            <span>{getBlockIcon(bloco.tipo)}</span>
                            {bloco.tipo.charAt(0).toUpperCase() + bloco.tipo.slice(1)}
                            <Badge variant="outline" className="ml-auto">
                              {bloco.duracao}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {bloco.exercicios.map((ex, i) => (
                              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{ex}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}

                    <Button 
                      onClick={handleMarkComplete}
                      className="w-full bg-green-600 hover:bg-green-700" 
                      size="lg"
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Marcar como Completo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showScheduler && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Agendar Treino</h2>
              <Button variant="ghost" onClick={() => setShowScheduler(false)}>✕</Button>
            </div>
            <WorkoutScheduler />
          </div>
        </div>
      )}
    </div>
  );
};
