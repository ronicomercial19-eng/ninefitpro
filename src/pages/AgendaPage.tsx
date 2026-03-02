import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, CalendarDays, Plus, Clock, Activity, Users,
  ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

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

interface Athlete {
  id: string;
  name: string;
  email: string | null;
}

interface Appointment {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  status: string;
  appointment_type: string | null;
  student_name?: string;
}

export default function AgendaPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [appointmentForm, setAppointmentForm] = useState({
    athlete_id: '',
    appointment_type: '',
    scheduled_at: '',
    notes: '',
    title: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user, currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, assessmentRes, athletesRes, appointmentsRes] = await Promise.all([
        supabase.from('class_bookings').select(`
          id, class_id, user_email, status, booking_time,
          gym_classes (class_name, class_datetime, location, instructor_name)
        `).order('booking_time', { ascending: true }),
        supabase.from('avaliacoes_unificadas')
          .select('id, data_avaliacao, aluno_id, peso, altura')
          .gte('data_avaliacao', format(startOfMonth(currentDate), 'yyyy-MM-dd'))
          .lte('data_avaliacao', format(endOfMonth(currentDate), 'yyyy-MM-dd'))
          .order('data_avaliacao', { ascending: false }),
        supabase.from('athletes').select('id, name, email').order('name'),
        supabase.from('appointments')
          .select('id, student_id, title, description, scheduled_at, status, appointment_type')
          .order('scheduled_at', { ascending: true }),
      ]);

      if (bookingsRes.data) setBookings(bookingsRes.data as any);
      if (assessmentRes.data) setAssessments(assessmentRes.data);
      if (athletesRes.data) setAthletes(athletesRes.data);
      if (appointmentsRes.data) {
        const enriched = appointmentsRes.data.map(a => ({
          ...a,
          student_name: athletesRes.data?.find(at => at.id === a.student_id)?.name || 'Aluno',
        }));
        setAppointments(enriched);
      }
    } catch (error) {
      console.error('Error fetching agenda data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async () => {
    if (!appointmentForm.athlete_id || !appointmentForm.appointment_type || !appointmentForm.scheduled_at) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const selectedAthlete = athletes.find(a => a.id === appointmentForm.athlete_id);
      const title = appointmentForm.title || 
        `${appointmentForm.appointment_type === 'avaliacao_fisica' ? 'Avaliação Física' : 
          appointmentForm.appointment_type === 'aula' ? 'Aula' : 'Consultoria'} - ${selectedAthlete?.name}`;

      const { error } = await supabase.from('appointments').insert({
        student_id: appointmentForm.athlete_id,
        teacher_id: user!.id,
        title,
        description: appointmentForm.notes || null,
        scheduled_at: appointmentForm.scheduled_at,
        status: 'scheduled',
        appointment_type: appointmentForm.appointment_type,
      });

      if (error) throw error;

      toast.success('Agendamento criado com sucesso!');
      setShowNewAppointment(false);
      setAppointmentForm({ athlete_id: '', appointment_type: '', scheduled_at: '', notes: '', title: '' });
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao criar agendamento: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getBookingsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(b => b.gym_classes?.class_datetime?.startsWith(dateStr));
  };

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(a => a.scheduled_at?.startsWith(dateStr));
  };

  const getAppointmentColor = (type: string | null) => {
    switch (type) {
      case 'avaliacao_fisica': return 'bg-purple-400';
      case 'aula': return 'bg-blue-400';
      case 'consultoria': return 'bg-green-400';
      default: return 'bg-primary';
    }
  };

  const getAppointmentLabel = (type: string | null) => {
    switch (type) {
      case 'avaliacao_fisica': return 'Avaliação';
      case 'aula': return 'Aula';
      case 'consultoria': return 'Consultoria';
      default: return 'Agendamento';
    }
  };

  const openExternalAssessment = () => {
    window.open('https://nineprogresstracker.lovable.app/', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openExternalAssessment}
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
            <Activity className="w-4 h-4 mr-2" />Avaliação Física
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
          <Button variant="outline" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10">
            <Users className="w-4 h-4 mr-2" />Aulas Agendadas
            <Badge variant="secondary" className="ml-2">{bookings.filter(b => b.status === 'confirmed').length}</Badge>
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowNewAppointment(true)}>
            <Plus className="w-4 h-4 mr-2" />Novo agendamento
          </Button>
        </div>
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Aluno *</Label>
              <Select value={appointmentForm.athlete_id}
                onValueChange={(v) => setAppointmentForm({ ...appointmentForm, athlete_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>
                  {athletes.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={appointmentForm.appointment_type}
                onValueChange={(v) => setAppointmentForm({ ...appointmentForm, appointment_type: v })}>
                <SelectTrigger><SelectValue placeholder="Tipo de agendamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avaliacao_fisica">Avaliação Física</SelectItem>
                  <SelectItem value="aula">Aula</SelectItem>
                  <SelectItem value="consultoria">Consultoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data e Hora *</Label>
              <Input type="datetime-local" value={appointmentForm.scheduled_at}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_at: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Título (opcional)</Label>
              <Input value={appointmentForm.title} placeholder="Ex: Reavaliação mensal"
                onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={appointmentForm.notes} placeholder="Notas sobre o agendamento..."
                onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })} />
            </div>
            <Button onClick={handleCreateAppointment} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : 'Criar Agendamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <Button variant={isToday(currentDate) ? "default" : "outline"} size="sm" onClick={handleToday}>
                Hoje
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {(['day', 'week', 'month'] as const).map(mode => (
                <Button key={mode} variant={viewMode === mode ? 'default' : 'outline'} size="sm"
                  onClick={() => setViewMode(mode)}>
                  {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
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
                <p className="text-2xl font-bold text-blue-400">{bookings.filter(b => b.status === 'confirmed').length}</p>
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
                <p className="text-2xl font-bold text-primary">{bookings.length + assessments.length}</p>
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
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {monthDays.map((day) => {
                  const dayBookings = getBookingsForDay(day);
                  const dayAppointments = getAppointmentsForDay(day);
                  const hasEvents = dayBookings.length > 0 || dayAppointments.length > 0;
                  return (
                    <button key={day.toISOString()}
                      className={`aspect-square p-1 rounded-lg border transition-all text-sm
                        ${isToday(day) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 hover:bg-muted'}
                        ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}`}>
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="font-medium">{format(day, 'd')}</span>
                        {hasEvents && (
                          <div className="flex gap-0.5 mt-1">
                            {dayBookings.slice(0, 2).map((_, i) => (
                              <div key={`b-${i}`} className="w-1 h-1 rounded-full bg-blue-400" />
                            ))}
                            {dayAppointments.slice(0, 2).map((a, i) => (
                              <div key={`a-${i}`} className={`w-1 h-1 rounded-full ${getAppointmentColor(a.appointment_type)}`} />
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* All Events List */}
              {(bookings.length > 0 || appointments.length > 0) && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">Próximos Eventos</h3>
                  <div className="space-y-2">
                    {/* Appointments */}
                    {appointments.filter(a => a.status !== 'cancelled').slice(0, 5).map((apt) => (
                      <div key={apt.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className={`w-10 h-10 rounded-full ${getAppointmentColor(apt.appointment_type)}/20 flex items-center justify-center`}>
                          <CalendarDays className="w-5 h-5 text-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{apt.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(apt.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            {apt.student_name && ` • ${apt.student_name}`}
                          </p>
                        </div>
                        <Badge variant="secondary">{getAppointmentLabel(apt.appointment_type)}</Badge>
                      </div>
                    ))}
                    {/* Bookings */}
                    {bookings.filter(b => b.status === 'confirmed').slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <CalendarDays className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{booking.gym_classes?.class_name || 'Aula'}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.gym_classes?.class_datetime
                              ? format(new Date(booking.gym_classes.class_datetime), "dd/MM 'às' HH:mm", { locale: ptBR })
                              : 'Data não definida'}
                            {booking.gym_classes?.location && ` • ${booking.gym_classes.location}`}
                          </p>
                        </div>
                        <Badge variant="secondary">{booking.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bookings.length === 0 && assessments.length === 0 && (
                <div className="text-center py-12">
                  <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhum agendamento encontrado</h3>
                  <p className="text-muted-foreground mb-4">Você ainda não possui agendamentos para este período.</p>
                  <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowNewAppointment(true)}>
                    <Plus className="w-4 h-4 mr-2" />Criar primeiro agendamento
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
