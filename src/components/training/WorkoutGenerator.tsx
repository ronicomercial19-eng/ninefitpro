
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, Play, Target, Dumbbell, CheckCircle, MessageSquare 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  technical_description: string;
  youtube_embed_url: string;
  gif_url?: string;
  primary_muscle_groups: string[];
  category: string;
  equipment_needed: string[];
  difficulty_level: string;
}

interface WorkoutBlock {
  type: 'W' | 'P' | 'A' | 'C' | 'F';
  name: string;
  exercises: {
    exercise: Exercise;
    sets: string;
    reps: string;
    load?: string;
    rest: string;
    notes?: string;
  }[];
}

interface GeneratedWorkout {
  id: string;
  workout_hash: string;
  workout_data: {
    blocks: WorkoutBlock[];
    estimated_duration: number;
    focus: string;
    difficulty: string;
  };
  generated_at: string;
  completed: boolean;
}

const blockNames = {
  W: { name: 'Aquecimento', icon: '🔥', color: 'bg-blue-100 border-blue-300' },
  P: { name: 'Principal', icon: '💪', color: 'bg-orange-100 border-orange-300' },
  A: { name: 'Acessórios', icon: '🎯', color: 'bg-green-100 border-green-300' },
  C: { name: 'Condicionamento', icon: '❤️', color: 'bg-red-100 border-red-300' },
  F: { name: 'Finalização', icon: '🧘', color: 'bg-purple-100 border-purple-300' }
};

