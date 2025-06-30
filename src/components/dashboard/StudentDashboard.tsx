
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ProfileValidationAlert } from "@/components/profile/ProfileValidationAlert";
import { WorkoutScheduler } from "@/components/schedule/WorkoutScheduler";
import { Calendar as CalendarIcon, CheckCircle, MessageCircle, Target, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [workoutForDay, setWorkoutForDay] = useState<any>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [discrepancies] = useState<string[]>([
    "Objetivo alterado de 'Emagrecimento' para 'Hipertrofia'",
    "Nível de experiência não condiz com tempo de prática informado"
  ]);
  const [showAlert, setShowAlert] = useState(true);

  const weeklyWorkouts = {
    'Segunda-feira': {
      dia: 'Segunda-feira - Treino A',
      blocos: [
        {
          tipo: 'Aquecimento',
          exercicios: [
            { nome: 'Caminhada na esteira', series: '1', repeticoes: '5 min' },
            { nome: 'Mobilidade articular', series: '1', repeticoes: '5 min' }
          ]
        },
        {
          tipo: 'Principal',
          exercicios: [
            { nome: 'Agachamento livre - foco em força', series: '4', repeticoes: '8-10', carga: '80kg' },
            { nome: 'Supino reto - desenvolvimento de potência', series: '4', repeticoes: '6-8', carga: '70kg' },
            { nome: 'Remada curvada - fortalecimento posterior', series: '3', repeticoes: '10-12', carga: '60kg' }
          ]
        },
        {
          tipo: 'Finalização',
          exercicios: [
            { nome: 'Respiração diafragmática guiada', series: '1', repeticoes: '3 min' },
            { nome: 'Mobilidade de quadril com bastão', series: '1', repeticoes: '5 min' }
          ]
        }
      ]
    },
    'Quarta-feira': {
      dia: 'Quarta-feira - Treino B',
      blocos: [
        {
          tipo: 'Aquecimento',
          exercicios: [
            { nome: 'Bike ergométrica', series: '1', repeticoes: '5 min' },
            { nome: 'Ativação do core', series: '1', repeticoes: '3 min' }
          ]
        },
        {
          tipo: 'Principal',
          exercicios: [
            { nome: 'Leg press 45° - desenvolvimento de força', series: '4', repeticoes: '12-15', carga: '120kg' },
            { nome: 'Puxada frontal - fortalecimento dorsal', series: '4', repeticoes: '10-12', carga: '50kg' },
            { nome: 'Desenvolvimento militar - estabilização', series: '3', repeticoes: '8-10', carga: '40kg' }
          ]
        },
        {
          tipo: 'Finalização',
          exercicios: [
            { nome: 'Alongamento completo', series: '1', repeticoes: '10 min' },
            { nome: 'Relaxamento muscular progressivo', series: '1', repeticoes: '5 min' }
          ]
        }
      ]
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      setWorkoutForDay(weeklyWorkouts[capitalizedDay as keyof typeof weeklyWorkouts] || null);
    }
  };

  const getBlockColor = (tipo: string) => {
    switch (tipo) {
      case 'Aquecimento': return 'bg-blue-100 border-blue-300';
      case 'Principal': return 'bg-orange-100 border-orange-300';
      case 'Finalização': return 'bg-green-100 border-green-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getBlockIcon = (tipo: string) => {
    switch (tipo) {
      case 'Aquecimento': return '🔥';
      case 'Principal': return '💪';
      case 'Finalização': return '🧘';
      default: return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Meus Treinos</h1>
          <p className="text-gray-600">Acompanhe seu progresso e treinos semanais</p>
        </div>

        {showAlert && (
          <ProfileValidationAlert 
            discrepancies={discrepancies} 
            onDismiss={() => setShowAlert(false)} 
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Calendário Semanal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => setShowScheduler(!showScheduler)}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Agendar Treino
                </Button>
                <Button variant="outline" className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check-in do Treino
                </Button>
                <Button variant="outline" className="w-full">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar Dúvida
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {showScheduler && (
              <div className="mb-6">
                <WorkoutScheduler />
              </div>
            )}

            {workoutForDay ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{workoutForDay.dia}</span>
                    <Badge className="bg-orange-500 text-white">
                      {selectedDate?.toLocaleDateString('pt-BR')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {workoutForDay.blocos.map((bloco: any, index: number) => (
                    <div key={index} className={`p-4 rounded-lg border-2 ${getBlockColor(bloco.tipo)}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{getBlockIcon(bloco.tipo)}</span>
                        <h3 className="font-semibold text-lg">{bloco.tipo}</h3>
                      </div>
                      <div className="space-y-3">
                        {bloco.exercicios.map((exercicio: any, exIndex: number) => (
                          <div key={exIndex} className="bg-white p-3 rounded-md shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-black">{exercicio.nome}</h4>
                              <div className="flex gap-2">
                                <Badge variant="outline">{exercicio.series} séries</Badge>
                                <Badge variant="outline">{exercicio.repeticoes}</Badge>
                                {exercicio.carga && (
                                  <Badge className="bg-orange-500 text-white">{exercicio.carga}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : selectedDate ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <Activity className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Nenhum treino agendado
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Não há treinos programados para {selectedDate.toLocaleDateString('pt-BR')}
                  </p>
                  <Button 
                    onClick={() => setShowScheduler(true)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    Agendar Treino
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-400 mb-4">
                    <Target className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Selecione um dia
                  </h3>
                  <p className="text-gray-500">
                    Clique em um dia no calendário para ver seus treinos programados
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
