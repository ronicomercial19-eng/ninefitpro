import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dumbbell, Plus, Eye, Edit, Trash2, Calendar, Upload, FileText, Sparkles, Globe, Code2, Wrench, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrainingContentUpload } from "@/components/students/TrainingContentUpload";
import { HTMLTemplateManager } from "@/components/students/HTMLTemplateManager";
import { CreateWorkoutForm } from "@/components/students/CreateWorkoutForm";
import { PeriodizationAssignDialog } from "@/components/students/PeriodizationAssignDialog";
import { SovereignOverridePanel } from "@/components/students/SovereignOverridePanel";
interface Student {
  id: string;
  nome: string;
}

interface TrainingAssignment {
  id: string;
  training_name: string;
  training_data: any;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  training_type?: string;
  training_description?: string;
  html_file_url?: string;
  html_file_path?: string;
}

interface StudentTrainingProps {
  student: Student;
  onStudentUpdate: (updatedData: any) => void;
}

export function StudentTraining({ student, onStudentUpdate }: StudentTrainingProps) {
  const [trainings, setTrainings] = useState<TrainingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHTMLUpload, setShowHTMLUpload] = useState(false);
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);
  const [showPeriodization, setShowPeriodization] = useState(false);
  const [selectedHTMLTraining, setSelectedHTMLTraining] = useState<TrainingAssignment | null>(null);

  useEffect(() => {
    fetchTrainings();
  }, [student.id]);

  const fetchTrainings = async () => {
    try {
      const { data, error } = await supabase
        .from('student_training_assignments')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTrainings(data || []);
    } catch (error) {
      console.error('Erro ao buscar treinos:', error);
      toast.error('Erro ao carregar treinos');
    } finally {
      setLoading(false);
    }
  };

  const toggleTrainingStatus = async (trainingId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('student_training_assignments')
        .update({ is_active: !currentStatus })
        .eq('id', trainingId);

      if (error) throw error;

      setTrainings(trainings.map(training =>
        training.id === trainingId
          ? { ...training, is_active: !currentStatus }
          : training
      ));

      toast.success(`Treino ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do treino');
    }
  };

  const handleViewTraining = (training: TrainingAssignment) => {
    if (training.training_type === 'html' && training.html_file_url) {
      setSelectedHTMLTraining(training);
    } else {
      // TODO: Implementar visualização de treino JSON
      toast.info('Visualização de treino JSON em desenvolvimento');
    }
  };

  const handleDeleteTraining = async (training: TrainingAssignment) => {
    if (!confirm(`Tem certeza que deseja excluir o treino "${training.training_name}"?`)) {
      return;
    }

    try {
      // If HTML training, delete file from storage first
      if (training.training_type === 'html' && training.html_file_path) {
        const { error: storageError } = await supabase.storage
          .from('training-html-files')
          .remove([training.html_file_path]);
        
        if (storageError) {
          console.error('Erro ao deletar arquivo:', storageError);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('student_training_assignments')
        .delete()
        .eq('id', training.id);

      if (error) throw error;

      setTrainings(trainings.filter(t => t.id !== training.id));
      toast.success('Treino excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir treino:', error);
      toast.error('Erro ao excluir treino');
    }
  };

  const getTrainingTypeBadge = (training: TrainingAssignment) => {
    if (training.training_type === 'link') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-700">
          <Globe className="w-3 h-3 mr-1" />
          Link
        </Badge>
      );
    }
    if (training.training_type === 'html') {
      const source = training.training_data?.source;
      const isCodePaste = source === 'html_code_paste';
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700">
          {isCodePaste ? <Code2 className="w-3 h-3 mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
          {isCodePaste ? 'Código' : 'HTML'}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700">
        <Sparkles className="w-3 h-3 mr-1" />
        IA
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Carregando treinos...</span>
      </div>
    );
  }

  const activeTrainings = trainings.filter(t => t.is_active);
  const inactiveTrainings = trainings.filter(t => !t.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Treino do Aluno</h2>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowCreateWorkout(true)} variant="outline">
            <Wrench className="w-4 h-4 mr-2" />
            Criar Treino
          </Button>
          <Button onClick={() => setShowPeriodization(true)} variant="outline">
            <Target className="w-4 h-4 mr-2" />
            Atribuir Periodização
          </Button>
          <Button onClick={() => setShowHTMLUpload(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Atribuir Treino
          </Button>
        </div>
      </div>

      {/* Status do Aluno */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Treinamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {activeTrainings.length}
              </div>
              <div className="text-sm text-muted-foreground">Ativos</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {trainings.filter(t => t.training_type === 'link').length}
              </div>
              <div className="text-sm text-muted-foreground">Links</div>
            </div>
            
            <div className="text-center p-4 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg">
              <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {trainings.filter(t => t.training_type === 'html').length}
              </div>
              <div className="text-sm text-muted-foreground">HTML</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {trainings.filter(t => t.training_type !== 'html').length}
              </div>
              <div className="text-sm text-muted-foreground">Treinos IA</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Treinos Ativos */}
      <Card>
        <CardHeader>
          <CardTitle>Séries de Treino</CardTitle>
        </CardHeader>
        <CardContent>
          {trainings.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhum Treino Atribuído
              </h3>
              <p className="text-muted-foreground mb-6">
                Comece criando um treino personalizado para este aluno
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button className="bg-primary hover:bg-primary/90">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Criar com IA
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowHTMLUpload(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload HTML
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {trainings.map((training) => (
                <div
                  key={training.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                    training.is_active 
                      ? 'bg-card hover:bg-muted/50' 
                      : 'bg-muted/30 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      training.training_type === 'html' 
                        ? 'bg-blue-100 dark:bg-blue-950' 
                        : 'bg-purple-100 dark:bg-purple-950'
                    }`}>
                      {training.training_type === 'html' ? (
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Dumbbell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{training.training_name}</h3>
                        {getTrainingTypeBadge(training)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          Início: {new Date(training.start_date).toLocaleDateString('pt-BR')}
                          {training.end_date && (
                            <> - Fim: {new Date(training.end_date).toLocaleDateString('pt-BR')}</>
                          )}
                        </span>
                      </div>
                      {training.training_description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {training.training_description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Badge 
                      variant={training.is_active ? 'default' : 'secondary'}
                      className={training.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' 
                        : ''
                      }
                    >
                      {training.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewTraining(training)}
                      title="Ver treino"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      title="Editar treino"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={training.is_active ? "destructive" : "default"}
                      onClick={() => training.is_active 
                        ? toggleTrainingStatus(training.id, training.is_active)
                        : toggleTrainingStatus(training.id, training.is_active)
                      }
                      title={training.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {training.is_active ? (
                        <Trash2 className="w-4 h-4" />
                      ) : (
                        'Ativar'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive trainings section stays */}
      {inactiveTrainings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">
              Treinos Inativos ({inactiveTrainings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Estes treinos não estão visíveis para o aluno
            </p>
            <div className="space-y-3">
              {inactiveTrainings.map((training) => (
                <div 
                  key={training.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getTrainingTypeBadge(training)}
                    <span className="font-medium">{training.training_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewTraining(training)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => toggleTrainingStatus(training.id, training.is_active)}
                    >
                      Ativar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteTraining(training)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sovereign Override Panel */}
      <SovereignOverridePanel studentId={student.id} />

      {/* HTML Template Manager */}
      <HTMLTemplateManager studentId={student.id} />

      {/* Periodization Dialog */}
      <PeriodizationAssignDialog
        open={showPeriodization}
        onOpenChange={setShowPeriodization}
        studentId={student.id}
        studentName={student.nome}
        onSuccess={fetchTrainings}
      />

      {/* Training Content Upload Dialog */}
      <Dialog open={showHTMLUpload} onOpenChange={setShowHTMLUpload}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <TrainingContentUpload
            studentId={student.id}
            studentName={student.nome}
            onUploadSuccess={() => {
              setShowHTMLUpload(false);
              fetchTrainings();
            }}
            onCancel={() => setShowHTMLUpload(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Create Structured Workout Dialog */}
      <Dialog open={showCreateWorkout} onOpenChange={setShowCreateWorkout}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <CreateWorkoutForm
            studentId={student.id}
            studentName={student.nome}
            onSuccess={() => {
              setShowCreateWorkout(false);
              fetchTrainings();
            }}
            onCancel={() => setShowCreateWorkout(false)}
          />
        </DialogContent>
      </Dialog>

      {/* HTML Training Viewer Dialog */}
      <Dialog 
        open={!!selectedHTMLTraining} 
        onOpenChange={() => setSelectedHTMLTraining(null)}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{selectedHTMLTraining?.training_name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh] border rounded-lg bg-white">
            {selectedHTMLTraining?.html_file_url && (
              <iframe
                src={selectedHTMLTraining.html_file_url}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-[600px] border-0"
                title={selectedHTMLTraining.training_name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
