
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Calendar, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PeriodizationPhase {
  phase_number: number;
  name: string;
  duration_weeks: number;
  objective: string;
  volume_level: string;
  intensity_level: string;
  key_exercises: string[];
}

export const PeriodizationUpload = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [interpretedData, setInterpretedData] = useState<{
    phases: PeriodizationPhase[];
    total_duration: number;
    main_objective: string;
  } | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setUploadedFile(file);

    try {
      // Simulate AI interpretation of the periodization file
      const interpretedData = await simulateAIInterpretation(file);
      
      // Save to database
      const { error } = await supabase
        .from('periodization_uploads')
        .insert({
          user_id: user.id,
          file_name: file.name,
          interpreted_data: interpretedData,
          phases: interpretedData.phases,
          current_phase: 1
        });

      if (error) throw error;

      setInterpretedData(interpretedData);
      toast.success('Periodização interpretada com sucesso!');
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const simulateAIInterpretation = async (file: File): Promise<any> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock interpretation based on file type
    return {
      total_duration: 16,
      main_objective: "Hipertrofia e Força",
      phases: [
        {
          phase_number: 1,
          name: "Adaptação Anatômica",
          duration_weeks: 4,
          objective: "Preparação muscular e articular para cargas maiores",
          volume_level: "Alto",
          intensity_level: "Baixa-Moderada",
          key_exercises: ["Agachamento", "Supino", "Remada", "Desenvolvimento"]
        },
        {
          phase_number: 2,
          name: "Hipertrofia",
          duration_weeks: 6,
          objective: "Maximizar ganho de massa muscular",
          volume_level: "Alto",
          intensity_level: "Moderada",
          key_exercises: ["Agachamento", "Leg Press", "Supino Inclinado", "Remada Curvada"]
        },
        {
          phase_number: 3,
          name: "Força Máxima",
          duration_weeks: 4,
          objective: "Desenvolver força máxima",
          volume_level: "Baixo",
          intensity_level: "Alta",
          key_exercises: ["Agachamento Livre", "Supino Reto", "Levantamento Terra"]
        },
        {
          phase_number: 4,
          name: "Transição/Regeneração",
          duration_weeks: 2,
          objective: "Recuperação ativa e manutenção",
          volume_level: "Baixo",
          intensity_level: "Baixa",
          key_exercises: ["Exercícios funcionais", "Mobilidade", "Cardio leve"]
        }
      ]
    };
  };

  const getCurrentPhaseProgress = () => {
    if (!interpretedData) return 0;
    
    const currentWeek = 3; // This would come from actual tracking
    const totalWeeks = interpretedData.total_duration;
    return (currentWeek / totalWeeks) * 100;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Periodização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="periodization-file">
                Arquivo de Periodização (PDF, Excel, CSV)
              </Label>
              <Input
                id="periodization-file"
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="mt-1"
              />
            </div>
            
            {uploading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                <span>Processando e interpretando arquivo...</span>
              </div>
            )}
            
            {uploadedFile && !uploading && (
              <div className="flex items-center gap-2 text-green-600">
                <FileText className="w-4 h-4" />
                <span>Arquivo carregado: {uploadedFile.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {interpretedData && (
        <>
          {/* Periodization Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Visão Geral da Periodização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {interpretedData.total_duration}
                  </div>
                  <div className="text-sm text-gray-600">Semanas Totais</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {interpretedData.phases.length}
                  </div>
                  <div className="text-sm text-gray-600">Fases</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-orange-600">
                    {interpretedData.main_objective}
                  </div>
                  <div className="text-sm text-gray-600">Objetivo Principal</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso Geral</span>
                  <span>Semana 3 de {interpretedData.total_duration}</span>
                </div>
                <Progress value={getCurrentPhaseProgress()} className="w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Phases Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Fases da Periodização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interpretedData.phases.map((phase, index) => (
                  <Card key={phase.phase_number} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">
                            Fase {phase.phase_number}: {phase.name}
                          </h3>
                          <p className="text-gray-600">{phase.objective}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {phase.duration_weeks} semanas
                          </Badge>
                          {index === 0 && (
                            <Badge className="ml-2 bg-green-500">Atual</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Volume: </span>
                          <Badge variant="secondary">{phase.volume_level}</Badge>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">Intensidade: </span>
                          <Badge variant="secondary">{phase.intensity_level}</Badge>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-700 block mb-2">
                          Exercícios Principais:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {phase.key_exercises.map(exercise => (
                            <Badge key={exercise} variant="outline" className="text-xs">
                              {exercise}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Integration Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Integração com IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Como a IA usará sua periodização:</h4>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Treinos serão gerados respeitando a fase atual</li>
                  <li>• Volume e intensidade ajustados automaticamente</li>
                  <li>• Exercícios priorizados conforme o plano</li>
                  <li>• Progressão automática entre as fases</li>
                  <li>• Adaptações baseadas no seu perfil e limitações</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
