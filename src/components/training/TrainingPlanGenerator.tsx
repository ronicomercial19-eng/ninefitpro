
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Users, Calendar, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Student {
  id: string;
  nome: string;
  email: string;
  objetivo: string;
}

interface Periodization {
  id: string;
  title: string;
  periodization_data: any;
  current_phase: string;
}

interface Exercise {
  id: string;
  name: string;
  phase: string;
  goal: string;
  target_muscles: string[];
}

interface WorkoutTemplate {
  id: string;
  name: string;
  phase: string;
  goal: string;
  exercise_count: number;
  template_data: any;
}

export const TrainingPlanGenerator = () => {
  const [step, setStep] = useState(1);
  const [students, setStudents] = useState<Student[]>([]);
  const [periodizations, setPeriodizations] = useState<Periodization[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedPeriodization, setSelectedPeriodization] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getCurrentUser();
    fetchStudents();
    fetchPeriodizations();
    fetchExercises();
    fetchTemplates();
  }, []);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Erro ao obter usuário:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      toast.error('Erro ao carregar alunos');
    }
  };

  const fetchPeriodizations = async () => {
    try {
      const { data, error } = await supabase
        .from('periodizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPeriodizations(data || []);
    } catch (error) {
      console.error('Erro ao buscar periodizações:', error);
    }
  };

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
    }
  };

  const generateWorkoutPlan = async () => {
    if (!selectedStudent || !selectedPeriodization || !selectedTemplate) {
      toast.error('Selecione todas as opções antes de gerar o plano');
      return;
    }

    setGenerating(true);
    try {
      const selectedPeriod = periodizations.find(p => p.id === selectedPeriodization);
      const selectedTemp = templates.find(t => t.id === selectedTemplate);
      
      if (!selectedPeriod || !selectedTemp) {
        throw new Error('Periodização ou template não encontrado');
      }

      // Buscar exercícios compatíveis com a fase atual da periodização
      const compatibleExercises = exercises.filter(ex => 
        ex.phase === selectedTemp.phase && ex.goal === selectedTemp.goal
      );

      // Gerar treinos para cada semana/dia da periodização
      const phases = selectedPeriod.periodization_data?.phases || [];
      const workouts = [];

      for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
        const phase = phases[phaseIndex];
        const weeksInPhase = phase.duration_weeks || 4;
        
        for (let week = 1; week <= weeksInPhase; week++) {
          for (let day = 1; day <= 4; day++) { // 4 treinos por semana
            // Selecionar exercícios aleatórios compatíveis
            const selectedExercises = compatibleExercises
              .sort(() => 0.5 - Math.random())
              .slice(0, selectedTemp.exercise_count)
              .map(ex => ({
                id: ex.id,
                name: ex.name,
                target_muscles: ex.target_muscles,
                sets: selectedTemp.template_data.sets_range || "4",
                reps: selectedTemp.template_data.reps_range || "8-12",
                rest: selectedTemp.template_data.rest_time || "60-90s",
                load: phase.load_percentage || "70-85%"
              }));

            workouts.push({
              student_id: selectedStudent,
              periodization_id: selectedPeriodization,
              week_number: week,
              day_number: day,
              phase: phase.name || selectedTemp.phase,
              exercises: selectedExercises,
              method: phase.method || "Tradicional",
              status: 'pending'
            });
          }
        }
      }

      // Salvar todos os treinos no banco
      const { error } = await supabase
        .from('workouts')
        .insert(workouts);

      if (error) throw error;

      toast.success(`Plano de treino gerado com sucesso! ${workouts.length} treinos criados.`);
      
      // Reset form
      setStep(1);
      setSelectedStudent("");
      setSelectedPeriodization("");
      setSelectedTemplate("");
      
    } catch (error) {
      console.error('Erro ao gerar plano:', error);
      toast.error('Erro ao gerar plano de treino');
    } finally {
      setGenerating(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !selectedStudent) {
      toast.error('Selecione um aluno primeiro');
      return;
    }
    if (step === 2 && !selectedPeriodization) {
      toast.error('Selecione uma periodização');
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const selectedStudentData = students.find(s => s.id === selectedStudent);
  const selectedPeriodData = periodizations.find(p => p.id === selectedPeriodization);
  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Gerador de Planos de Treino</h1>
        <div className="flex items-center justify-center space-x-4 mb-6">
          <div className={`flex items-center ${step >= 1 ? 'text-orange-600' : 'text-gray-400'}`}>
            <Users className="w-5 h-5 mr-2" />
            <span>1. Aluno</span>
          </div>
          <div className={`flex items-center ${step >= 2 ? 'text-orange-600' : 'text-gray-400'}`}>
            <Upload className="w-5 h-5 mr-2" />
            <span>2. Periodização</span>
          </div>
          <div className={`flex items-center ${step >= 3 ? 'text-orange-600' : 'text-gray-400'}`}>
            <Target className="w-5 h-5 mr-2" />
            <span>3. Modelo</span>
          </div>
          <div className={`flex items-center ${step >= 4 ? 'text-orange-600' : 'text-gray-400'}`}>
            <Calendar className="w-5 h-5 mr-2" />
            <span>4. Finalizar</span>
          </div>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Selecionar Aluno
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Escolha o aluno para criar o plano de treino:</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.nome} - {student.objetivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedStudentData && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium">Informações do Aluno:</h4>
                <p><strong>Nome:</strong> {selectedStudentData.nome}</p>
                <p><strong>Email:</strong> {selectedStudentData.email}</p>
                <p><strong>Objetivo:</strong> {selectedStudentData.objetivo}</p>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button onClick={nextStep} disabled={!selectedStudent}>
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Selecionar Periodização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Escolha a periodização para o plano:</Label>
              <Select value={selectedPeriodization} onValueChange={setSelectedPeriodization}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma periodização" />
                </SelectTrigger>
                <SelectContent>
                  {periodizations.map(period => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.title} - Fase: {period.current_phase}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPeriodData && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium">Informações da Periodização:</h4>
                <p><strong>Título:</strong> {selectedPeriodData.title}</p>
                <p><strong>Fase Atual:</strong> {selectedPeriodData.current_phase}</p>
                {selectedPeriodData.periodization_data?.phases && (
                  <p><strong>Total de Fases:</strong> {selectedPeriodData.periodization_data.phases.length}</p>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Voltar
              </Button>
              <Button onClick={nextStep} disabled={!selectedPeriodization}>
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Selecionar Modelo de Treino
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Escolha o modelo de treino baseado na periodização:</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate === template.id 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <h4 className="font-medium">{template.name}</h4>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{template.phase}</Badge>
                      <Badge variant="outline">{template.goal}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {template.exercise_count} exercícios por treino
                    </p>
                    {template.template_data && (
                      <div className="text-xs text-gray-500 mt-1">
                        Series: {template.template_data.sets_range} | 
                        Reps: {template.template_data.reps_range} | 
                        Descanso: {template.template_data.rest_time}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Voltar
              </Button>
              <Button onClick={nextStep} disabled={!selectedTemplate}>
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Confirmar e Gerar Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">Aluno Selecionado</h4>
                <p className="text-sm">{selectedStudentData?.nome}</p>
                <p className="text-xs text-gray-600">{selectedStudentData?.objetivo}</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium mb-2">Periodização</h4>
                <p className="text-sm">{selectedPeriodData?.title}</p>
                <p className="text-xs text-gray-600">Fase: {selectedPeriodData?.current_phase}</p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium mb-2">Modelo de Treino</h4>
                <p className="text-sm">{selectedTemplateData?.name}</p>
                <p className="text-xs text-gray-600">{selectedTemplateData?.exercise_count} exercícios</p>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium mb-2">O que será criado:</h4>
              <ul className="text-sm space-y-1">
                <li>• Treinos personalizados baseados na periodização</li>
                <li>• Exercícios selecionados automaticamente do banco de dados</li>
                <li>• Plano estruturado por semanas e fases</li>
                <li>• Acesso via web app e mobile para o aluno</li>
              </ul>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Voltar
              </Button>
              <Button 
                onClick={generateWorkoutPlan} 
                disabled={generating}
                className="bg-green-600 hover:bg-green-700"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Gerando Plano...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar Plano de Treino
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
