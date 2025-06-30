
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Loader2, Zap, Target, Calendar, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TrainingPlan, UserProfile } from "@/types/training";

export const TrainingPlanGenerator = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({
    demographics: { age: 25, biological_sex: 'male', height: 175, weight: 70 },
    fitness: { level: 'intermediate', experience_months: 12, injuries: [], goals: [], weekly_availability: 4, session_duration: '60-90min' },
    preferences: { training_environment: 'gym', equipment_available: [], time_preferences: [] }
  });
  const [generatedPlan, setGeneratedPlan] = useState<TrainingPlan | null>(null);
  const { toast } = useToast();

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const generateTrainingPlan = async () => {
    setLoading(true);
    try {
      // Simular processamento de IA
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockPlan: TrainingPlan = {
        metadata: {
          version: "3.0",
          generated_at: new Date().toISOString(),
          user_id: "user-123"
        },
        user_profile: userProfile as UserProfile,
        periodization: {
          type: 'undulating',
          total_weeks: 12,
          current_phase: 1,
          phases: [
            {
              name: "Adaptação",
              duration_weeks: 2,
              focus: "Padrões de movimento e técnica",
              intensity_level: 'moderate',
              volume_level: 'moderate',
              objective: "Estabelecer base técnica sólida",
              key_adaptations: ["Melhora da coordenação", "Aprendizado motor"],
              scientific_rationale: "Fase inicial focada em adaptações neurais e aprendizado motor"
            },
            {
              name: "Hipertrofia",
              duration_weeks: 6,
              focus: "Ganho de massa muscular",
              intensity_level: 'moderate',
              volume_level: 'high',
              objective: "Maximizar síntese proteica",
              key_adaptations: ["Aumento da área de secção transversa", "Hipertrofia sarcoplasmática"],
              scientific_rationale: "Volume elevado com intensidade moderada para otimizar hipertrofia"
            },
            {
              name: "Força",
              duration_weeks: 4,
              focus: "Ganho de força máxima",
              intensity_level: 'high',
              volume_level: 'moderate',
              objective: "Aumentar capacidade de produção de força",
              key_adaptations: ["Adaptações neurais", "Sincronização de unidades motoras"],
              scientific_rationale: "Alta intensidade para adaptações neurais e ganho de força"
            }
          ]
        },
        weekly_schedule: {
          "segunda": {
            day: "Segunda-feira",
            focus: "Membros superiores - Empurrar",
            estimated_duration: 75,
            warm_up: [],
            main_exercises: [
              {
                id: "1",
                name: "Supino reto com halteres",
                category: "Peito",
                muscle_groups: ["Peitoral maior", "Deltoides anterior", "Tríceps"],
                equipment_type: "Halteres",
                difficulty_level: "intermediate",
                instructions: ["Deitar no banco", "Segurar halteres", "Descer controladamente", "Empurrar com força"],
                sets: 4,
                reps: "8-10",
                rest_seconds: 90,
                rpe_target: 8,
                load_percentage: "75-80%",
                tempo: "3-1-1-0",
                notes: "Manter ombros retraídos durante todo movimento"
              }
            ],
            cool_down: []
          }
        },
        additional_modules: {
          nutrition: {
            daily_macros: {
              calories: 2500,
              protein_g: 150,
              carbs_g: 300,
              fat_g: 80
            },
            meal_timing: ["Pré-treino: 1h antes", "Pós-treino: até 30min após"]
          },
          recovery: {
            recommendations: ["Foam rolling", "Mobilidade articular", "Respiração diafragmática"],
            sleep_target_hours: 8,
            stress_management: ["Meditação", "Caminhadas ao ar livre"]
          }
        },
        progression_rules: {
          load_increase_percentage: 5,
          rpe_targets: { min: 7, max: 9 },
          deload_frequency_weeks: 4
        }
      };

      setGeneratedPlan(mockPlan);
      toast({
        title: "Plano Gerado com Sucesso!",
        description: "Seu plano de treino personalizado foi criado com base em IA.",
      });
    } catch (error) {
      toast({
        title: "Erro na Geração",
        description: "Ocorreu um erro ao gerar seu plano. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    toast({
      title: "Exportando PDF",
      description: "Seu plano será exportado em formato PDF.",
    });
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(generatedPlan, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'plano-treino.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (generatedPlan) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-6 h-6 text-orange-500" />
              Plano de Treino Personalizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-900">Periodização</h3>
                <p className="text-sm text-orange-700">{generatedPlan.periodization.type}</p>
                <p className="text-sm text-orange-700">{generatedPlan.periodization.total_weeks} semanas</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900">Fase Atual</h3>
                <p className="text-sm text-blue-700">{generatedPlan.periodization.phases[0].name}</p>
                <p className="text-sm text-blue-700">{generatedPlan.periodization.phases[0].focus}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900">Nutrição</h3>
                <p className="text-sm text-green-700">{generatedPlan.additional_modules.nutrition?.daily_macros.calories} kcal/dia</p>
                <p className="text-sm text-green-700">{generatedPlan.additional_modules.nutrition?.daily_macros.protein_g}g proteína</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cronograma Semanal</h3>
              {Object.entries(generatedPlan.weekly_schedule).map(([day, workout]) => (
                <Card key={day} className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{workout.day}</CardTitle>
                      <span className="text-sm text-gray-500">{workout.estimated_duration} min</span>
                    </div>
                    <p className="text-sm text-gray-600">{workout.focus}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {workout.main_exercises.map((exercise, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{exercise.name}</h4>
                              <p className="text-sm text-gray-600">{exercise.muscle_groups.join(', ')}</p>
                            </div>
                            <div className="text-right text-sm">
                              <p className="font-medium">{exercise.sets} x {exercise.reps}</p>
                              <p className="text-gray-500">RPE {exercise.rpe_target}</p>
                            </div>
                          </div>
                          {exercise.notes && (
                            <p className="text-sm text-orange-600 mt-2 font-medium">💡 {exercise.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-4 mt-8">
              <Button onClick={exportToPDF} className="bg-red-500 hover:bg-red-600">
                <Database className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
              <Button onClick={exportToJSON} variant="outline">
                <Database className="w-4 h-4 mr-2" />
                Exportar JSON
              </Button>
              <Button onClick={() => setGeneratedPlan(null)} variant="outline">
                Gerar Novo Plano
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-orange-500" />
            Gerador de Treino com IA
          </CardTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{step} de {totalSteps}</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dados Demográficos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Idade</Label>
                  <Input
                    id="age"
                    type="number"
                    min="18"
                    max="75"
                    value={userProfile.demographics?.age || 25}
                    onChange={(e) => setUserProfile({
                      ...userProfile,
                      demographics: { ...userProfile.demographics!, age: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label>Sexo Biológico</Label>
                  <Select
                    value={userProfile.demographics?.biological_sex}
                    onValueChange={(value) => setUserProfile({
                      ...userProfile,
                      demographics: { ...userProfile.demographics!, biological_sex: value as 'male' | 'female' }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={userProfile.demographics?.height || 175}
                    onChange={(e) => setUserProfile({
                      ...userProfile,
                      demographics: { ...userProfile.demographics!, height: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={userProfile.demographics?.weight || 70}
                    onChange={(e) => setUserProfile({
                      ...userProfile,
                      demographics: { ...userProfile.demographics!, weight: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Perfil de Fitness</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nível de Experiência</Label>
                  <Select
                    value={userProfile.fitness?.level}
                    onValueChange={(value) => setUserProfile({
                      ...userProfile,
                      fitness: { ...userProfile.fitness!, level: value as 'beginner' | 'intermediate' | 'advanced' }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Iniciante (0-6 meses)</SelectItem>
                      <SelectItem value="intermediate">Intermediário (6-24 meses)</SelectItem>
                      <SelectItem value="advanced">Avançado (24+ meses)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="experience">Experiência (meses)</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    value={userProfile.fitness?.experience_months || 12}
                    onChange={(e) => setUserProfile({
                      ...userProfile,
                      fitness: { ...userProfile.fitness!, experience_months: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="availability">Disponibilidade Semanal</Label>
                  <Select
                    value={userProfile.fitness?.weekly_availability?.toString()}
                    onValueChange={(value) => setUserProfile({
                      ...userProfile,
                      fitness: { ...userProfile.fitness!, weekly_availability: parseInt(value) }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 dias por semana</SelectItem>
                      <SelectItem value="3">3 dias por semana</SelectItem>
                      <SelectItem value="4">4 dias por semana</SelectItem>
                      <SelectItem value="5">5 dias por semana</SelectItem>
                      <SelectItem value="6">6 dias por semana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duração da Sessão</Label>
                  <Select
                    value={userProfile.fitness?.session_duration}
                    onValueChange={(value) => setUserProfile({
                      ...userProfile,
                      fitness: { ...userProfile.fitness!, session_duration: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30-45min">30-45 minutos</SelectItem>
                      <SelectItem value="45-60min">45-60 minutos</SelectItem>
                      <SelectItem value="60-90min">60-90 minutos</SelectItem>
                      <SelectItem value="90+min">90+ minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Objetivos e Limitações</h3>
              <div className="space-y-4">
                <div>
                  <Label>Objetivos Primários (selecione até 3)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['Hipertrofia', 'Força', 'Resistência', 'Perda de peso', 'Condicionamento', 'Reabilitação'].map((goal) => (
                      <div key={goal} className="flex items-center space-x-2">
                        <Checkbox
                          id={goal}
                          checked={userProfile.fitness?.goals?.includes(goal)}
                          onCheckedChange={(checked) => {
                            const currentGoals = userProfile.fitness?.goals || [];
                            if (checked) {
                              setUserProfile({
                                ...userProfile,
                                fitness: { ...userProfile.fitness!, goals: [...currentGoals, goal] }
                              });
                            } else {
                              setUserProfile({
                                ...userProfile,
                                fitness: { ...userProfile.fitness!, goals: currentGoals.filter(g => g !== goal) }
                              });
                            }
                          }}
                        />
                        <Label htmlFor={goal}>{goal}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="injuries">Histórico de Lesões</Label>
                  <Textarea
                    id="injuries"
                    placeholder="Descreva lesões passadas ou limitações físicas..."
                    value={userProfile.fitness?.injuries?.join(', ') || ''}
                    onChange={(e) => setUserProfile({
                      ...userProfile,
                      fitness: { ...userProfile.fitness!, injuries: e.target.value ? e.target.value.split(',').map(s => s.trim()) : [] }
                    })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preferências de Treino</h3>
              <div className="space-y-4">
                <div>
                  <Label>Ambiente de Treino</Label>
                  <Select
                    value={userProfile.preferences?.training_environment}
                    onValueChange={(value) => setUserProfile({
                      ...userProfile,
                      preferences: { ...userProfile.preferences!, training_environment: value as 'home' | 'gym' | 'outdoor' }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Casa</SelectItem>
                      <SelectItem value="gym">Academia</SelectItem>
                      <SelectItem value="outdoor">Ao ar livre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Equipamentos Disponíveis</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['Halteres', 'Barra', 'Máquinas', 'Elásticos', 'Kettlebell', 'Peso corporal'].map((equipment) => (
                      <div key={equipment} className="flex items-center space-x-2">
                        <Checkbox
                          id={equipment}
                          checked={userProfile.preferences?.equipment_available?.includes(equipment)}
                          onCheckedChange={(checked) => {
                            const currentEquipment = userProfile.preferences?.equipment_available || [];
                            if (checked) {
                              setUserProfile({
                                ...userProfile,
                                preferences: { ...userProfile.preferences!, equipment_available: [...currentEquipment, equipment] }
                              });
                            } else {
                              setUserProfile({
                                ...userProfile,
                                preferences: { ...userProfile.preferences!, equipment_available: currentEquipment.filter(e => e !== equipment) }
                              });
                            }
                          }}
                        />
                        <Label htmlFor={equipment}>{equipment}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 && (
              <Button variant="outline" onClick={handlePrevious}>
                Anterior
              </Button>
            )}
            {step < totalSteps ? (
              <Button onClick={handleNext} className="ml-auto">
                Próximo
              </Button>
            ) : (
              <Button 
                onClick={generateTrainingPlan} 
                disabled={loading}
                className="ml-auto bg-orange-500 hover:bg-orange-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando com IA...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Gerar Plano
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
