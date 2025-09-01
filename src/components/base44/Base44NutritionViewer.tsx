import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils, Target, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NutritionPlan {
  id: string;
  name: string;
  goal: string;
  daily_calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  meals: any[];
  is_active: boolean;
}

interface Base44NutritionViewerProps {
  userEmail?: string;
}

export function Base44NutritionViewer({ userEmail }: Base44NutritionViewerProps) {
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<NutritionPlan | null>(null);

  useEffect(() => {
    fetchNutritionPlans();
  }, [userEmail]);

  const fetchNutritionPlans = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-base44-nutrition-plans', {
        body: { userEmail }
      });

      if (error) throw error;

      setNutritionPlans(data.plans || []);
      
      // Auto-select first active plan
      const activePlan = data.plans?.find((plan: NutritionPlan) => plan.is_active);
      if (activePlan) {
        setSelectedPlan(activePlan);
      }

    } catch (error) {
      console.error('Error fetching nutrition plans:', error);
      toast.error('Erro ao carregar planos nutricionais');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMacroPercentage = (macro: number, totalCalories: number) => {
    const calories = macro * (macro === nutritionPlans[0]?.macros.protein || macro === nutritionPlans[0]?.macros.carbs ? 4 : 9);
    return Math.round((calories / totalCalories) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando planos nutricionais...</p>
        </div>
      </div>
    );
  }

  if (nutritionPlans.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-white">Nenhum plano encontrado</h3>
            <p className="text-muted-foreground">
              Não há planos nutricionais ativos disponíveis.
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
        {nutritionPlans.map((plan) => (
          <Card 
            key={plan.id}
            className={`cursor-pointer transition-all bg-gray-900 border-gray-800 ${
              selectedPlan?.id === plan.id ? 'ring-2 ring-orange-500' : ''
            }`}
            onClick={() => setSelectedPlan(plan)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white">{plan.name}</CardTitle>
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <CardDescription className="text-gray-400">
                Objetivo: {plan.goal}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Target className="h-4 w-4" />
                  <span>{plan.daily_calories} kcal/dia</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Utensils className="h-4 w-4" />
                  <span>{plan.meals?.length || 0} refeições</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Plan Details */}
      {selectedPlan && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Plano Nutricional: {selectedPlan.name}</CardTitle>
            <CardDescription className="text-gray-400">
              Plano personalizado para {selectedPlan.goal}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                <TabsTrigger value="overview" className="text-white">Visão Geral</TabsTrigger>
                <TabsTrigger value="macros" className="text-white">Macronutrientes</TabsTrigger>
                <TabsTrigger value="meals" className="text-white">Refeições</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-white">Informações Gerais</h4>
                      <div className="space-y-2 text-sm text-gray-300">
                        <p><strong>Plano:</strong> {selectedPlan.name}</p>
                        <p><strong>Objetivo:</strong> {selectedPlan.goal}</p>
                        <p><strong>Calorias Diárias:</strong> {selectedPlan.daily_calories} kcal</p>
                        <p><strong>Status:</strong> {selectedPlan.is_active ? 'Ativo' : 'Inativo'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-white">Distribuição Diária</h4>
                      <div className="space-y-2 text-sm text-gray-300">
                        <p><strong>Proteína:</strong> {selectedPlan.macros?.protein || 0}g</p>
                        <p><strong>Carboidratos:</strong> {selectedPlan.macros?.carbs || 0}g</p>
                        <p><strong>Gorduras:</strong> {selectedPlan.macros?.fat || 0}g</p>
                        <p><strong>Refeições:</strong> {selectedPlan.meals?.length || 0} por dia</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="macros" className="space-y-4">
                <div className="grid gap-4">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-semibold mb-4 text-white">Distribuição de Macronutrientes</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Proteína</span>
                        <span className="text-white font-semibold">{selectedPlan.macros?.protein || 0}g</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Carboidratos</span>
                        <span className="text-white font-semibold">{selectedPlan.macros?.carbs || 0}g</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Gorduras</span>
                        <span className="text-white font-semibold">{selectedPlan.macros?.fat || 0}g</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-semibold mb-4 text-white">Meta Calórica Diária</h4>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-500 mb-2">
                        {selectedPlan.daily_calories}
                      </div>
                      <div className="text-gray-300">calorias por dia</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="meals" className="space-y-4">
                <div className="grid gap-4">
                  {selectedPlan.meals && selectedPlan.meals.length > 0 ? (
                    selectedPlan.meals.map((meal, index) => (
                      <Card key={index} className="bg-gray-800 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">
                            {meal.name || `Refeição ${index + 1}`}
                          </CardTitle>
                          <CardDescription className="text-gray-400">
                            {meal.time || `Horário ${index + 1}`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm space-y-1 text-gray-300">
                            {meal.foods && meal.foods.length > 0 ? (
                              <ul className="list-disc list-inside space-y-1">
                                {meal.foods.map((food: any, foodIndex: number) => (
                                  <li key={foodIndex}>
                                    {food.name} - {food.quantity}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p>Detalhes da refeição não disponíveis.</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Detalhes das refeições não disponíveis para este plano.
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