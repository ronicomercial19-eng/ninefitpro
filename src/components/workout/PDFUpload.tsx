import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface Exercise {
  nome: string;
  series: number;
  reps: string;
  descanso: string;
  observacoes?: string;
}

interface WorkoutDay {
  grupo: string;
  exercicios: Exercise[];
}

interface WorkoutPlan {
  nome?: string;
  objetivo?: string;
  [key: string]: WorkoutDay | string | undefined;
}

export const PDFUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatedWorkout, setGeneratedWorkout] = useState<WorkoutPlan | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'reading' | 'generating' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    
    if (!selectedFile) return;
    
    // Validação de tipo
    if (selectedFile.type !== 'application/pdf') {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos PDF.",
        variant: "destructive"
      });
      return;
    }
    
    // Validação de tamanho (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O PDF é muito grande. Envie um arquivo de até 5MB.",
        variant: "destructive"
      });
      return;
    }
    
    setFile(selectedFile);
    setStatus('idle');
  };

  const simulateWorkoutGeneration = (): WorkoutPlan => {
    // Simulação de um treino mais completo com mais exercícios
    return {
      nome: "Treino Completo de Hipertrofia",
      objetivo: "Ganho de massa muscular e força",
      segunda: {
        grupo: "Peito, Ombros e Tríceps",
        exercicios: [
          {
            nome: "Supino Reto com Barra",
            series: 4,
            reps: "6-8",
            descanso: "2-3min",
            observacoes: "Controle total na descida, pausa no peito"
          },
          {
            nome: "Supino Inclinado com Halteres",
            series: 4,
            reps: "8-10",
            descanso: "90s",
            observacoes: "Amplitude completa, foco na contração"
          },
          {
            nome: "Supino Declinado",
            series: 3,
            reps: "10-12",
            descanso: "75s"
          },
          {
            nome: "Voador no Peck Deck",
            series: 3,
            reps: "12-15",
            descanso: "60s",
            observacoes: "Movimento controlado, foco na contração"
          },
          {
            nome: "Desenvolvimento com Halteres",
            series: 4,
            reps: "8-10",
            descanso: "90s"
          },
          {
            nome: "Elevação Lateral",
            series: 4,
            reps: "12-15",
            descanso: "45s"
          },
          {
            nome: "Elevação Frontal",
            series: 3,
            reps: "12-15",
            descanso: "45s"
          },
          {
            nome: "Tríceps Testa com Barra W",
            series: 4,
            reps: "10-12",
            descanso: "75s"
          },
          {
            nome: "Tríceps Corda no Pulley",
            series: 3,
            reps: "12-15",
            descanso: "60s"
          },
          {
            nome: "Mergulho no Paralelo",
            series: 3,
            reps: "8-12",
            descanso: "90s"
          }
        ]
      },
      terca: {
        grupo: "Costas e Bíceps",
        exercicios: [
          {
            nome: "Barra Fixa (ou Puxada)",
            series: 4,
            reps: "6-10",
            descanso: "2min",
            observacoes: "Amplitude completa, ativar latíssimo"
          },
          {
            nome: "Remada Curvada com Barra",
            series: 4,
            reps: "8-10",
            descanso: "90s"
          },
          {
            nome: "Puxada Frontal Pegada Aberta",
            series: 4,
            reps: "10-12",
            descanso: "75s"
          },
          {
            nome: "Remada Sentada no Cabo",
            series: 4,
            reps: "10-12",
            descanso: "75s"
          },
          {
            nome: "Remada Unilateral com Halter",
            series: 3,
            reps: "12-15",
            descanso: "60s"
          },
          {
            nome: "Pullover com Halter",
            series: 3,
            reps: "12-15",
            descanso: "60s"
          },
          {
            nome: "Rosca Direta com Barra",
            series: 4,
            reps: "8-10",
            descanso: "75s"
          },
          {
            nome: "Rosca Alternada com Halteres",
            series: 4,
            reps: "10-12",
            descanso: "60s"
          },
          {
            nome: "Rosca Martelo",
            series: 3,
            reps: "12-15",
            descanso: "45s"
          },
          {
            nome: "Rosca no Cabo",
            series: 3,
            reps: "12-15",
            descanso: "45s"
          }
        ]
      },
      quarta: {
        grupo: "Pernas Completo",
        exercicios: [
          {
            nome: "Agachamento Livre",
            series: 5,
            reps: "6-8",
            descanso: "3min",
            observacoes: "Profundidade completa, core ativado"
          },
          {
            nome: "Leg Press 45°",
            series: 4,
            reps: "12-15",
            descanso: "90s"
          },
          {
            nome: "Agachamento Búlgaro",
            series: 3,
            reps: "10-12",
            descanso: "75s"
          },
          {
            nome: "Extensora",
            series: 4,
            reps: "12-15",
            descanso: "60s"
          },
          {
            nome: "Mesa Flexora",
            series: 4,
            reps: "10-12",
            descanso: "75s"
          },
          {
            nome: "Stiff com Halteres",
            series: 4,
            reps: "10-12",
            descanso: "90s"
          },
          {
            nome: "Elevação Pélvica",
            series: 3,
            reps: "15-20",
            descanso: "60s"
          },
          {
            nome: "Panturrilha em Pé",
            series: 5,
            reps: "15-20",
            descanso: "45s"
          },
          {
            nome: "Panturrilha Sentado",
            series: 4,
            reps: "15-20",
            descanso: "45s"
          }
        ]
      },
      quinta: {
        grupo: "Peito, Ombros e Tríceps",
        exercicios: [
          {
            nome: "Supino Inclinado com Barra",
            series: 4,
            reps: "6-8",
            descanso: "2-3min"
          },
          {
            nome: "Supino Reto com Halteres",
            series: 4,
            reps: "8-10",
            descanso: "90s"
          },
          {
            nome: "Crucifixo Inclinado",
            series: 3,
            reps: "10-12",
            descanso: "75s"
          },
          {
            nome: "Crossover no Cabo",
            series: 3,
            reps: "12-15",
            descanso: "60s"
          },
          {
            nome: "Desenvolvimento Militar",
            series: 4,
            reps: "8-10",
            descanso: "90s"
          },
          {
            nome: "Elevação Lateral na Polia",
            series: 4,
            reps: "12-15",
            descanso: "45s"
          },
          {
            nome: "Elevação Posterior",
            series: 3,
            reps: "12-15",
            descanso: "45s"
          },
          {
            nome: "Tríceps Francês",
            series: 4,
            reps: "10-12",
            descanso: "75s"
          },
          {
            nome: "Tríceps Supinado",
            series: 3,
            reps: "12-15",
            descanso: "60s"
          }
        ]
      },
      sexta: {
        grupo: "Costas e Bíceps",
        exercicios: [
          {
            nome: "Levantamento Terra",
            series: 4,
            reps: "5-6",
            descanso: "3min",
            observacoes: "Técnica perfeita, core ativado"
          },
          {
            nome: "Puxada Triangular",
            series: 4,
            reps: "8-10",
            descanso: "90s"
          },
          {
            nome: "Remada Alta",
            series: 4,
            reps: "10-12",
            descanso: "75s"
          },
          {
            nome: "Remada T",
            series: 3,
            reps: "10-12",
            descanso: "75s"
          },
          {
            nome: "Encolhimento com Halteres",
            series: 4,
            reps: "12-15",
            descanso: "60s"
          },
          {
            nome: "Rosca 21",
            series: 3,
            reps: "21 (7+7+7)",
            descanso: "90s"
          },
          {
            nome: "Rosca Concentrada",
            series: 3,
            reps: "10-12",
            descanso: "60s"
          },
          {
            nome: "Rosca Inversa",
            series: 3,
            reps: "12-15",
            descanso: "45s"
          }
        ]
      }
    };
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setStatus('uploading');
    setUploadProgress(0);

    try {
      // Simular upload com progresso
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(i);
      }

      setStatus('reading');
      await new Promise(resolve => setTimeout(resolve, 2000));

      setStatus('generating');
      await new Promise(resolve => setTimeout(resolve, 3000));

      const generatedData = simulateWorkoutGeneration();
      setGeneratedWorkout(generatedData);
      setStatus('success');
      
      toast({
        title: "Sucesso!",
        description: "Treino gerado com sucesso a partir do PDF.",
      });
    } catch (error) {
      console.error('Erro:', error);
      setStatus('error');
      toast({
        title: "Erro",
        description: "Erro ao processar o PDF. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'uploading':
        return "Enviando arquivo...";
      case 'reading':
        return "Lendo arquivo...";
      case 'generating':
        return "Gerando treino com IA...";
      case 'success':
        return "Treino gerado com sucesso!";
      case 'error':
        return "Erro ao processar arquivo";
      default:
        return "";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload de Periodização (PDF)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload"
              disabled={loading}
            />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <p className="text-lg font-medium text-gray-700 mb-2">
                Clique para selecionar ou arraste seu PDF
              </p>
              <p className="text-sm text-gray-500">
                Envie sua periodização em PDF para gerar o treino personalizado
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Máximo 5MB • Apenas arquivos PDF
              </p>
            </label>
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-orange-500" />
                <div>
                  <span className="text-sm font-medium">{file.name}</span>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              {!loading && (
                <Button onClick={() => setFile(null)} variant="outline" size="sm">
                  Remover
                </Button>
              )}
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {getStatusIcon()}
                <span>{getStatusMessage()}</span>
              </div>
              {status === 'uploading' && (
                <Progress value={uploadProgress} className="w-full" />
              )}
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Gerar Treino com IA'
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedWorkout && status === 'success' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Treino Gerado com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{generatedWorkout.nome}</h3>
                <p className="text-gray-600">{generatedWorkout.objetivo}</p>
              </div>
              
              <div className="grid gap-4">
                {Object.entries(generatedWorkout).map(([day, dayData]) => {
                  if (day === 'nome' || day === 'objetivo') return null;
                  
                  const workoutDay = dayData as WorkoutDay;
                  
                  return (
                    <div key={day} className="border rounded-lg p-4">
                      <h4 className="font-medium text-orange-600 mb-2">
                        {day.charAt(0).toUpperCase() + day.slice(1)} - {workoutDay.grupo}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {workoutDay.exercicios.length} exercícios
                      </p>
                    </div>
                  );
                })}
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => {
                  // Aqui você redirecionaria para a visualização completa
                  console.log('Visualizar treino completo', generatedWorkout);
                }}
              >
                Visualizar Treino Completo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
