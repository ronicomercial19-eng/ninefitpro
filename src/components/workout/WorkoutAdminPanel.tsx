
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
import { Check, X, Eye, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      // This would call your Supabase API once connected
      const response = await fetch('/api/listar-treinos');
      const data = await response.json();
      setWorkouts(data);
    } catch (error) {
      console.error('Erro ao buscar treinos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar treinos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWorkoutStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/editar-treino', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      toast({
        title: "Sucesso",
        description: `Treino ${status} com sucesso.`,
      });

      fetchWorkouts(); // Reload the list
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
        <CardHeader>
          <CardTitle>Painel Administrativo - Treinos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando treinos...</p>
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
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedWorkout && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Treino - {selectedWorkout.aluno}</CardTitle>
            <Button
              variant="outline"
              onClick={() => setSelectedWorkout(null)}
              className="w-fit"
            >
              Fechar
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
              {JSON.stringify(selectedWorkout.conteudo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