export const WorkoutGenerator = () => {
  const { user } = useAuth();
  const [currentWorkout, setCurrentWorkout] = useState<GeneratedWorkout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [generating, setGenerating] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<GeneratedWorkout[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchExercises();
      fetchWorkoutHistory();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_fitness_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.log('No profile found');
    }
  };

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_library_enhanced')
        .select('*');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
    }
  };

  const fetchWorkoutHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('generated_workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setWorkoutHistory(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };

  const generateWorkoutHash = (workoutData: any): string => {
    const hashString = JSON.stringify({
      focus: workoutData.focus,
      exercises: workoutData.blocks.map((block: WorkoutBlock) => 
        block.exercises.map(e => e.exercise.name).sort()
      ).flat().sort(),
      difficulty: workoutData.difficulty
    });
    
    return btoa(hashString).slice(0, 16);
  };

  const generateWorkout = async () => {
    if (!userProfile) {
      toast.error('Complete seu perfil fitness primeiro!');
      return;
    }

    setGenerating(true);
    try {
      // Simulate AI workout generation based on user profile
      const workoutData = await generateAIWorkout();
      const workoutHash = generateWorkoutHash(workoutData);

      // Check if this exact workout combination already exists
      const { data: existingWorkout } = await supabase
        .from('generated_workouts')
        .select('id')
        .eq('user_id', user!.id)
        .eq('workout_hash', workoutHash)
        .maybeSingle();

      if (existingWorkout && workoutHistory.length < 99) {
        // If workout exists and we haven't reached 99 unique workouts, generate a new one
        return generateWorkout();
      }

      // Save the new workout
      const { data: newWorkout, error } = await supabase
        .from('generated_workouts')
        .insert({
          user_id: user!.id,
          workout_hash: workoutHash,
          workout_data: workoutData,
          generated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentWorkout(newWorkout);
      fetchWorkoutHistory();
      toast.success('Treino gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar treino:', error);
      toast.error('Erro ao gerar treino');
    } finally {
      setGenerating(false);
    }
  };

  const generateAIWorkout = async (): Promise<any> => {
    // AI Logic for workout generation based on user profile
    const availableExercises = exercises.filter(exercise => {
      // Filter by equipment availability
      const hasEquipment = exercise.equipment_needed.some(eq => 
        userProfile.available_equipment.includes(eq) || eq === 'Peso corporal'
      );
      
      // Filter by experience level
      const levelMatch = exercise.difficulty_level === userProfile.experience_level ||
        (userProfile.experience_level === 'advanced' && exercise.difficulty_level === 'intermediate') ||
        (userProfile.experience_level === 'intermediate' && exercise.difficulty_level === 'beginner');

      return hasEquipment && levelMatch;
    });

    // Generate workout blocks
    const blocks: WorkoutBlock[] = [
      {
        type: 'W',
        name: 'Aquecimento',
        exercises: generateBlockExercises(availableExercises, 'mobility', 2)
      },
      {
        type: 'P',
        name: 'Principal',
        exercises: generateBlockExercises(availableExercises, 'strength', 4)
      },
      {
        type: 'A',
        name: 'Acessórios',
        exercises: generateBlockExercises(availableExercises, 'strength', 3)
      },
      {
        type: 'C',
        name: 'Condicionamento',
        exercises: generateBlockExercises(availableExercises, 'conditioning', 1)
      },
      {
        type: 'F',
        name: 'Finalização',
        exercises: generateBlockExercises(availableExercises, 'mobility', 2)
      }
    ];

    return {
      blocks,
      estimated_duration: 60,
      focus: userProfile.primary_goals[0] || 'Condicionamento Geral',
      difficulty: userProfile.experience_level
    };
  };

  const generateBlockExercises = (exercises: Exercise[], category: string, count: number) => {
    const filteredExercises = exercises.filter(ex => 
      ex.category === category || (category === 'mobility' && ex.category === 'strength')
    );
    
    const selectedExercises = filteredExercises
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    return selectedExercises.map(exercise => ({
      exercise,
      sets: category === 'strength' ? '3-4' : '1-2',
      reps: category === 'strength' ? '8-12' : '10-15',
      load: category === 'strength' ? '70-80%' : undefined,
      rest: category === 'strength' ? '60-90s' : '30-45s',
      notes: exercise.execution_notes
    }));
  };

  const handleWorkoutFeedback = async (feedback: string) => {
    if (!currentWorkout) return;

    try {
      const { error } = await supabase
        .from('generated_workouts')
        .update({
          user_feedback: { rating: feedback, timestamp: new Date().toISOString() }
        })
        .eq('id', currentWorkout.id);

      if (error) throw error;
      toast.success('Feedback registrado!');
    } catch (error) {
      console.error('Erro ao salvar feedback:', error);
    }
  };

  const markWorkoutCompleted = async () => {
    if (!currentWorkout) return;

    try {
      const { error } = await supabase
        .from('generated_workouts')
        .update({ completed: true })
        .eq('id', currentWorkout.id);

      if (error) throw error;
      
      setCurrentWorkout(prev => prev ? { ...prev, completed: true } : null);
      toast.success('Treino concluído!');
    } catch (error) {
      console.error('Erro ao marcar treino como concluído:', error);
    }
  };

  if (!userProfile) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Target className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Complete seu Perfil Fitness</h3>
          <p className="text-gray-600 mb-4">
            Para gerar treinos personalizados, precisamos conhecer seu perfil.
          </p>
          <Button onClick={() => window.location.href = '#profile'}>
            Completar Perfil
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generator Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Gerador IA de Treinos
            </div>
            <Badge variant="outline">
              {workoutHistory.length} treinos únicos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">
                Treinos únicos gerados: {workoutHistory.length}/99
              </p>
              <Progress value={(workoutHistory.length / 99) * 100} className="w-48 mt-1" />
            </div>
            <Button 
              onClick={generateWorkout} 
              disabled={generating}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Gerar Novo Treino
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Workout */}
      {currentWorkout && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-green-500" />
                Treino Atual
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {currentWorkout.workout_data.estimated_duration} min
                </Badge>
                <Badge variant="outline">
                  {currentWorkout.workout_data.focus}
                </Badge>
                {currentWorkout.completed && (
                  <Badge className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Concluído
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="workout" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="workout">Treino</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
              </TabsList>
              
              <TabsContent value="workout" className="space-y-4">
                {currentWorkout.workout_data.blocks.map((block, blockIndex) => (
                  <Card key={blockIndex} className={`border-2 ${blockNames[block.type].color}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="text-xl">{blockNames[block.type].icon}</span>
                        {blockNames[block.type].name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {block.exercises.map((exercise, exerciseIndex) => (
                        <div key={exerciseIndex} className="bg-white p-4 rounded-lg shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">
                              {exercise.exercise.name}
                            </h4>
                            <div className="flex gap-2">
                              <Badge variant="outline">{exercise.sets} séries</Badge>
                              <Badge variant="outline">{exercise.reps} reps</Badge>
                              {exercise.load && (
                                <Badge className="bg-orange-500 text-white">
                                  {exercise.load}
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {exercise.rest}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">
                            {exercise.exercise.technical_description}
                          </p>
                          
                          {exercise.exercise.youtube_embed_url && (
                            <div className="aspect-video mb-3">
                              <iframe
                                width="100%"
                                height="100%"
                                src={exercise.exercise.youtube_embed_url}
                                title={exercise.exercise.name}
                                frameBorder="0"
                                allowFullScreen
                                className="rounded-md"
                              />
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-1 mb-3">
                            {exercise.exercise.primary_muscle_groups.map(muscle => (
                              <Badge key={muscle} variant="secondary" className="text-xs">
                                {muscle}
                              </Badge>
                            ))}
                          </div>
                          
                          {exercise.notes && (
                            <p className="text-xs text-gray-500 italic">
                              💡 {exercise.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
                
                {!currentWorkout.completed && (
                  <Button 
                    onClick={markWorkoutCompleted}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Concluído
                  </Button>
                )}
              </TabsContent>
              
              <TabsContent value="feedback" className="space-y-4">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Como foi seu treino?</h3>
                  <div className="flex justify-center gap-2">
                    {['Muito Fácil', 'Ideal', 'Difícil', 'Lesão/Dor'].map(feedback => (
                      <Button
                        key={feedback}
                        variant="outline"
                        onClick={() => handleWorkoutFeedback(feedback)}
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {feedback}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Workout History */}
      {workoutHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Treinos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workoutHistory.slice(0, 5).map(workout => (
                <div 
                  key={workout.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{workout.workout_data.focus}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(workout.generated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {workout.workout_data.estimated_duration} min
                    </Badge>
                    {workout.completed && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
