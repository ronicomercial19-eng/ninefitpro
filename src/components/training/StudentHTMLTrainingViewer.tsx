import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Calendar, Eye, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface HTMLTraining {
  id: string;
  training_name: string;
  training_description?: string;
  html_file_url: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
}

export const StudentHTMLTrainingViewer = () => {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<HTMLTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState<HTMLTraining | null>(null);

  useEffect(() => {
    if (user) {
      fetchHTMLTrainings();
    }
  }, [user]);

  const fetchHTMLTrainings = async () => {
    if (!user) return;

    try {
      // First, find the student record by email
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('email', user.email)
        .single();

      if (studentError || !studentData) {
        // Try athletes table
        const { data: athleteData, error: athleteError } = await supabase
          .from('athletes')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (athleteError || !athleteData) {
          console.log('Usuário não encontrado como aluno');
          setLoading(false);
          return;
        }

        // Fetch HTML trainings for athlete
        const { data: trainingsData, error: trainingsError } = await supabase
          .from('student_training_assignments')
          .select('*')
          .eq('student_id', athleteData.id)
          .eq('training_type', 'html')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (trainingsError) throw trainingsError;
        setTrainings(trainingsData || []);
        setLoading(false);
        return;
      }

      // Fetch HTML trainings for student
      const { data: trainingsData, error: trainingsError } = await supabase
        .from('student_training_assignments')
        .select('*')
        .eq('student_id', studentData.id)
        .eq('training_type', 'html')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (trainingsError) throw trainingsError;
      setTrainings(trainingsData || []);

    } catch (error) {
      console.error('Erro ao buscar treinos HTML:', error);
      toast.error('Erro ao carregar treinos');
    } finally {
      setLoading(false);
    }
  };

  const getTrainingStatus = (training: HTMLTraining) => {
    const now = new Date();
    const endDate = training.end_date ? new Date(training.end_date) : null;
    
    if (!training.is_active) {
      return { label: 'Inativo', variant: 'secondary' as const, icon: AlertCircle };
    }
    if (endDate && endDate < now) {
      return { label: 'Vencido', variant: 'destructive' as const, icon: AlertCircle };
    }
    return { label: 'Ativo', variant: 'default' as const, icon: CheckCircle };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não definido';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Carregando treinos...</span>
      </div>
    );
  }

  if (trainings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum treino HTML disponível</h3>
          <p className="text-muted-foreground">
            Seu professor ainda não atribuiu treinos HTML para você.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Meus Treinos</h3>
          <Badge variant="outline">{trainings.length}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {trainings.map((training) => {
            const status = getTrainingStatus(training);
            const StatusIcon = status.icon;

            return (
              <Card key={training.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{training.training_name}</CardTitle>
                    <Badge variant={status.variant} className="flex items-center gap-1">
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {training.training_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {training.training_description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Início: {formatDate(training.start_date)}</span>
                    </div>
                    {training.end_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Fim: {formatDate(training.end_date)}</span>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={() => setSelectedTraining(training)}
                    className="w-full"
                    variant="default"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar Treino
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Dialog para visualizar treino HTML */}
      <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
        <DialogContent className="max-w-4xl h-[85vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedTraining?.training_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full">
            {selectedTraining?.html_file_url && (
              <iframe
                src={selectedTraining.html_file_url}
                className="w-full h-[calc(85vh-80px)] border-0"
                title={selectedTraining.training_name}
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
