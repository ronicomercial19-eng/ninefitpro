
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, Download } from "lucide-react";

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
  [key: string]: WorkoutDay;
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Seu Plano de Treino</h2>
        {onExportPDF && (
          <Button onClick={onExportPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {days.map((day) => {
          const dayWorkout = workout[day];
          if (!dayWorkout) return null;

          return (
            <Card key={day} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardTitle className="flex items-center justify-between">
                  <span>{dayNames[day as keyof typeof dayNames]}</span>
                  <Badge className="bg-white/20 text-white">
                    {dayWorkout.grupo}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {dayWorkout.exercicios.map((exercise, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-lg">{exercise.nome}</h4>
                        <div className="flex gap-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Target className="w-4 h-4 mr-1" />
                            {exercise.series}x{exercise.reps}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {exercise.descanso}
                          </div>
                        </div>
                      </div>
                      {exercise.observacoes && (
                        <p className="text-sm text-gray-600 italic">
                          {exercise.observacoes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
