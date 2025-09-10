import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Activity,
  Plus,
  Calendar,
  Clock
} from 'lucide-react';

export default function GymDashboard() {
  const stats = [
    { title: 'SEM TREINO', value: '20', color: 'bg-orange-500' },
    { title: 'VENCIDOS', value: '1', color: 'bg-red-500' },
    { title: 'VENCENDO', value: '0', color: 'bg-yellow-500' }
  ];

  const recentActivities = [
    {
      student: 'Pedro Arauches',
      action: 'concluiu a série Braço completo-ASD',
      time: '16/07/2025 - 15:27:06',
      status: 'completed'
    },
    {
      student: 'Pedro Arauches', 
      action: 'concluiu a série PEITORAL + ABD+CARDIO',
      time: '17/02/2025 - 13:42:13',
      status: 'completed'
    },
    {
      student: 'Pedro Arauches',
      action: 'concluiu a série Treino de Costas e Bíceps',
      time: '15/01/2025 - 14:25:24',
      status: 'completed'
    },
    {
      student: 'Pedro Arauches',
      action: 'concluiu a série Treino Perna completo',
      time: '12/01/2025 - 14:07:46',
      status: 'completed'
    }
  ];

  const studentsWithoutTraining = [
    { name: 'Beatriz Prado', note: 'Adicione um treino agora', initials: 'BP' },
    { name: 'Denise Rem', note: 'Adicione um treino agora', initials: 'DR' },
    { name: 'Flávio Lima', note: 'Adicione um treino agora', initials: 'FL' },
    { name: 'Gui 125', note: 'Adicione um treino agora', initials: 'G1' },
    { name: 'José Bruno', note: 'Adicione um treino agora', initials: 'JB' },
    { name: 'Marcelo Zanellati', note: 'Adicione um treino agora', initials: 'MZ' },
    { name: 'Mariana Esteves', note: 'Adicione um treino agora', initials: 'ME' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dashboard treino</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ACOMPANHAMENTO DE TREINOS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center space-x-8 py-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className={`w-16 h-16 rounded-full ${stat.color} flex items-center justify-center text-white text-2xl font-bold mb-2`}>
                    {stat.value}
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <Button variant="outline" size="sm" className="bg-orange-500 text-white border-orange-500 hover:bg-orange-600">
                Alunos sem treino
              </Button>
              <Button variant="outline" size="sm">Vencidos</Button>
              <Button variant="outline" size="sm">Vencendo</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              HISTÓRICO DE ATIVIDADES
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.slice(0, 4).map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">PA</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.student}</span> {activity.action}
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              ALUNOS SEM TREINO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {studentsWithoutTraining.slice(0, 4).map((student, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium">{student.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.note}</p>
                  </div>
                </div>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                  ADICIONAR
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}