
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, Download, Trophy, Zap } from "lucide-react";

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

interface WorkoutDisplayProps {
  workout: WorkoutPlan;
  onExportPDF?: () => void;
}

export const WorkoutDisplay = ({ workout, onExportPDF }: WorkoutDisplayProps) => {
  const days = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  const dayNames = {
    segunda: 'Segunda-feira',
    terca: 'Terça-feira',
    quarta: 'Quarta-feira',
    quinta: 'Quinta-feira',
    sexta: 'Sexta-feira',
    sabado: 'Sábado',
    domingo: 'Domingo'
  };

  const workoutDays = days.filter(day => workout[day] && typeof workout[day] === 'object');
  const totalExercises = workoutDays.reduce((total, day) => {
    const dayWorkout = workout[day] as WorkoutDay;
    return total + (dayWorkout?.exercicios?.length || 0);
  }, 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header com estatísticas */}
      <div className="text-center space-y-4">
        <div>
          <h2 className="text-4xl font-bold text-gray-900">
            {workout.nome || "Seu Plano de Treino"}
          </h2>
          {workout.objetivo && (
            <p className="text-lg text-gray-600 mt-2">{workout.objetivo}</p>
          )}
        </div>
        
        <div className="flex justify-center gap-6">
          <div className="flex items-center gap-2 text-orange-600">
            <Trophy className="w-5 h-5" />
            <span className="font-medium">{workoutDays.length} dias de treino</span>
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
        {workoutDays.map((day) => {
          const dayWorkout = workout[day] as WorkoutDay;
          if (!dayWorkout || !dayWorkout.exercicios) return null;

          return (
            <Card key={day} className="overflow-hidden shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {dayNames[day as keyof typeof dayNames]}
                    </CardTitle>
                    <p className="text-orange-100 mt-1">
                      {dayWorkout.exercicios.length} exercícios
                    </p>
                  </div>
                  <Badge className="bg-white/20 text-white text-lg px-4 py-2">
                    {dayWorkout.grupo}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4">
                  {dayWorkout.exercicios.map((exercise, index) => (
                    <div key={index} className="border rounded-lg p-5 bg-gradient-to-r from-gray-50 to-gray-100 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-900 mb-1">
                            {index + 1}. {exercise.nome}
                          </h4>
                          {exercise.observacoes && (
                            <p className="text-sm text-gray-600 italic mb-2">
                              💡 {exercise.observacoes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-6 text-sm">
                        <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800">
                            {exercise.series} séries
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
                          <span className="font-medium text-green-800">
                            {exercise.reps} repetições
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-full">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="font-medium text-orange-800">
                            {exercise.descanso}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t bg-gray-50 -mx-6 px-6 py-4">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Total de exercícios: <strong>{dayWorkout.exercicios.length}</strong></span>
                    <span>Tempo estimado: <strong>60-90 min</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
