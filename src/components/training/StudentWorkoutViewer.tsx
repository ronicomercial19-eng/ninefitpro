
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, Play, Calendar, TrendingUp, ArrowLeft, Timer, Camera, Minus, Plus, RotateCcw, BarChart3, FileText, Eye } from "lucide-react";
import { StudentHTMLTrainingViewer } from "./StudentHTMLTrainingViewer";
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
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [currentWeight, setCurrentWeight] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(seconds => seconds - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const parseExercises = (exercisesData: any): Exercise[] => {
    if (!exercisesData) return [];
    
    try {
      if (Array.isArray(exercisesData)) {
        return exercisesData.map((exercise, index) => ({
          id: exercise.id || `exercise-${index}`,
          name: exercise.name || exercise.nome || `Exercício ${index + 1}`,
          sets: exercise.sets || exercise.series || 3,
          reps: exercise.reps || exercise.repeticoes || "12",
          rest_seconds: exercise.rest_seconds || exercise.descanso || 60,
          notes: exercise.notes || exercise.observacoes
        }));
      }
      
      if (typeof exercisesData === 'string') {
        const parsed = JSON.parse(exercisesData);
        return Array.isArray(parsed) ? parseExercises(parsed) : [];
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao fazer parse dos exercícios:', error);
      return [];
    }
  };

  const fetchStudentData = async () => {
    if (!user) return;

    try {
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', user.email)
        .single();

      if (studentError) {
        console.log('Usuário não é um aluno cadastrado');
        return;
      }

      const { data: periodizationData, error: periodizationError } = await supabase
        .from('periodizations')
        .select('*')
        .eq('user_id', studentData.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (periodizationError) throw periodizationError;

      if (periodizationData && periodizationData.length > 0) {
        setPeriodization(periodizationData[0]);

        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workouts')
          .select('*')
          .eq('periodization_id', periodizationData[0].id)
          .eq('student_id', studentData.id)
          .order('week_number, day_number');

        if (workoutsError) throw workoutsError;
        
        const formattedWorkouts: Workout[] = (workoutsData || []).map(workout => ({
          id: workout.id,
          week_number: workout.week_number,
          day_number: workout.day_number,
          phase: workout.phase,
          exercises: parseExercises(workout.exercises),
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
      setSelectedWorkout({...selectedWorkout!, status: 'completed'});
      setIsWorkoutStarted(false);
    } catch (error) {
      console.error('Erro ao completar treino:', error);
      toast.error('Erro ao marcar treino como concluído');
    }
  };

  const startTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getWorkoutDuration = () => {
    if (!workoutStartTime) return "0M35S";
    const now = new Date();
    const diffMs = now.getTime() - workoutStartTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}M${diffSecs}S`;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3">Carregando treinos...</span>
      </div>
    );
  }

  if (!periodization) {
    return (
      <div className="p-8 text-center text-white">
        <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma aula reservada</h3>
        <p className="text-gray-400 mb-2">Você ainda não agendou</p>
        <p className="text-gray-400">nenhuma atividade</p>
        <Button className="w-full bg-white text-black hover:bg-gray-200 mt-6">
          RESERVAR AGORA
        </Button>
      </div>
    );
  }

  // Tela de treino concluído
  if (selectedWorkout && selectedWorkout.status === 'completed' && !isWorkoutStarted) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="flex items-center p-4 border-b border-gray-800">
          <button onClick={() => setSelectedWorkout(null)} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">TREINO</h1>
        </div>

        <div className="text-center py-12 px-6">
          <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold mb-8">TREINO CONCLUÍDO</h2>
          
          <div className="space-y-6 text-left max-w-sm mx-auto">
            <div>
              <span className="text-gray-400 text-sm block mb-1">RESUMO</span>
              <div className="text-xl font-bold">A - PEITORAL, OMBRO, TRÍCEPS</div>
            </div>
            
            <div>
              <span className="text-gray-400 text-sm block mb-1">TEMPO DE TREINO</span>
              <div className="text-xl font-bold">{getWorkoutDuration()}</div>
            </div>
            
            <div>
              <span className="text-gray-400 text-sm block mb-1">EXERCÍCIOS</span>
              <div className="text-xl font-bold">{selectedWorkout.exercises.length} REALIZADOS</div>
            </div>
          </div>

          <div className="mt-12 space-y-4 px-6">
            <Button className="w-full bg-gray-800 text-white border border-gray-600 py-4">
              <Camera className="w-4 h-4 mr-2" />
              COMPARTILHAR TREINO
            </Button>
            
            <Button 
              onClick={() => setSelectedWorkout(null)}
              className="w-full bg-white text-black hover:bg-gray-200 py-4"
            >
              VOLTAR PARA HOME
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de execução individual do exercício
  if (selectedWorkout && isWorkoutStarted) {
    const currentExercise = selectedWorkout.exercises[currentExerciseIndex];
    
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="flex items-center p-4 border-b border-gray-800">
          <button onClick={() => setIsWorkoutStarted(false)} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">TREINO</h1>
        </div>

        <div className="p-0">
          {/* Imagem do exercício */}
          <div className="relative h-64 bg-gray-900">
            <img 
              src="/lovable-uploads/a5ebd2c5-5df1-46c3-a547-93316a2d1fe5.png" 
              alt="Exercício"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-20" />
          </div>

          {/* Informações do exercício */}
          <div className="p-4 space-y-4">
            <div className="bg-gray-900 rounded-xl p-4">
              <h3 className="text-xl font-bold mb-4">{currentExerciseIndex + 1} - {currentExercise.name.toUpperCase()}</h3>
              
              <div className="flex space-x-3 mb-4">
                <Button variant="outline" className="bg-gray-700 border-gray-600 text-white text-xs px-3 py-1">
                  <FileText className="w-3 h-3 mr-1" />
                  ANOTAÇÕES
                </Button>
                <Button variant="outline" className="bg-gray-700 border-gray-600 text-white text-xs px-3 py-1">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  EVOLUÇÃO
                </Button>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center space-x-8">
                  <div className="text-center">
                    <div className="text-lg font-bold">Séries {currentExercise.sets}x - {currentExercise.reps} Repetições</div>
                  </div>
                  <div className="text-center">
                    <Timer className="w-5 h-5 mx-auto mb-1" />
                    <div className="text-sm">{currentExercise.rest_seconds}s</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm">0-1-0-1</div>
                  </div>
                </div>
                <div className="text-center mt-2 text-gray-400">
                  <span>Pausa ativa - MEIO BURPEE</span>
                </div>
              </div>
            </div>

            {/* Controle de carga */}
            <div className="bg-gray-800 rounded-xl p-4">
              <h4 className="text-center text-lg font-bold mb-4">CARGA ATUAL (KG)</h4>
              <div className="flex items-center justify-center space-x-4">
                <Button 
                  onClick={() => setCurrentWeight(Math.max(0, currentWeight - 1))}
                  className="w-12 h-12 bg-gray-700 border border-gray-600 rounded-lg"
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <div className="text-4xl font-bold w-16 text-center">{currentWeight}</div>
                <Button 
                  onClick={() => setCurrentWeight(currentWeight + 1)}
                  className="w-12 h-12 bg-gray-700 border border-gray-600 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Cronômetro */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h4 className="text-center text-lg font-bold mb-4">CRONÔMETRO</h4>
              <div className="text-center">
                <div className="text-4xl font-bold mb-4">{formatTime(timerSeconds)}</div>
                <div className="flex justify-center space-x-4">
                  <button 
                    onClick={() => startTimer(currentExercise.rest_seconds)}
                    className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center"
                  >
                    <RotateCcw className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center"
                  >
                    <Play className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => {
                if (currentExerciseIndex < selectedWorkout.exercises.length - 1) {
                  setCurrentExerciseIndex(currentExerciseIndex + 1);
                  setCurrentWeight(0);
                  setTimerSeconds(0);
                  setIsTimerRunning(false);
                } else {
                  completeWorkout(selectedWorkout.id);
                }
              }}
              className="w-full bg-white text-black hover:bg-gray-200 py-4 text-lg font-bold"
            >
              CONCLUIR EXERCÍCIO
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Lista de exercícios do treino
  if (selectedWorkout) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="flex items-center p-4 border-b border-gray-800">
          <button onClick={() => setSelectedWorkout(null)} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">TREINO</h1>
        </div>

        <div className="p-4">
          <h2 className="text-xl font-bold mb-2">A - PEITORAL, OMBRO, TRÍCEPS</h2>
          <p className="text-gray-400 mb-6">{selectedWorkout.exercises.length} exercícios</p>

          <div className="mb-6">
            <img 
              src="/lovable-uploads/84d10bda-c9d1-45f2-bea0-11a422b00b03.png" 
              alt="Treino"
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>

          {/* Exercício de Cardio */}
          <div className="bg-gray-200 text-black rounded-lg p-4 flex items-center mb-3">
            <div className="w-12 h-12 bg-gray-800 rounded-lg mr-4 flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold">0 CÁRDIO</div>
            </div>
          </div>

          {/* Lista de exercícios */}
          <div className="space-y-3 mb-6">
            {selectedWorkout.exercises.map((exercise, index) => (
              <div key={exercise.id} className="bg-gray-200 text-black rounded-lg p-4 flex items-center">
                <div className="w-12 h-12 bg-gray-300 rounded-lg mr-4 flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/a5ebd2c5-5df1-46c3-a547-93316a2d1fe5.png"
                    alt={exercise.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{index + 1} {exercise.name.toUpperCase()}</div>
                </div>
              </div>
            ))}
          </div>

          <Button 
            onClick={() => {
              setIsWorkoutStarted(true);
              setCurrentExerciseIndex(0);
              setWorkoutStartTime(new Date());
              setCurrentWeight(0);
              setTimerSeconds(0);
            }}
            className="w-full bg-white text-black hover:bg-gray-200 py-4 text-lg font-bold"
          >
            INICIAR TREINO
          </Button>
        </div>
      </div>
    );
  }

  // Lista principal de treinos
  const phases = [...new Set(workouts.map(w => w.phase))];

  return (
    <div className="space-y-6">
      {/* Seção de Treinos HTML */}
      <div className="bg-card rounded-lg p-4">
        <StudentHTMLTrainingViewer />
      </div>

      {/* Progresso Geral */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-lg p-6 text-white">
        <h3 className="text-lg font-bold mb-2">EMAGRECIMENTO</h3>
        <p className="text-sm mb-4">TREINO 4 - 18 TREINOS EM 6 SEMANAS</p>
        <p className="text-sm">PROF. AMANDA PINHEIRO DE SOUSA</p>
        
        <div className="mt-6">
          <h4 className="font-bold mb-2">PROGRESSO</h4>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-bold">13/12/2024</div>
              <div className="text-xs">Data de início</div>
            </div>
            <div>
              <div className="font-bold">4 níveis</div>
              <div className="text-xs">Treinos realizados</div>
            </div>
            <div>
              <div className="font-bold">Semanas: 6</div>
              <div className="text-xs">Tempo no nível atual</div>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="font-bold mb-2">NÍVEL DE SUPORTE</h4>
          <div className="flex items-center justify-center space-x-4">
            <div className="w-4 h-4 bg-white rounded-full"></div>
            <div className="flex-1 h-1 bg-white rounded"></div>
            <div className="w-4 h-4 bg-white rounded-full border-4 border-orange-300"></div>
            <div className="flex-1 h-1 bg-gray-400 rounded"></div>
            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
          </div>
          <div className="text-center mt-2">
            <div className="font-bold">MÉDIO</div>
            <div className="text-xs">Preciso de um pouco de ajuda para treinar</div>
          </div>
        </div>
      </div>

      {/* Próximo Treino */}
      <div className="text-foreground">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">PRÓXIMO TREINO</h3>
          <span className="text-muted-foreground text-sm">Meus agendamentos ›</span>
        </div>
        
        {workouts.filter(w => w.status === 'pending').slice(0, 1).map((workout) => (
          <div 
            key={workout.id}
            onClick={() => setSelectedWorkout(workout)}
            className="bg-muted rounded-lg p-4 cursor-pointer"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-500 rounded-lg mr-4 flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div className="flex-1">
                <div className="font-bold">Peitoral, Ombro, Tríceps</div>
              </div>
              <span className="text-muted-foreground">›</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de Treinos Anteriores */}
      <div className="text-foreground">
        <h3 className="text-lg font-bold mb-4">ANTERIORES</h3>
        <div className="space-y-3">
          {workouts.slice(1).map((workout) => (
            <div 
              key={workout.id}
              onClick={() => setSelectedWorkout(workout)}
              className="bg-muted rounded-lg p-4 cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-muted-foreground/20 rounded mr-3 flex items-center justify-center">
                  {workout.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <div>
                  <div className="font-semibold">Treino {workout.day_number}</div>
                  <div className="text-sm text-muted-foreground">Semana {workout.week_number}</div>
                </div>
              </div>
              <Badge 
                className={`${getPhaseColor(workout.phase)} text-white text-xs`}
              >
                {workout.phase}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
