
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Check, X, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Workout {
  id: string;
  aluno: string;
  conteudo: any;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  created_at: string;
}

export const WorkoutAdminPanel = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    
    try {
      // Simular dados de treinos - substitua pela integração real
      const mockWorkouts: Workout[] = [
        {
          id: '1',
          aluno: 'João Silva',
          conteudo: {
            nome: "Treino Superior A",
            objetivo: "Hipertrofia",
            exercicios: ['Supino', 'Remada', 'Desenvolvimento']
          },
          status: 'pendente',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          aluno: 'Maria Santos',
          conteudo: {
            nome: "Treino Inferior B",
            objetivo: "Força",
            exercicios: ['Agachamento', 'Leg Press', 'Stiff']
          },
          status: 'aprovado',
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      // Simular erro intermitente para demonstrar retry
      if (retryCount < 2 && Math.random() > 0.7) {
        throw new Error('Erro de conexão intermitente');
      }

      setWorkouts(mockWorkouts);
      setRetryCount(0);
    } catch (error) {
      console.error('Erro ao buscar treinos:', error);
      setError('Erro ao carregar treinos. Tentando novamente...');
      
      // Auto retry após 2 segundos
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        fetchWorkouts(false);
      }, 2000);
      
      toast({
        title: "Erro de Carregamento",
        description: "Erro ao carregar treinos. Tentativa automática em andamento...",
        variant: "destructive"
      });
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const updateWorkoutStatus = async (id: string, status: string) => {
    try {
      // Simular atualização no backend
      const updatedWorkouts = workouts.map(workout => 
        workout.id === id ? { ...workout, status: status as any } : workout
      );
      setWorkouts(updatedWorkouts);

      toast({
        title: "Sucesso",
        description: `Treino ${status} com sucesso.`,
      });
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do treino.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-100 text-red-800">Rejeitado</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Painel Administrativo - Treinos</CardTitle>
          <Button 
            onClick={() => fetchWorkouts()} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-yellow-800">{error}</span>
              <div className="ml-auto">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
              </div>
            </div>
          )}
          
          {loading && workouts.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-3">Carregando treinos...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workouts.map((workout) => (
                  <TableRow key={workout.id}>
                    <TableCell className="font-medium">{workout.aluno}</TableCell>
                    <TableCell>
                      {new Date(workout.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{getStatusBadge(workout.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedWorkout(workout)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {workout.status === 'pendente' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => updateWorkoutStatus(workout.id, 'aprovado')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateWorkoutStatus(workout.id, 'rejeitado')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {workouts.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      Nenhum treino encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedWorkout && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Detalhes do Treino - {selectedWorkout.aluno}</CardTitle>
              <Button
                variant="outline"
                onClick={() => setSelectedWorkout(null)}
              >
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Conteúdo do Treino:</h4>
              <div className="space-y-2">
                <p><strong>Nome:</strong> {selectedWorkout.conteudo.nome}</p>
                <p><strong>Objetivo:</strong> {selectedWorkout.conteudo.objetivo}</p>
                <p><strong>Exercícios:</strong> {selectedWorkout.conteudo.exercicios?.join(', ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
