
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { WorkoutPlan } from "@/types/workout";

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
    
    if (selectedFile.type !== 'application/pdf') {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos PDF.",
        variant: "destructive"
      });
      return;
    }
    
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
    return {
      nome: "Treino Hipertrofia A/B",
      objetivo: "Ganho de massa muscular",
      dias: [
        {
          dia: "Segunda-feira - Treino A",
          blocos: [
            {
              tipo: "Aquecimento",
              exercicios: [
                {
                  nome: "Esteira leve",
                  series: "1",
                  repeticoes: "5 min"
                },
                {
                  nome: "Mobilidade articular",
                  series: "1",
                  repeticoes: "5 min"
                }
              ]
            },
            {
              tipo: "Principal",
              exercicios: [
                {
                  nome: "Agachamento Livre",
                  series: "4",
                  repeticoes: "8-10",
                  carga: "80kg",
                  cadencia: "3-1-1",
                  rir: "2"
                },
                {
                  nome: "Leg Press 45°",
                  series: "3",
                  repeticoes: "12-15",
                  carga: "120kg",
                  rir: "1"
                },
                {
                  nome: "Extensora",
                  series: "4",
                  repeticoes: "12-15",
                  carga: "50kg",
                  rir: "2"
                },
                {
                  nome: "Mesa Flexora",
                  series: "4",
                  repeticoes: "10-12",
                  carga: "40kg",
                  rir: "2"
                },
                {
                  nome: "Stiff com Halteres",
                  series: "3",
                  repeticoes: "12-15",
                  carga: "20kg",
                  cadencia: "2-1-2"
                },
                {
                  nome: "Panturrilha em Pé",
                  series: "4",
                  repeticoes: "15-20",
                  carga: "60kg",
                  rir: "1"
                }
              ]
            },
            {
              tipo: "Finalização",
              exercicios: [
                {
                  nome: "Bicicleta ergométrica",
                  series: "1",
                  repeticoes: "10 min"
                },
                {
                  nome: "Alongamento",
                  series: "1",
                  repeticoes: "5 min"
                }
              ]
            }
          ]
        },
        {
          dia: "Terça-feira - Treino B",
          blocos: [
            {
              tipo: "Aquecimento",
              exercicios: [
                {
                  nome: "Esteira leve",
                  series: "1",
                  repeticoes: "5 min"
                },
                {
                  nome: "Aquecimento específico",
                  series: "1",
                  repeticoes: "5 min"
                }
              ]
            },
            {
              tipo: "Principal",
              exercicios: [
                {
                  nome: "Supino Reto",
                  series: "4",
                  repeticoes: "8-10",
                  carga: "70kg",
                  cadencia: "2-1-2",
                  rir: "2"
                },
                {
                  nome: "Supino Inclinado",
                  series: "3",
                  repeticoes: "10-12",
                  carga: "60kg",
                  rir: "1"
                },
                {
                  nome: "Voador",
                  series: "3",
                  repeticoes: "12-15",
                  carga: "40kg",
                  rir: "2"
                },
                {
                  nome: "Desenvolvimento",
                  series: "4",
                  repeticoes: "8-10",
                  carga: "45kg",
                  rir: "2"
                },
                {
                  nome: "Elevação Lateral",
                  series: "4",
                  repeticoes: "12-15",
                  carga: "12kg",
                  rir: "1"
                },
                {
                  nome: "Tríceps Testa",
                  series: "3",
                  repeticoes: "10-12",
                  carga: "30kg",
                  rir: "2"
                },
                {
                  nome: "Tríceps Corda",
                  series: "3",
                  repeticoes: "12-15",
                  carga: "25kg",
                  rir: "1"
                }
              ]
            },
            {
              tipo: "Finalização",
              exercicios: [
                {
                  nome: "Abdominal",
                  series: "3",
                  repeticoes: "20"
                },
                {
                  nome: "Alongamento",
                  series: "1",
                  repeticoes: "5 min"
                }
              ]
            }
          ]
        },
        {
          dia: "Quinta-feira - Treino A",
          blocos: [
            {
              tipo: "Aquecimento",
              exercicios: [
                {
                  nome: "Esteira leve",
                  series: "1",
                  repeticoes: "5 min"
                }
              ]
            },
            {
              tipo: "Principal",
              exercicios: [
                {
                  nome: "Agachamento Livre",
                  series: "4",
                  repeticoes: "8-10",
                  carga: "85kg",
                  cadencia: "3-1-1",
                  rir: "2"
                },
                {
                  nome: "Leg Press 45°",
                  series: "3",
                  repeticoes: "12-15",
                  carga: "140kg",
                  metodo: "Drop-set",
                  rir: "0"
                },
                {
                  nome: "Extensora",
                  series: "4",
                  repeticoes: "12-15",
                  carga: "55kg",
                  rir: "1"
                },
                {
                  nome: "Mesa Flexora",
                  series: "4",
                  repeticoes: "10-12",
                  carga: "45kg",
                  rir: "2"
                },
                {
                  nome: "Stiff com Barra",
                  series: "4",
                  repeticoes: "10-12",
                  carga: "50kg",
                  cadencia: "3-1-2"
                }
              ]
            },
            {
              tipo: "Finalização",
              exercicios: [
                {
                  nome: "Panturrilha Sentado",
                  series: "4",
                  repeticoes: "15-20",
                  carga: "30kg"
                }
              ]
            }
          ]
        },
        {
          dia: "Sexta-feira - Treino B",
          blocos: [
            {
              tipo: "Aquecimento",
              exercicios: [
                {
                  nome: "Esteira leve",
                  series: "1",
                  repeticoes: "5 min"
                }
              ]
            },
            {
              tipo: "Principal",
              exercicios: [
                {
                  nome: "Puxada Frontal",
                  series: "4",
                  repeticoes: "8-10",
                  carga: "60kg",
                  rir: "2"
                },
                {
                  nome: "Remada Curvada",
                  series: "4",
                  repeticoes: "8-10",
                  carga: "55kg",
                  rir: "2"
                },
                {
                  nome: "Remada Sentada",
                  series: "3",
                  repeticoes: "10-12",
                  carga: "50kg",
                  rir: "1"
                },
                {
                  nome: "Rosca Direta",
                  series: "4",
                  repeticoes: "10-12",
                  carga: "25kg",
                  rir: "2"
                },
                {
                  nome: "Rosca Martelo",
                  series: "3",
                  repeticoes: "12-15",
                  carga: "15kg",
                  rir: "1"
                },
                {
                  nome: "Rosca Concentrada",
                  series: "3",
                  repeticoes: "12-15",
                  carga: "12kg",
                  rir: "1"
                }
              ]
            },
            {
              tipo: "Finalização",
              exercicios: [
                {
                  nome: "Abdominal Prancha",
                  series: "3",
                  repeticoes: "45s"
                }
              ]
            }
          ]
        }
      ]
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
                {generatedWorkout.dias.map((dia, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium text-orange-600 mb-2">
                      {dia.dia}
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      {dia.blocos.map((bloco, bIndex) => (
                        <div key={bIndex}>
                          <span className="font-medium">{bloco.tipo}:</span> {bloco.exercicios.length} exercícios
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => {
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
