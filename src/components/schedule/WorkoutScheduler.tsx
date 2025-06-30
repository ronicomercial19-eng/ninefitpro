
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarDays, Clock, Repeat } from "lucide-react";

export const WorkoutScheduler = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [scheduleData, setScheduleData] = useState({
    title: '',
    time: '',
    isRecurring: false,
    recurrencePattern: 'weekly',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!selectedDate || !scheduleData.title || !scheduleData.time) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('workout_schedules')
        .insert({
          user_id: user?.id,
          title: scheduleData.title,
          scheduled_date: selectedDate.toISOString().split('T')[0],
          scheduled_time: scheduleData.time,
          is_recurring: scheduleData.isRecurring,
          recurrence_pattern: scheduleData.isRecurring ? scheduleData.recurrencePattern : null,
          notes: scheduleData.notes
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Treino agendado com sucesso!"
      });

      // Reset form
      setScheduleData({
        title: '',
        time: '',
        isRecurring: false,
        recurrencePattern: 'weekly',
        notes: ''
      });
      setSelectedDate(undefined);
    } catch (error) {
      console.error('Erro ao agendar treino:', error);
      toast({
        title: "Erro",
        description: "Erro ao agendar treino.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Agendar Treino
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Título do Treino</Label>
                <Input
                  value={scheduleData.title}
                  onChange={(e) => setScheduleData({
                    ...scheduleData,
                    title: e.target.value
                  })}
                  placeholder="Ex: Treino de Força - Membros Superiores"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Horário
                </Label>
                <Input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({
                    ...scheduleData,
                    time: e.target.value
                  })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={scheduleData.isRecurring}
                  onCheckedChange={(checked) => setScheduleData({
                    ...scheduleData,
                    isRecurring: checked
                  })}
                />
                <Label htmlFor="recurring" className="flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Repetir semanalmente
                </Label>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData({
                    ...scheduleData,
                    notes: e.target.value
                  })}
                  placeholder="Adicione observações sobre o treino..."
                />
              </div>
            </div>

            <div>
              <Label>Selecione a Data</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
          </div>

          <Button 
            onClick={handleSchedule} 
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {loading ? 'Agendando...' : 'Agendar Treino'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
