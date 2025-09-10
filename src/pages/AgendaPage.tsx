import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays, Plus, Clock } from 'lucide-react';

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
        <Button className="bg-green-500 hover:bg-green-600">
          <Plus className="w-4 h-4 mr-2" />
          Novo agendamento
        </Button>
      </div>

      {/* Calendar Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Hoje</Button>
                <Button variant="outline" size="sm">Semana</Button>
                <Button variant="outline" size="sm">Mês</Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Visualização
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-20">
            <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum agendamento encontrado</h3>
            <p className="text-muted-foreground mb-4">Você ainda não possui agendamentos para este período.</p>
            <Button className="bg-green-500 hover:bg-green-600">
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro agendamento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}