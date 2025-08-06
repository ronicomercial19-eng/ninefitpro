import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { 
  Home, 
  Calendar, 
  Dumbbell, 
  User,
  Play,
  Timer,
  CheckCircle,
  ArrowLeft,
  Share2,
  Target,
  Trophy,
  BarChart3,
  Settings,
  Bell,
  Plus,
  Minus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Program {
  id: string;
  program_name: string;
  description: string;
}

interface UserProgress {
  id: string;
  program_id: string;
  program_start_date: string;
  support_level: string;
  workouts_completed: number;
  current_workout_index: number;
}

interface Exercise {
  id: string;
  exercise_name: string;
  video_url?: string;
  description?: string;
  default_series: number;
  default_reps: string;
  rest_time_seconds: number;
  exercise_order: number;
}

interface GymClass {
  id: string;
  class_name: string;
  location: string;
  class_datetime: string;
  available_slots: number;
  instructor_name?: string;
  description?: string;
}

interface WorkoutLog {
  sets: Array<{ reps: number; weight: number }>;
}

const FitnessApp = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [currentView, setCurrentView] = useState("main"); // main, program-overview, exercise-list, exercise-execution, workout-summary
  const [programs, setPrograms] = useState<Program[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [gymClasses, setGymClasses] = useState<GymClass[]>([]);
  const [supportLevel, setSupportLevel] = useState([50]);
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({ sets: [] });
  const [currentWeight, setCurrentWeight] = useState(0);
  const [currentReps, setCurrentReps] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);

  // Simulated user email for demo purposes
  const userEmail = "demo@user.com";

  useEffect(() => {
    fetchPrograms();
    fetchUserProgress();
    fetchGymClasses();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .order('created_at');
    
    if (error) {
      console.error('Error fetching programs:', error);
      return;
    }
    
    setPrograms(data || []);
  };

  const fetchUserProgress = async () => {
    const { data, error } = await supabase
      .from('user_program_progress')
      .select('*')
      .eq('user_email', userEmail)
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user progress:', error);
      return;
    }
    
    if (data) {
      setUserProgress(data);
      fetchCurrentProgram(data.program_id);
    }
  };

  const fetchCurrentProgram = async (programId: string) => {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single();
    
    if (error) {
      console.error('Error fetching current program:', error);
      return;
    }
    
    setCurrentProgram(data);
  };

  const fetchGymClasses = async () => {
    const { data, error } = await supabase
      .from('gym_classes')
      .select('*')
      .gte('class_datetime', new Date().toISOString())
      .order('class_datetime');
    
    if (error) {
      console.error('Error fetching gym classes:', error);
      return;
    }
    
    setGymClasses(data || []);
  };

  const selectProgram = async (program: Program) => {
    // Create or update user progress
    const progressData = {
      user_email: userEmail,
      program_id: program.id,
      program_start_date: new Date().toISOString().split('T')[0],
      support_level: 'medium',
      workouts_completed: 0,
      current_workout_index: 0,
      is_active: true
    };

    const { data, error } = await supabase
      .from('user_program_progress')
      .upsert(progressData, { onConflict: 'user_email,program_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating progress:', error);
      toast.error('Erro ao selecionar programa');
      return;
    }

    setCurrentProgram(program);
    setUserProgress(data);
    setCurrentView("program-overview");
    toast.success('Programa selecionado com sucesso!');
  };

  const startWorkout = () => {
    // For demo, create sample exercises
    const sampleExercises: Exercise[] = [
      {
        id: '1',
        exercise_name: 'SUPINO HALTERES INCLINADO',
        default_series: 3,
        default_reps: '8-10',
        rest_time_seconds: 90,
        exercise_order: 1,
        description: 'Exercício para peitorais superiores'
      },
      {
        id: '2',
        exercise_name: 'DESENVOLVIMENTO HALTERES',
        default_series: 3,
        default_reps: '10-12',
        rest_time_seconds: 60,
        exercise_order: 2,
        description: 'Exercício para ombros'
      },
      {
        id: '3',
        exercise_name: 'TRÍCEPS BANCO',
        default_series: 3,
        default_reps: '12-15',
        rest_time_seconds: 45,
        exercise_order: 3,
        description: 'Exercício para tríceps'
      }
    ];

    setExercises(sampleExercises);
    setCurrentExerciseIndex(0);
    setWorkoutStartTime(new Date());
    setCurrentView("exercise-list");
  };

  const startExerciseExecution = () => {
    setCurrentView("exercise-execution");
    setWorkoutLog({ sets: [] });
    setCurrentWeight(0);
    setCurrentReps(0);
    setTimerSeconds(0);
  };

  const addSet = () => {
    if (currentWeight > 0 && currentReps > 0) {
      const newSet = { weight: currentWeight, reps: currentReps };
      setWorkoutLog(prev => ({
        sets: [...prev.sets, newSet]
      }));
      setCurrentWeight(0);
      setCurrentReps(0);
      toast.success('Série adicionada!');
    }
  };

  const completeExercise = async () => {
    // Save exercise log
    const logData = {
      user_email: userEmail,
      program_id: userProgress?.program_id,
      exercise_name: exercises[currentExerciseIndex].exercise_name,
      sets_completed: workoutLog.sets,
      date: new Date().toISOString().split('T')[0]
    };

    const { error } = await supabase
      .from('user_workout_logs')
      .insert(logData);

    if (error) {
      console.error('Error saving exercise log:', error);
    }

    // Move to next exercise or complete workout
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setWorkoutLog({ sets: [] });
      setCurrentWeight(0);
      setCurrentReps(0);
      setTimerSeconds(0);
    } else {
      // Workout completed
      completeWorkout();
    }
  };

  const completeWorkout = async () => {
    // Update user progress
    if (userProgress) {
      const { error } = await supabase
        .from('user_program_progress')
        .update({ 
          workouts_completed: userProgress.workouts_completed + 1,
          current_workout_index: userProgress.current_workout_index + 1
        })
        .eq('id', userProgress.id);

      if (error) {
        console.error('Error updating progress:', error);
      }
    }

    setCurrentView("workout-summary");
    toast.success('Treino concluído!');
  };

  const bookClass = async (classId: string) => {
    const bookingData = {
      user_email: userEmail,
      class_id: classId,
      status: 'confirmed'
    };

    const { error } = await supabase
      .from('class_bookings')
      .insert(bookingData);

    if (error) {
      console.error('Error booking class:', error);
      toast.error('Erro ao reservar aula');
      return;
    }

    toast.success('Aula reservada com sucesso!');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderHomeContent = () => (
    <div className="p-4 space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Olá, Usuário</h1>
          <p className="text-gray-400">Pronto para treinar hoje?</p>
        </div>
        <Bell className="w-6 h-6 text-white" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card 
          className="bg-gradient-to-br from-orange-500 to-red-500 border-none cursor-pointer"
          onClick={() => setActiveTab("aulas")}
        >
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white font-medium">Reservar</p>
          </CardContent>
        </Card>

        <Card 
          className="bg-gradient-to-br from-blue-500 to-purple-500 border-none cursor-pointer"
          onClick={() => setActiveTab("treino")}
        >
          <CardContent className="p-4 text-center">
            <Dumbbell className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white font-medium">Treino</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-teal-500 border-none">
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white font-medium">Conquistas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 border-none">
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white font-medium">Frequência</p>
          </CardContent>
        </Card>
      </div>

      {/* Banner */}
      <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-none">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-white mb-2">BIO RITMO</h3>
          <p className="text-white/90">Transforme seu corpo, transforme sua vida</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderClassesContent = () => (
    <div className="p-4 space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Aulas Disponíveis</h2>
        <Badge variant="secondary">Shopping Morumbi Town</Badge>
      </div>

      <div className="space-y-4">
        {gymClasses.map((gymClass) => (
          <Card key={gymClass.id} className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-white">{gymClass.class_name}</h3>
                  <p className="text-gray-400 text-sm">{gymClass.instructor_name}</p>
                  <p className="text-gray-500 text-xs">{formatDate(gymClass.class_datetime)}</p>
                </div>
                <Badge variant="outline">{gymClass.available_slots} vagas</Badge>
              </div>
              <p className="text-gray-400 text-sm mb-3">{gymClass.description}</p>
              <Button 
                onClick={() => bookClass(gymClass.id)}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                RESERVAR AGORA
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderWorkoutContent = () => {
    if (currentView === "program-overview" && currentProgram && userProgress) {
      return (
        <div className="p-4 space-y-6 pb-20">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCurrentView("main")}
              className="text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">{currentProgram.program_name}</h1>
            <p className="text-gray-400">{currentProgram.description}</p>
          </div>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Progresso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Data de início:</span>
                <span className="text-white">{userProgress.program_start_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Treinos realizados:</span>
                <span className="text-white">{userProgress.workouts_completed}</span>
              </div>
              <div className="space-y-2">
                <span className="text-gray-400">Nível de suporte:</span>
                <Slider
                  value={supportLevel}
                  onValueChange={setSupportLevel}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">
                  {supportLevel[0] < 30 ? "Preciso de muita ajuda" : 
                   supportLevel[0] < 70 ? "Preciso de um pouco de ajuda" : 
                   "Consigo treinar sozinho"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={startWorkout}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-6 text-lg"
          >
            PRÓXIMO TREINO
            <br />
            <span className="text-sm opacity-90">A - PEITORAL, OMBRO, TRÍCEPS</span>
          </Button>
        </div>
      );
    }

    if (currentView === "exercise-list") {
      return (
        <div className="p-4 space-y-6 pb-20">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCurrentView("program-overview")}
              className="text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">A - PEITORAL, OMBRO, TRÍCEPS</h1>
            <p className="text-gray-400">{exercises.length} exercícios</p>
          </div>

          <div className="space-y-3">
            {exercises.map((exercise, index) => (
              <Card key={exercise.id} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{exercise.exercise_name}</h3>
                      <p className="text-gray-400 text-sm">
                        {exercise.default_series}x {exercise.default_reps} • {exercise.rest_time_seconds}s descanso
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button 
            onClick={startExerciseExecution}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white py-6 text-lg"
          >
            <Play className="w-6 h-6 mr-2" />
            INICIAR TREINO
          </Button>
        </div>
      );
    }

    if (currentView === "exercise-execution") {
      const currentExercise = exercises[currentExerciseIndex];
      
      return (
        <div className="p-4 space-y-6 pb-20">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCurrentView("exercise-list")}
              className="text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Badge variant="secondary">
              {currentExerciseIndex + 1} de {exercises.length}
            </Badge>
          </div>

          {/* Exercise Video/Image Placeholder */}
          <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
            <Play className="w-16 h-16 text-white opacity-50" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              {currentExerciseIndex + 1} - {currentExercise.exercise_name}
            </h1>
            <p className="text-gray-400">{currentExercise.description}</p>
          </div>

          {/* Exercise Details */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-400 text-sm">Séries</p>
                  <p className="text-white font-bold">{currentExercise.default_series}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Repetições</p>
                  <p className="text-white font-bold">{currentExercise.default_reps}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Descanso</p>
                  <p className="text-white font-bold">{currentExercise.rest_time_seconds}s</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Load */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-4">CARGA ATUAL (KG)</h3>
              <div className="flex items-center justify-center space-x-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentWeight(Math.max(0, currentWeight - 1))}
                  className="border-gray-600"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold text-white min-w-[60px] text-center">
                  {currentWeight}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentWeight(currentWeight + 1)}
                  className="border-gray-600"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reps */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <h3 className="text-white font-semibold mb-4">REPETIÇÕES</h3>
              <div className="flex items-center justify-center space-x-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentReps(Math.max(0, currentReps - 1))}
                  className="border-gray-600"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold text-white min-w-[60px] text-center">
                  {currentReps}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentReps(currentReps + 1)}
                  className="border-gray-600"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timer */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Timer className="w-5 h-5 text-white" />
                  <span className="text-white font-semibold">TIMER</span>
                </div>
                <span className="text-xl font-bold text-white">
                  {formatTime(timerSeconds)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="border-gray-600"
                >
                  {isTimerRunning ? 'Pausar' : 'Iniciar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add Set Button */}
          <Button 
            onClick={addSet}
            disabled={currentWeight === 0 || currentReps === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            ADICIONAR SÉRIE ({workoutLog.sets.length}/{currentExercise.default_series})
          </Button>

          {/* Sets Log */}
          {workoutLog.sets.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-2">Séries realizadas:</h3>
                <div className="space-y-1">
                  {workoutLog.sets.map((set, index) => (
                    <p key={index} className="text-gray-400 text-sm">
                      Série {index + 1}: {set.weight}kg × {set.reps} reps
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete Exercise Button */}
          <Button 
            onClick={completeExercise}
            disabled={workoutLog.sets.length === 0}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white py-6 text-lg"
          >
            <CheckCircle className="w-6 h-6 mr-2" />
            CONCLUIR EXERCÍCIO
          </Button>
        </div>
      );
    }

    if (currentView === "workout-summary") {
      const workoutDuration = workoutStartTime ? 
        Math.floor((new Date().getTime() - workoutStartTime.getTime()) / 1000 / 60) : 0;

      return (
        <div className="p-4 space-y-6 pb-20 text-center">
          <div className="py-8">
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">TREINO CONCLUÍDO</h1>
            <p className="text-gray-400">Parabéns! Você completou seu treino de hoje.</p>
          </div>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Grupos Musculares</p>
                  <p className="text-white font-bold">Peitoral, Ombro, Tríceps</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Tempo Total</p>
                  <p className="text-white font-bold">{workoutDuration} min</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Exercícios</p>
                  <p className="text-white font-bold">{exercises.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
            <Share2 className="w-5 h-5 mr-2" />
            COMPARTILHAR TREINO
          </Button>

          <Button 
            onClick={() => {
              setCurrentView("main");
              setActiveTab("home");
            }}
            variant="outline"
            className="w-full border-gray-600 text-white"
          >
            VOLTAR AO INÍCIO
          </Button>
        </div>
      );
    }

    // Main workout view - program selection
    return (
      <div className="p-4 space-y-6 pb-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Programas de Treino</h2>
          <p className="text-gray-400">Escolha seu programa personalizado</p>
        </div>

        {currentProgram && userProgress ? (
          <Card className="bg-gradient-to-r from-orange-500 to-red-500 border-none">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">Programa Atual</h3>
              <p className="text-white/90 mb-4">{currentProgram.program_name}</p>
              <Button 
                onClick={() => setCurrentView("program-overview")}
                className="w-full bg-white/20 hover:bg-white/30 text-white border-none"
              >
                CONTINUAR PROGRAMA
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Programas Disponíveis</h3>
          {programs.map((program) => (
            <Card key={program.id} className="bg-gray-900 border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors">
              <CardContent className="p-4" onClick={() => selectProgram(program)}>
                <h3 className="font-semibold text-white mb-1">{program.program_name}</h3>
                <p className="text-gray-400 text-sm">{program.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderProfileContent = () => (
    <div className="p-4 space-y-6 pb-20">
      <div className="text-center py-6">
        <div className="w-20 h-20 bg-gray-600 rounded-full mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Usuário Demo</h2>
        <p className="text-gray-400 text-sm">PLANO PREMIUM - SHOPPING MORUMBI TOWN</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">CONTA</h3>
        
        <div className="space-y-2">
          {[
            'Conquistas',
            'Minha jornada', 
            'Minha frequência',
            'Meu plano',
            'Trancamento de férias',
            'Editar informações',
            'Avaliações Físicas'
          ].map((item) => (
            <Card key={item} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white">{item}</span>
                  <span className="text-gray-400">›</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">BIO RITMO</h1>
          <Settings className="w-6 h-6 text-white" />
        </div>
      </header>

      {/* Content */}
      <div className="pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="home">
            {renderHomeContent()}
          </TabsContent>
          
          <TabsContent value="aulas">
            {renderClassesContent()}
          </TabsContent>
          
          <TabsContent value="treino">
            {renderWorkoutContent()}
          </TabsContent>
          
          <TabsContent value="perfil">
            {renderProfileContent()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800">
        <div className="flex justify-around py-2">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center p-2 ${activeTab === "home" ? "text-orange-500" : "text-gray-500"}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button
            onClick={() => setActiveTab("aulas")}
            className={`flex flex-col items-center p-2 ${activeTab === "aulas" ? "text-orange-500" : "text-gray-500"}`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-xs mt-1">Aulas</span>
          </button>
          
          <button
            onClick={() => setActiveTab("treino")}
            className={`flex flex-col items-center p-2 ${activeTab === "treino" ? "text-orange-500" : "text-gray-500"}`}
          >
            <Dumbbell className="w-6 h-6" />
            <span className="text-xs mt-1">Treino</span>
          </button>
          
          <button
            onClick={() => setActiveTab("perfil")}
            className={`flex flex-col items-center p-2 ${activeTab === "perfil" ? "text-orange-500" : "text-gray-500"}`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">Perfil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FitnessApp;