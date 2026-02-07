import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  CalendarDays, 
  Plus, 
  Clock, 
  Activity, 
  Users,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClassBooking {
  id: string;
  class_id: string;
  user_email: string;
  status: string;
  booking_time: string;
  gym_classes: {
    class_name: string;
    class_datetime: string;
    location: string;
    instructor_name: string | null;
  } | null;
}

interface Assessment {
  id: string;
  data_avaliacao: string;
  aluno_id: string;
  peso: number | null;
  altura: number | null;
}

export default function AgendaPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch class bookings
      const { data: bookingsData } = await supabase
        .from('class_bookings')
        .select(`
          id,
          class_id,
          user_email,
          status,
          booking_time,
          gym_classes (
            class_name,
            class_datetime,
            location,
            instructor_name
          )
        `)
        .order('booking_time', { ascending: true });

      if (bookingsData) {
        setBookings(bookingsData as any);
      }

      // Fetch assessments
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      
      const { data: assessmentData } = await supabase
        .from('avaliacoes_unificadas')
        .select('id, data_avaliacao, aluno_id, peso, altura')
        .gte('data_avaliacao', format(start, 'yyyy-MM-dd'))
        .lte('data_avaliacao', format(end, 'yyyy-MM-dd'))
        .order('data_avaliacao', { ascending: false });

      if (assessmentData) {
        setAssessments(assessmentData);
      }
    } catch (error) {
      console.error('Error fetching agenda data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get bookings count per day
  const getBookingsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(b => 
      b.gym_classes?.class_datetime?.startsWith(dateStr)
    );
  };

  const openExternalAssessment = () => {
    window.open('https://nineprogresstracker.lovable.app/', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
        
        <div className="flex flex-wrap gap-2">
          {/* Avaliação Física Button */}
          <Button 
            variant="outline"
            onClick={openExternalAssessment}
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
          >
            <Activity className="w-4 h-4 mr-2" />
            Avaliação Física
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>

          {/* Aulas Agendadas Button */}
          <Button 
            variant="outline"
            onClick={() => {/* TODO: Open classes modal */}}
            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
          >
            <Users className="w-4 h-4 mr-2" />
            Aulas Agendadas
            <Badge variant="secondary" className="ml-2">{bookings.filter(b => b.status === 'confirmed').length}</Badge>
          </Button>

          {/* Novo Agendamento */}
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Novo agendamento
          </Button>
        </div>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-xl font-semibold capitalize min-w-[180px] text-center">
                  {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                </h2>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={isToday(currentDate) ? "default" : "outline"} 
                  size="sm"
                  onClick={handleToday}
                >
                  Hoje
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={viewMode === 'day' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Dia
              </Button>
              <Button 
                variant={viewMode === 'week' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button 
                variant={viewMode === 'month' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Mês
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avaliações este mês</p>
                <p className="text-2xl font-bold text-purple-400">{assessments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aulas agendadas</p>
                <p className="text-2xl font-bold text-blue-400">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eventos totais</p>
                <p className="text-2xl font-bold text-primary">
                  {bookings.length + assessments.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando agenda...</p>
            </div>
          ) : (
            <>
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month start */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-start-${i}`} className="aspect-square" />
                ))}

                {monthDays.map((day) => {
                  const dayBookings = getBookingsForDay(day);
                  const hasEvents = dayBookings.length > 0;

                  return (
                    <button
                      key={day.toISOString()}
                      className={`aspect-square p-1 rounded-lg border transition-all text-sm
                        ${isToday(day) 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'border-border hover:border-primary/50 hover:bg-muted'
                        }
                        ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}
                      `}
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="font-medium">{format(day, 'd')}</span>
                        {hasEvents && (
                          <div className="flex gap-0.5 mt-1">
                            {dayBookings.slice(0, 3).map((_, i) => (
                              <div key={i} className="w-1 h-1 rounded-full bg-blue-400" />
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Upcoming Events */}
              {bookings.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
                    Próximos Eventos
                  </h3>
                  <div className="space-y-2">
                    {bookings
                      .filter(b => b.status === 'confirmed')
                      .slice(0, 5)
                      .map((booking) => (
                        <div 
                          key={booking.id}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <CalendarDays className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {booking.gym_classes?.class_name || 'Aula'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {booking.gym_classes?.class_datetime 
                                ? format(new Date(booking.gym_classes.class_datetime), "dd/MM 'às' HH:mm", { locale: ptBR })
                                : 'Data não definida'
                              }
                              {booking.gym_classes?.location && ` • ${booking.gym_classes.location}`}
                            </p>
                          </div>
                          <Badge variant="secondary">{booking.status}</Badge>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Empty State */}
              {bookings.length === 0 && assessments.length === 0 && (
                <div className="text-center py-12">
                  <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhum agendamento encontrado
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Você ainda não possui agendamentos para este período.
                  </p>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeiro agendamento
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
