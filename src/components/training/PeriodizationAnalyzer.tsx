import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Brain, CheckCircle, Users, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Student {
  id: string;
  nome: string;
  email: string;
  objetivo: string;
  nivel_experiencia: string;
}

interface PeriodizationModel {
  id: string;
  name: string;
  type: string;
  duration_weeks: number;
  phases: any[];
}

export const PeriodizationAnalyzer = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [availableModels, setAvailableModels] = useState<PeriodizationModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showStudentSelection, setShowStudentSelection] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStudents();
      fetchAvailableModels();
    }
  }, [user]);

  const fetchStudents = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('professor_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      toast.error('Erro ao carregar alunos');
    }
  };

  const fetchAvailableModels = async () => {
    // Modelos virão do Supabase quando implementado
    const models: PeriodizationModel[] = [];
    setAvailableModels(models);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
      } else {
        toast.error('Formato de arquivo não suportado. Use PDF, Excel ou CSV.');
      }
    }
  };

  const analyzePeriodization = async () => {
    if (!file) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    setAnalyzing(true);
    try {
      // Análise será feita com IA (Lovable AI Gateway)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Placeholder - implementar análise real
      toast.info('Análise de periodização será implementada com IA');
      
      const analysisResult = {
        detected_type: 'undulating',
        confidence: 0.85,
        duration_weeks: 12,
        phases: []
      };

      setAnalysisResult(analysisResult);
      setShowStudentSelection(true);
      toast.success('Análise concluída! Selecione o aluno para aplicar a periodização.');
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error('Erro ao analisar periodização');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateWorkoutPlan = async () => {
    if (!selectedStudent || !selectedModel || !analysisResult) {
      toast.error('Selecione o aluno e o modelo');
      return;
    }

    setUploading(true);
    try {
      // Upload do arquivo
      const fileExt = file?.name.split('.').pop();
      const fileName = `${user?.id}_${selectedStudent}_${Date.now()}.${fileExt}`;
      
      let fileUrl = null;
      if (file) {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('exercicios')
          .upload(`periodizations/${fileName}`, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('exercicios')
          .getPublicUrl(`periodizations/${fileName}`);
        
        fileUrl = urlData.publicUrl;
      }

      // Salvar periodização no banco
      const { data: periodizationData, error: periodizationError } = await supabase
        .from('periodizations')
        .insert({
          user_id: selectedStudent,
          professor_id: user?.id,
          title: `Periodização ${analysisResult.detected_type} - ${students.find(s => s.id === selectedStudent)?.nome}`,
          file_url: fileUrl,
          file_type: file?.type,
          periodization_data: {
            ...analysisResult,
            model_used: selectedModel,
            generated_at: new Date().toISOString()
          },
          current_phase: analysisResult.phases_detected[0]?.name || 'Base'
        })
        .select()
        .single();

      if (periodizationError) throw periodizationError;

      // Gerar treinos baseados no modelo
      await generateWorkoutsFromModel(periodizationData.id, selectedModel, analysisResult);

      toast.success('Periodização criada e treinos gerados com sucesso!');
      
      // Reset do formulário
      setFile(null);
      setSelectedStudent("");
      setSelectedModel("");
      setAnalysisResult(null);
      setShowStudentSelection(false);
      
    } catch (error) {
      console.error('Erro ao gerar plano:', error);
      toast.error('Erro ao gerar plano de treinos');
    } finally {
      setUploading(false);
    }
  };

  const generateWorkoutsFromModel = async (periodizationId: string, modelId: string, analysis: any) => {
    const selectedModelData = availableModels.find(m => m.id === modelId);
    if (!selectedModelData) return;

    // Buscar exercícios do banco
    const { data: exercises } = await supabase
      .from('exercises')
      .select('*');

    const workoutsToInsert = [];

    // Gerar treinos para cada semana/fase
    for (let week = 1; week <= analysis.duration_weeks; week++) {
      const currentPhase = getCurrentPhase(week, analysis.phases_detected);
      
      // 3 treinos por semana
      for (let day = 1; day <= 3; day++) {
        const workoutExercises = selectExercisesForWorkout(exercises || [], currentPhase, analysis.methods_identified);
        
        workoutsToInsert.push({
          periodization_id: periodizationId,
          student_id: selectedStudent,
          week_number: week,
          day_number: day,
          phase: currentPhase.name.toLowerCase(),
          exercises: workoutExercises,
          method: analysis.methods_identified[Math.floor(Math.random() * analysis.methods_identified.length)],
          status: 'pending'
        });
      }
    }

    // Inserir treinos no banco
    const { error } = await supabase
      .from('workouts')
      .insert(workoutsToInsert);

    if (error) throw error;
  };

  const getCurrentPhase = (week: number, phases: any[]) => {
    let totalWeeks = 0;
    for (const phase of phases) {
      totalWeeks += phase.weeks;
      if (week <= totalWeeks) {
        return phase;
      }
    }
    return phases[phases.length - 1];
  };

  const selectExercisesForWorkout = (exercises: any[], phase: any, methods: string[]) => {
    // Lógica para selecionar exercícios baseados na fase e métodos
    const phaseMapping: any = {
      'base': 'base',
      'intensificação': 'intensification',
      'realização': 'peaking',
      'deload': 'recovery'
    };

    const filteredExercises = exercises.filter(ex => 
      ex.phase === phaseMapping[phase.name.toLowerCase()] || ex.phase === 'base'
    );

    // Selecionar 4-6 exercícios aleatórios
    const selectedCount = Math.floor(Math.random() * 3) + 4; // 4-6 exercícios
    const shuffled = filteredExercises.sort(() => 0.5 - Math.random());
    
    return shuffled.slice(0, selectedCount).map((ex: any) => ({
      id: ex.id,
      name: ex.name,
      sets: Math.floor(Math.random() * 3) + 3, // 3-5 séries
      reps: getRepsByPhase(phase.name),
      rest_seconds: getRestByPhase(phase.name),
      notes: ex.instructions || ''
    }));
  };

  const getRepsByPhase = (phaseName: string) => {
    const phaseReps: any = {
      'Base': '12-15',
      'Intensificação': '6-8',
      'Realização': '1-3',
      'Deload': '15-20'
    };
    return phaseReps[phaseName] || '8-12';
  };

  const getRestByPhase = (phaseName: string) => {
    const phaseRest: any = {
      'Base': 60,
      'Intensificação': 120,
      'Realização': 180,
      'Deload': 45
    };
    return phaseRest[phaseName] || 90;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Análise Inteligente de Periodização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Upload da Periodização</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Formatos aceitos: PDF, Excel, CSV
            </p>
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <Button 
                onClick={analyzePeriodization} 
                disabled={analyzing}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </div>
          )}

          {analysisResult && (
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <h3 className="font-semibold">Análise Concluída</h3>
                  <Badge className="bg-green-500">
                    {Math.round(analysisResult.confidence * 100)}% de confiança
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Tipo Detectado:</span>
                    <p className="capitalize">{analysisResult.detected_type.replace('_', ' ')}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium">Duração:</span>
                    <p>{analysisResult.duration_weeks} semanas</p>
                  </div>

                  <div>
                    <span className="font-medium">Fases Identificadas:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {analysisResult.phases_detected.map((phase: any, index: number) => (
                        <Badge key={index} variant="outline">
                          {phase.name} ({phase.weeks}sem)
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium">Métodos Identificados:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {analysisResult.methods_identified.map((method: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showStudentSelection && (
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Aplicar Periodização
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Selecionar Aluno</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha o aluno" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.nome} - {student.objetivo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Modelo de Treino</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels
                          .filter(model => model.type === analysisResult?.detected_type)
                          .map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} ({model.duration_weeks} semanas)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={generateWorkoutPlan}
                  disabled={!selectedStudent || !selectedModel || uploading}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Gerando Treinos...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      Gerar Plano Completo
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
