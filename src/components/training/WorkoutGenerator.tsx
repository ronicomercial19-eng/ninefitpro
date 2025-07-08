
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Calendar, TrendingUp, Target, Clock, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Exercise {
  id: string;
  nome: any;
  categoria: any;
}

interface GeneratedWorkout {
  id: string;
  user_profile_id: string | null;
  variation_used: string;
  duration_months: number;
  plan_data: any;
  generated_at: string | null;
  status: string | null;
  feedback_data: any;
}

export const WorkoutGenerator = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [generatedWorkouts, setGeneratedWorkouts] = useState<GeneratedWorkout[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');

  // Mock user ID for testing without authentication
  const mockUserId = 'test-user-123';

  useEffect(() => {
    fetchUserProfile();
    fetchExercises();
    fetchGeneratedWorkouts();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', mockUserId)
        .single();

      if (data) {
        setUserProfile(data);
      } else if (error) {
        console.log('No profile found, will create one when needed');
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercise_library')
        .select('*')
        .limit(50);

      if (data) {
        setExercises(data);
      }
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
    }
  };

  const fetchGeneratedWorkouts = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_workout_plans')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(10);

      if (data) {
        // Map the data to match our interface
        const mappedWorkouts: GeneratedWorkout[] = data.map(workout => ({
          id: workout.id,
          user_profile_id: workout.user_profile_id,
          variation_used: workout.variation_used,
          duration_months: workout.duration_months,
          plan_data: workout.plan_data,
          generated_at: workout.generated_at,
          status: workout.status,
          feedback_data: workout.feedback_data
        }));
        setGeneratedWorkouts(mappedWorkouts);
      }
    } catch (error) {
      console.error('Erro ao buscar treinos:', error);
    }
  };

  const generateWorkout = async () => {
    if (!selectedGoal || !selectedDuration) {
      toast.error('Selecione o objetivo e duração do treino');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Create user profile if it doesn't exist
      if (!userProfile) {
        const { data: newProfile, error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: mockUserId,
            name: 'Usuário Teste',
            primary_goal: selectedGoal
          })
          .select()
          .single();

        if (profileError) throw profileError;
        setUserProfile(newProfile);
      }

      const workoutData = {
        goal: selectedGoal,
        duration: selectedDuration,
        exercises: exercises.slice(0, 6).map(ex => ({
          name: ex.nome,
          sets: Math.floor(Math.random() * 3) + 2,
          reps: Math.floor(Math.random() * 8) + 8,
          rest: Math.floor(Math.random() * 60) + 60
        })),
        generated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('generated_workout_plans')
        .insert({
          user_profile_id: userProfile?.id || mockUserId,
          variation_used: selectedGoal,
          duration_months: parseInt(selectedDuration),
          plan_data: workoutData
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Treino gerado com sucesso!');
      fetchGeneratedWorkouts();
    } catch (error) {
      console.error('Erro ao gerar treino:', error);
      toast.error('Erro ao gerar treino');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gradient">
          Rony Trainer - Gerador de Treinos IA
        </h1>
        <p className="text-lg text-muted-foreground">
          Treinos personalizados baseados em ciência e inteligência artificial
        </p>
      </div>

      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generator">Gerar Treino</TabsTrigger>
          <TabsTrigger value="workouts">Meus Treinos</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
          <TabsTrigger value="periodization">Periodização</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Configurar Treino
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal">Objetivo Principal</Label>
                  <Select value={selectedGoal} onValueChange={setSelectedGoal}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu objetivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hipertrofia">Hipertrofia</SelectItem>
                      <SelectItem value="forca">Força</SelectItem>
                      <SelectItem value="resistencia">Resistência</SelectItem>
                      <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (meses)</Label>
                  <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                    <SelectTrigger>
                      <SelectValue placeholder="Duração do programa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 mês</SelectItem>
                      <SelectItem value="3">3 meses</SelectItem>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="12">12 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={generateWorkout} 
                disabled={isGenerating}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Gerando Treino...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Gerar Treino Personalizado
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5" />
                Treinos Gerados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedWorkouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum treino gerado ainda
                </p>
              ) : (
                <div className="space-y-4">
                  {generatedWorkouts.map((workout) => (
                    <Card key={workout.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">Treino {workout.variation_used}</h3>
                          <Badge>{workout.duration_months} meses</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Gerado em {workout.generated_at ? new Date(workout.generated_at).toLocaleDateString('pt-BR') : 'Data não disponível'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Análise de Desempenho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg">15</h3>
                  <p className="text-sm text-muted-foreground">Treinos Realizados</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg">85%</h3>
                  <p className="text-sm text-muted-foreground">Taxa de Adesão</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="font-semibold text-lg">+12kg</h3>
                  <p className="text-sm text-muted-foreground">Carga Máxima</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periodization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Periodização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Fase 1: Adaptação</h3>
                    <p className="text-sm text-muted-foreground">Semanas 1-4</p>
                  </div>
                  <Badge variant="outline">Ativa</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Fase 2: Hipertrofia</h3>
                    <p className="text-sm text-muted-foreground">Semanas 5-8</p>
                  </div>
                  <Badge variant="secondary">Próxima</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">Fase 3: Força</h3>
                    <p className="text-sm text-muted-foreground">Semanas 9-12</p>
                  </div>
                  <Badge variant="secondary">Futura</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
