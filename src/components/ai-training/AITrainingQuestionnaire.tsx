import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Brain, ArrowRight, ArrowLeft } from 'lucide-react';

interface AITrainingQuestionnaireProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export function AITrainingQuestionnaire({ onComplete, onCancel }: AITrainingQuestionnaireProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Informações do Aluno
    studentName: '',
    age: '',
    gender: '',
    
    // Objetivos
    primaryGoal: '',
    secondaryGoals: [] as string[],
    targetDate: '',
    
    // Experiência
    experienceLevel: '',
    trainingHistory: '',
    currentActivities: '',
    
    // Disponibilidade
    weeklyFrequency: '',
    sessionDuration: '',
    trainingEnvironment: '',
    availableEquipment: [] as string[],
    
    // Saúde e Limitações
    healthConditions: '',
    injuries: '',
    medications: '',
    restrictions: '',
    
    // Preferências
    preferredExercises: '',
    avoidedExercises: '',
    trainingStyle: '',
    
    // Informações Adicionais
    additionalNotes: ''
  });

  const totalSteps = 6;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    // Validar campos obrigatórios
    if (!formData.studentName || !formData.primaryGoal || !formData.experienceLevel) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    toast.success('Gerando treino personalizado com IA...');
    onComplete(formData);
  };

  const goals = ['Hipertrofia', 'Emagrecimento', 'Força', 'Condicionamento', 'Reabilitação', 'Performance Atlética'];
  const equipmentList = ['Barra', 'Halteres', 'Máquinas', 'Elásticos', 'Peso Corporal', 'Kettlebells', 'TRX'];

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Questionário IA - Geração de Treino</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Passo {step} de {totalSteps}
                </p>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Informações Básicas */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações Básicas</h3>
              
              <div className="space-y-2">
                <Label htmlFor="studentName">Nome do Aluno *</Label>
                <Input
                  id="studentName"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Idade *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Ex: 25"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gênero</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Objetivos */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Objetivos</h3>
              
              <div className="space-y-2">
                <Label>Objetivo Principal *</Label>
                <RadioGroup value={formData.primaryGoal} onValueChange={(value) => setFormData({ ...formData, primaryGoal: value })}>
                  {goals.map((goal) => (
                    <div key={goal} className="flex items-center space-x-2">
                      <RadioGroupItem value={goal.toLowerCase()} id={goal} />
                      <Label htmlFor={goal} className="cursor-pointer">{goal}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Prazo Desejado (opcional)</Label>
                <Input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step 3: Experiência */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Experiência e Histórico</h3>
              
              <div className="space-y-2">
                <Label>Nível de Experiência *</Label>
                <Select value={formData.experienceLevel} onValueChange={(value) => setFormData({ ...formData, experienceLevel: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iniciante">Iniciante (0-6 meses)</SelectItem>
                    <SelectItem value="intermediario">Intermediário (6-24 meses)</SelectItem>
                    <SelectItem value="avancado">Avançado (2+ anos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Histórico de Treino</Label>
                <Textarea
                  value={formData.trainingHistory}
                  onChange={(e) => setFormData({ ...formData, trainingHistory: e.target.value })}
                  placeholder="Descreva seu histórico de treinamento..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Atividades Físicas Atuais</Label>
                <Textarea
                  value={formData.currentActivities}
                  onChange={(e) => setFormData({ ...formData, currentActivities: e.target.value })}
                  placeholder="Outras atividades que você pratica..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 4: Disponibilidade */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Disponibilidade e Recursos</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequência Semanal *</Label>
                  <Select value={formData.weeklyFrequency} onValueChange={(value) => setFormData({ ...formData, weeklyFrequency: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2x por semana</SelectItem>
                      <SelectItem value="3">3x por semana</SelectItem>
                      <SelectItem value="4">4x por semana</SelectItem>
                      <SelectItem value="5">5x por semana</SelectItem>
                      <SelectItem value="6">6x por semana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duração da Sessão</Label>
                  <Select value={formData.sessionDuration} onValueChange={(value) => setFormData({ ...formData, sessionDuration: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="45">45 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                      <SelectItem value="90">90 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ambiente de Treino</Label>
                <RadioGroup value={formData.trainingEnvironment} onValueChange={(value) => setFormData({ ...formData, trainingEnvironment: value })}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="academia" id="academia" />
                    <Label htmlFor="academia" className="cursor-pointer">Academia</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="casa" id="casa" />
                    <Label htmlFor="casa" className="cursor-pointer">Casa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hibrido" id="hibrido" />
                    <Label htmlFor="hibrido" className="cursor-pointer">Híbrido</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Equipamentos Disponíveis</Label>
                <div className="flex flex-wrap gap-2">
                  {equipmentList.map((equipment) => (
                    <Button
                      key={equipment}
                      type="button"
                      variant={formData.availableEquipment.includes(equipment) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const updated = formData.availableEquipment.includes(equipment)
                          ? formData.availableEquipment.filter(e => e !== equipment)
                          : [...formData.availableEquipment, equipment];
                        setFormData({ ...formData, availableEquipment: updated });
                      }}
                    >
                      {equipment}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Saúde e Limitações */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Saúde e Limitações</h3>
              
              <div className="space-y-2">
                <Label>Condições de Saúde</Label>
                <Textarea
                  value={formData.healthConditions}
                  onChange={(e) => setFormData({ ...formData, healthConditions: e.target.value })}
                  placeholder="Diabetes, hipertensão, problemas cardíacos, etc."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Lesões ou Dores</Label>
                <Textarea
                  value={formData.injuries}
                  onChange={(e) => setFormData({ ...formData, injuries: e.target.value })}
                  placeholder="Lesões atuais ou antigas, dores crônicas..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Medicamentos</Label>
                <Textarea
                  value={formData.medications}
                  onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  placeholder="Medicamentos em uso..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Restrições Médicas</Label>
                <Textarea
                  value={formData.restrictions}
                  onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
                  placeholder="Exercícios ou movimentos restritos..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 6: Preferências */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preferências de Treino</h3>
              
              <div className="space-y-2">
                <Label>Exercícios Preferidos</Label>
                <Textarea
                  value={formData.preferredExercises}
                  onChange={(e) => setFormData({ ...formData, preferredExercises: e.target.value })}
                  placeholder="Exercícios que você gosta de fazer..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Exercícios a Evitar</Label>
                <Textarea
                  value={formData.avoidedExercises}
                  onChange={(e) => setFormData({ ...formData, avoidedExercises: e.target.value })}
                  placeholder="Exercícios que você não gosta ou não consegue fazer..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Estilo de Treino</Label>
                <Select value={formData.trainingStyle} onValueChange={(value) => setFormData({ ...formData, trainingStyle: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tradicional">Tradicional (séries e repetições)</SelectItem>
                    <SelectItem value="circuito">Circuito</SelectItem>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="funcional">Funcional</SelectItem>
                    <SelectItem value="crossfit">CrossFit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observações Adicionais</Label>
                <Textarea
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  placeholder="Qualquer informação adicional relevante..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? onCancel : handleBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </Button>

            <Button
              type="button"
              onClick={handleNext}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {step === totalSteps ? 'Gerar Treino' : 'Próximo'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
