import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { Calendar as CalendarIcon, Dumbbell, TrendingUp, Award, Bell } from 'lucide-react';
import { WorkoutScheduler } from '@/components/schedule/WorkoutScheduler';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showScheduler, setShowScheduler] = useState(false);

  // Mock data - em produção virá do Supabase com cache
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

  // Callbacks otimizados
  const handleDateSelect = useCallback((date: Date | undefined) => {
    setSelectedDate(date);
    trackApiCall();
  }, [trackApiCall]);

  const handleSchedulerOpen = useCallback(() => {
    setShowScheduler(true);
  }, []);

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
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
              3
            </span>
          </Button>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Treinos Semana</p>
                  <p className="text-2xl font-bold text-white">4/5</p>
                </div>
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Sequência</p>
                  <p className="text-2xl font-bold text-white">12 dias</p>
                </div>
                <Award className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Peso Atual</p>
                  <p className="text-2xl font-bold text-white">75kg</p>
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
                  className="w-full"
                  variant="default"
                >
                  Agendar Treino
                </Button>
                <Button className="w-full" variant="outline">
                  Check-in
                </Button>
                <Button className="w-full" variant="outline">
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

                    <Button className="w-full" size="lg">
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
