
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, Play, Calendar, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

interface Workout {
  id: string;
  week_number: number;
  day_number: number;
  phase: string;
  exercises: Exercise[];
  method: string;
  status: string;
  notes?: string;
}

interface Periodization {
  id: string;
  title: string;
  current_phase: string;
  periodization_data: any;
}

export const StudentWorkoutViewer = () => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [periodization, setPeriodization] = useState<Periodization | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    if (!user) return;

    try {
      // Buscar dados do aluno pelo email
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', user.email)
        .single();

      if (studentError) {
        console.log('Usuário não é um aluno cadastrado');
        return;
      }

      // Buscar periodização ativa do aluno
      const { data: periodizationData, error: periodizationError } = await supabase
        .from('periodizations')
        .select('*')
        .eq('user_id', studentData.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (periodizationError) throw periodizationError;

      if (periodizationData && periodizationData.length > 0) {
        setPeriodization(periodizationData[0]);

        // Buscar treinos da periodização
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workouts')
          .select('*')
          .eq('periodization_id', periodizationData[0].id)
          .eq('student_id', studentData.id)
          .order('week_number, day_number');

        if (workoutsError) throw workoutsError;
        
        // Converter os dados do Supabase para o formato esperado
        const formattedWorkouts: Workout[] = (workoutsData || []).map(workout => ({
          id: workout.id,
          week_number: workout.week_number,
          day_number: workout.day_number,
          phase: workout.phase,
          exercises: Array.isArray(workout.exercises) ? workout.exercises : [],
          method: workout.method || '',
          status: workout.status || 'pending',
          notes: workout.notes || undefined
        }));
        
        setWorkouts(formattedWorkouts);
      }

    } catch (error) {
      console.error('Erro ao buscar dados do aluno:', error);
      toast.error('Erro ao carregar treinos');
    } finally {
      setLoading(false);
    }
  };

  const completeWorkout = async (workoutId: string) => {
    try {
      const { error } = await supabase
        .from('workouts')
        .update({ status: 'completed' })
        .eq('id', workoutId);

      if (error) throw error;

      setWorkouts(prev => prev.map(w => 
        w.id === workoutId ? { ...w, status: 'completed' } : w
      ));

      toast.success('Treino marcado como concluído!');
    } catch (error) {
      console.error('Erro ao completar treino:', error);
      toast.error('Erro ao marcar treino como concluído');
    }
  };

  const getPhaseColor = (phase: string) => {
    const colors: any = {
      'base': 'bg-blue-500',
      'intensification': 'bg-orange-500',
      'peaking': 'bg-red-500',
      'realization': 'bg-red-500',
      'recovery': 'bg-green-500',
      'deload': 'bg-green-500'
    };
    return colors[phase] || 'bg-gray-500';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Play className="w-4 h-4 text-blue-500" />;
    }
  };

  const filteredWorkouts = workouts.filter(workout => {
    if (selectedPhase === "all") return true;
    return workout.phase === selectedPhase;
  });

  const workoutsByWeek = filteredWorkouts.reduce((acc, workout) => {
    if (!acc[workout.week_number]) {
      acc[workout.week_number] = [];
    }
    acc[workout.week_number].push(workout);
    return acc;
  }, {} as Record<number, Workout[]>);

  const phases = [...new Set(workouts.map(w => w.phase))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3">Carregando treinos...</span>
      </div>
    );
  }

  if (!periodization) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Nenhuma Periodização Encontrada
          </h3>
          <p className="text-gray-500">
            Você ainda não possui uma periodização ativa. Entre em contato com seu professor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header da Periodização */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{periodization.title}</CardTitle>
              <p className="text-gray-600 mt-1">
                Fase Atual: <span className="font-semibold">{periodization.current_phase}</span>
              </p>
            </div>
            <Badge className={`${getPhaseColor(periodization.current_phase?.toLowerCase())} text-white`}>
              {workouts.filter(w => w.status === 'completed').length} / {workouts.length} concluídos
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros por Fase */}
      <Tabs value={selectedPhase} onValueChange={setSelectedPhase}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">Todas</TabsTrigger>
          {phases.map(phase => (
            <TabsTrigger key={phase} value={phase} className="capitalize">
              {phase}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedPhase} className="space-y-4">
          {Object.entries(workoutsByWeek)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([week, weekWorkouts]) => (
              <Card key={week}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Semana {week}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {weekWorkouts
                      .sort((a, b) => a.day_number - b.day_number)
                      .map((workout) => (
                        <Card 
                          key={workout.id} 
                          className={`border-l-4 ${getPhaseColor(workout.phase)} ${
                            workout.status === 'completed' ? 'bg-green-50' : ''
                          }`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">
                                Treino {workout.day_number}
                              </h4>
                              {getStatusIcon(workout.status)}
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="capitalize">
                                {workout.phase}
                              </Badge>
                              <Badge variant="secondary">
                                {workout.method}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 mb-4">
                              {workout.exercises.slice(0, 3).map((exercise, index) => (
                                <div key={index} className="text-sm">
                                  <span className="font-medium">{exercise.name}</span>
                                  <div className="text-gray-600">
                                    {exercise.sets}x{exercise.reps} - {exercise.rest_seconds}s
                                  </div>
                                </div>
                              ))}
                              {workout.exercises.length > 3 && (
                                <p className="text-xs text-gray-500">
                                  +{workout.exercises.length - 3} exercícios
                                </p>
                              )}
                            </div>

                            {workout.status === 'pending' && (
                              <Button
                                onClick={() => completeWorkout(workout.id)}
                                className="w-full bg-orange-500 hover:bg-orange-600"
                                size="sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marcar como Concluído
                              </Button>
                            )}

                            {workout.status === 'completed' && (
                              <div className="text-center text-green-600 font-medium text-sm">
                                ✓ Treino Concluído
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </TabsContent>
      </Tabs>

      {filteredWorkouts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Nenhum Treino Encontrado
            </h3>
            <p className="text-gray-500">
              Não há treinos disponíveis para o filtro selecionado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
