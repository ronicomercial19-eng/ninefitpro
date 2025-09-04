import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Plus, Eye, Edit, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

interface StudentTrainingProps {
  student: Student;
  onStudentUpdate: (updatedData: any) => void;
}

export function StudentTraining({ student, onStudentUpdate }: StudentTrainingProps) {
  const [trainings, setTrainings] = useState<TrainingAssignment[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3">Carregando treinos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Treino do Aluno</h2>
        </div>
        
        <div className="flex gap-2">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Treino IA
          </Button>
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Importar Treino
          </Button>
        </div>
      </div>

      {/* Status do Aluno */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Treinamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {trainings.filter(t => t.is_active).length}
              </div>
              <div className="text-sm text-gray-600">Treinos Ativos</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">15</div>
              <div className="text-sm text-gray-600">Sessões Concluídas</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">3</div>
              <div className="text-sm text-gray-600">Semanas de Treino</div>
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
              <Dumbbell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma Série Selecionada
              </h3>
              <p className="text-gray-600 mb-6">
                Clique na série para visualizar os exercícios
              </p>
              <div className="space-y-2">
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Série
                </Button>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Importar treino de referência
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {trainings.map((training) => (
                <div
                  key={training.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Dumbbell className="w-6 h-6 text-orange-600" />
                    </div>
                    
                    <div>
                      <h3 className="font-medium">{training.training_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Início: {new Date(training.start_date).toLocaleDateString('pt-BR')}
                        </span>
                        {training.end_date && (
                          <span>
                            - Fim: {new Date(training.end_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge 
                      className={training.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {training.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={training.is_active ? "destructive" : "default"}
                      onClick={() => toggleTrainingStatus(training.id, training.is_active)}
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

      {/* Séries Fora do Treino */}
      <Card>
        <CardHeader>
          <CardTitle>Séries fora do treino</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Não visível para o aluno</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">CORE WORKOUT</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Legs Day!</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}