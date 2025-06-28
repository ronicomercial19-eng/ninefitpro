
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, Download, Trophy, Zap, Dumbbell } from "lucide-react";
import { WorkoutPlan } from "@/types/workout";

interface WorkoutDisplayProps {
  workout: WorkoutPlan;
  onExportPDF?: () => void;
}

export const WorkoutDisplay = ({ workout, onExportPDF }: WorkoutDisplayProps) => {
  const totalExercises = workout.dias.reduce((total, dia) => {
    return total + dia.blocos.reduce((diaTotal, bloco) => {
      return diaTotal + bloco.exercicios.length;
    }, 0);
  }, 0);

  const getBlockColor = (tipo: string) => {
    switch (tipo) {
      case 'Aquecimento':
        return 'bg-yellow-100 text-yellow-800';
      case 'Principal':
        return 'bg-blue-100 text-blue-800';
      case 'Finalização':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBlockIcon = (tipo: string) => {
    switch (tipo) {
      case 'Aquecimento':
        return '🔥';
      case 'Principal':
        return '💪';
      case 'Finalização':
        return '✨';
      default:
        return '📝';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header com estatísticas */}
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-4xl font-bold text-gray-900">
            {workout.nome}
          </h2>
          <p className="text-lg text-gray-600 mt-2">{workout.objetivo}</p>
        </div>
        
        <div className="flex justify-center gap-6">
          <div className="flex items-center gap-2 text-orange-600">
            <Trophy className="w-5 h-5" />
            <span className="font-medium">{workout.dias.length} dias de treino</span>
          </div>
          <div className="flex items-center gap-2 text-blue-600">
            <Zap className="w-5 h-5" />
            <span className="font-medium">{totalExercises} exercícios</span>
          </div>
        </div>
        
        {onExportPDF && (
          <Button onClick={onExportPDF} variant="outline" size="lg">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        )}
      </div>

      {/* Grid de treinos */}
      <div className="grid gap-8">
        {workout.dias.map((dia, diaIndex) => (
          <Card key={diaIndex} className="overflow-hidden shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {dia.dia}
                  </CardTitle>
                  <p className="text-orange-100 mt-1">
                    {dia.blocos.reduce((total, bloco) => total + bloco.exercicios.length, 0)} exercícios
                  </p>
                </div>
                <div className="flex gap-2">
                  {dia.blocos.map((bloco, blocoIndex) => (
                    <Badge key={blocoIndex} className="bg-white/20 text-white">
                      {getBlockIcon(bloco.tipo)} {bloco.tipo}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {dia.blocos.map((bloco, blocoIndex) => (
                  <div key={blocoIndex} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getBlockColor(bloco.tipo)} text-lg px-4 py-2`}>
                        {getBlockIcon(bloco.tipo)} {bloco.tipo}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {bloco.exercicios.length} exercícios
                      </span>
                    </div>
                    
                    <div className="grid gap-3 ml-4">
                      {bloco.exercicios.map((exercise, exerciseIndex) => (
                        <div key={exerciseIndex} className="border rounded-lg p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h5 className="font-bold text-lg text-gray-900 mb-1">
                                <Dumbbell className="w-4 h-4 inline mr-2" />
                                {exercise.nome}
                              </h5>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                              <Target className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-blue-800">
                                {exercise.series} séries
                              </span>
                            </div>
                            <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
                              <span className="font-medium text-green-800">
                                {exercise.repeticoes} reps
                              </span>
                            </div>
                            {exercise.carga && (
                              <div className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-full">
                                <span className="font-medium text-purple-800">
                                  {exercise.carga}
                                </span>
                              </div>
                            )}
                            {exercise.cadencia && (
                              <div className="flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-full">
                                <Clock className="w-4 h-4 text-orange-600" />
                                <span className="font-medium text-orange-800">
                                  {exercise.cadencia}
                                </span>
                              </div>
                            )}
                            {exercise.rir && (
                              <div className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded-full">
                                <span className="font-medium text-red-800">
                                  RIR {exercise.rir}
                                </span>
                              </div>
                            )}
                            {exercise.metodo && (
                              <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1 rounded-full">
                                <span className="font-medium text-yellow-800">
                                  {exercise.metodo}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t bg-gray-50 -mx-6 px-6 py-4">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Total de exercícios: <strong>{dia.blocos.reduce((total, bloco) => total + bloco.exercicios.length, 0)}</strong></span>
                  <span>Tempo estimado: <strong>60-90 min</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
