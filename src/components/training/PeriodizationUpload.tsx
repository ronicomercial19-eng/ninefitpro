
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Brain, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PeriodizationData {
  id: string;
  title: string;
  periodization_data: any;
  current_phase: string;
  created_at: string;
}

export const PeriodizationUpload = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<PeriodizationData[]>([]);

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

  const uploadFile = async () => {
    if (!file || !user) return;

    setUploading(true);
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('exercicios')
        .upload(`periodizations/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('exercicios')
        .getPublicUrl(`periodizations/${fileName}`);

      // Save file record with mock AI interpretation
      const mockInterpretation = await interpretPeriodization(file);
      
      const { data, error } = await supabase
        .from('periodizations')
        .insert({
          user_id: user.id,
          professor_id: user.id, // Using user as professor for now
          title: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          periodization_data: mockInterpretation,
          current_phase: 'Fase 1'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Periodização enviada e interpretada com sucesso!');
      setFile(null);
      fetchUploadedFiles();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const interpretPeriodization = async (file: File): Promise<any> => {
    setInterpreting(true);
    
    // Mock AI interpretation - In reality, this would use AI to parse the file
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
    
    setInterpreting(false);
    
    return {
      type: 'linear_periodization',
      duration_weeks: 12,
      phases: [
        {
          name: 'Adaptação Anatômica',
          weeks: 4,
          focus: 'Volume alto, intensidade baixa',
          sets_range: '3-4',
          reps_range: '12-15',
          load: '60-70%',
          objectives: ['Preparação muscular', 'Técnica', 'Capacidade aeróbica']
        },
        {
          name: 'Hipertrofia',
          weeks: 4,
          focus: 'Volume moderado-alto, intensidade moderada',
          sets_range: '3-5',
          reps_range: '8-12',
          load: '70-80%',
          objectives: ['Ganho de massa muscular', 'Aumento de força']
        },
        {
          name: 'Força Máxima',
          weeks: 4,
          focus: 'Volume baixo, intensidade alta',
          sets_range: '4-6',
          reps_range: '3-6',
          load: '80-95%',
          objectives: ['Força máxima', 'Potência', 'Coordenação neuromuscular']
        }
      ],
      training_variables: {
        frequency: '4-5x/semana',
        session_duration: '60-90min',
        equipment: ['Barra', 'Halteres', 'Máquinas']
      }
    };
  };

  const fetchUploadedFiles = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('periodizations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUploadedFiles(data || []);
    } catch (error) {
      console.error('Erro ao buscar arquivos:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Periodização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Selecionar Arquivo</Label>
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
                <Badge variant="outline">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
              </div>
              <Button 
                onClick={uploadFile} 
                disabled={uploading || interpreting}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Enviando...
                  </>
                ) : interpreting ? (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Interpretando...
                  </>
                ) : (
                  'Enviar e Interpretar'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      <Card>
        <CardHeader>
          <CardTitle>Periodizações Interpretadas</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedFiles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhuma periodização enviada ainda
            </p>
          ) : (
            <div className="space-y-4">
              {uploadedFiles.map(periodization => (
                <Card key={periodization.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {periodization.title}
                      </h3>
                      <Badge className="bg-green-500">
                        {periodization.current_phase}
                      </Badge>
                    </div>
                    
                    {periodization.periodization_data && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Tipo:</span>
                            <p className="capitalize">{periodization.periodization_data.type?.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <span className="font-medium">Duração:</span>
                            <p>{periodization.periodization_data.duration_weeks} semanas</p>
                          </div>
                          <div>
                            <span className="font-medium">Fases:</span>
                            <p>{periodization.periodization_data.phases?.length || 0} fases</p>
                          </div>
                        </div>
                        
                        {periodization.periodization_data.phases && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Fases da Periodização:</h4>
                            <div className="space-y-2">
                              {periodization.periodization_data.phases.map((phase: any, index: number) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium">{phase.name}</h5>
                                    <Badge variant="outline">{phase.weeks} semanas</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{phase.focus}</p>
                                  <div className="flex gap-4 text-xs">
                                    <span><strong>Séries:</strong> {phase.sets_range}</span>
                                    <span><strong>Reps:</strong> {phase.reps_range}</span>
                                    <span><strong>Carga:</strong> {phase.load}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-3">
                      Enviado em {new Date(periodization.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
