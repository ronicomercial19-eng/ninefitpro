import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Target, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrainingPlan {
  id: string;
  athlete_name: string;
  trainer_name: string;
  start_date: string;
  main_goal: string;
  periodization_type: string;
  duration_weeks: number;  
  weekly_frequency: number;
  blocks: any[];
  weeks: any[];
  daily_workouts: any[];
  is_active: boolean;
}

interface Base44TrainingPlanViewerProps {
  userEmail?: string;
}

export function Base44TrainingPlanViewer({ userEmail }: Base44TrainingPlanViewerProps) {
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);

  useEffect(() => {
    fetchTrainingPlans();
  }, [userEmail]);

  const fetchTrainingPlans = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-base44-training-plans', {
        body: { userEmail }
      });

      if (error) throw error;

      setTrainingPlans(data.plans || []);
      
      // Auto-select first active plan
      const activePlan = data.plans?.find((plan: TrainingPlan) => plan.is_active);
      if (activePlan) {
        setSelectedPlan(activePlan);
      }

    } catch (error) {
      console.error('Error fetching training plans:', error);
      toast.error('Erro ao carregar planos de treinamento');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getPhaseColor = (phaseType: string) => {
    switch (phaseType?.toLowerCase()) {
      case 'anatomical adaptation':
      case 'adaptacao_anatomica':
        return 'bg-blue-100 text-blue-800';
      case 'hypertrophy':
      case 'hipertrofia':
        return 'bg-green-100 text-green-800';
      case 'strength':
      case 'forca':
        return 'bg-red-100 text-red-800';
      case 'power':
      case 'potencia':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando planos de treinamento...</p>
        </div>
      </div>
    );
  }

  if (trainingPlans.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum plano encontrado</h3>
            <p className="text-muted-foreground">
              Não há planos de treinamento ativos para este usuário.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Selection */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trainingPlans.map((plan) => (
          <Card 
            key={plan.id}
            className={`cursor-pointer transition-all ${
              selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedPlan(plan)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.main_goal}</CardTitle>
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <CardDescription>
                Treinador: {plan.trainer_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4" />
                  <span>Início: {formatDate(plan.start_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{plan.duration_weeks} semanas • {plan.weekly_frequency}x/semana</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>{plan.periodization_type}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Plan Details */}
      {selectedPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Plano: {selectedPlan.main_goal}</CardTitle>
            <CardDescription>
              Plano personalizado de treinamento desenvolvido por {selectedPlan.trainer_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="blocks">Blocos</TabsTrigger>
                <TabsTrigger value="weeks">Semanas</TabsTrigger>
                <TabsTrigger value="workouts">Treinos</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Informações Gerais</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Atleta:</strong> {selectedPlan.athlete_name}</p>
                        <p><strong>Objetivo:</strong> {selectedPlan.main_goal}</p>
                        <p><strong>Tipo de Periodização:</strong> {selectedPlan.periodization_type}</p>
                        <p><strong>Data de Início:</strong> {formatDate(selectedPlan.start_date)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Estrutura do Plano</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Duração:</strong> {selectedPlan.duration_weeks} semanas</p>
                        <p><strong>Frequência:</strong> {selectedPlan.weekly_frequency} treinos por semana</p>
                        <p><strong>Blocos:</strong> {selectedPlan.blocks?.length || 0} blocos de treinamento</p>
                        <p><strong>Status:</strong> {selectedPlan.is_active ? 'Ativo' : 'Inativo'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="blocks" className="space-y-4">
                <div className="grid gap-4">
                  {selectedPlan.blocks && selectedPlan.blocks.length > 0 ? (
                    selectedPlan.blocks.map((block, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-lg">Bloco {index + 1}</CardTitle>
                          <CardDescription>
                            {block.name || `Bloco de treinamento ${index + 1}`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-2">
                            {block.phase && (
                              <Badge className={getPhaseColor(block.phase)}>
                                {block.phase}
                              </Badge>
                            )}
                            {block.duration && (
                              <p className="text-sm"><strong>Duração:</strong> {block.duration}</p>
                            )}
                            {block.focus && (
                              <p className="text-sm"><strong>Foco:</strong> {block.focus}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Informações de blocos não disponíveis para este plano.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="weeks" className="space-y-4">
                <div className="grid gap-4">
                  {selectedPlan.weeks && selectedPlan.weeks.length > 0 ? (
                    selectedPlan.weeks.slice(0, 8).map((week, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-lg">Semana {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm space-y-1">
                            {week.load && <p><strong>Carga:</strong> {week.load}</p>}
                            {week.volume && <p><strong>Volume:</strong> {week.volume}</p>}
                            {week.intensity && <p><strong>Intensidade:</strong> {week.intensity}</p>}
                            {week.focus && <p><strong>Foco:</strong> {week.focus}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Informações semanais não disponíveis para este plano.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="workouts" className="space-y-4">
                <div className="grid gap-4">
                  {selectedPlan.daily_workouts && selectedPlan.daily_workouts.length > 0 ? (
                    selectedPlan.daily_workouts.slice(0, 10).map((workout, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {workout.name || `Treino ${index + 1}`}
                          </CardTitle>
                          <CardDescription>
                            {workout.day || `Dia ${index + 1}`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm space-y-1">
                            {workout.focus && <p><strong>Foco:</strong> {workout.focus}</p>}
                            {workout.duration && <p><strong>Duração:</strong> {workout.duration} min</p>}
                            {workout.exercises && (
                              <p><strong>Exercícios:</strong> {workout.exercises.length} exercícios</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Treinos detalhados não disponíveis para este plano.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}