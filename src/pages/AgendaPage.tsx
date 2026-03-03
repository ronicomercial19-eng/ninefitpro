import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Calendar, CalendarDays, Plus, Clock, Activity, Users,
  ChevronLeft, ChevronRight, ExternalLink, Check, X, Edit, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ClassBooking {
  id: string;
  class_id: string;
  user_email: string;
  status: string;
  booking_time: string;
  check_in_at: string | null;
  gym_classes: {
    class_name: string;
    class_datetime: string;
    location: string;
    instructor_name: string | null;
  } | null;
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
  duration: number | null;
  location: string | null;
  student_name?: string;
}

export default function AgendaPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [appointmentForm, setAppointmentForm] = useState({
    athlete_id: '', appointment_type: '', scheduled_at: '', notes: '', title: '', duration: '60', location: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user, currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const [bookingsRes, athletesRes, appointmentsRes] = await Promise.all([
        supabase.from('class_bookings').select(`
          id, class_id, user_email, status, booking_time, check_in_at,
          gym_classes (class_name, class_datetime, location, instructor_name)
        `).order('booking_time', { ascending: true }),
        supabase.from('athletes').select('id, name, email').order('name'),
        supabase.from('appointments')
          .select('id, student_id, title, description, scheduled_at, status, appointment_type, duration, location')
          .gte('scheduled_at', format(monthStart, 'yyyy-MM-dd'))
          .lte('scheduled_at', format(monthEnd, 'yyyy-MM-dd') + 'T23:59:59')
          .order('scheduled_at', { ascending: true }),
      ]);

      if (bookingsRes.data) setBookings(bookingsRes.data as any);
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
      const typeLabels: Record<string, string> = { avaliacao_fisica: 'Avaliação Física', aula: 'Aula', consultoria: 'Consultoria' };
      const title = appointmentForm.title || `${typeLabels[appointmentForm.appointment_type] || 'Agendamento'} - ${selectedAthlete?.name}`;

      const { error } = await supabase.from('appointments').insert({
        student_id: appointmentForm.athlete_id,
        teacher_id: user!.id,
        title,
        description: appointmentForm.notes || null,
        scheduled_at: appointmentForm.scheduled_at,
        status: 'scheduled',
        appointment_type: appointmentForm.appointment_type,
        duration: parseInt(appointmentForm.duration) || 60 as any,
        location: appointmentForm.location || null,
      });
      if (error) throw error;
      toast.success('Agendamento criado!');
      setShowNewAppointment(false);
      setAppointmentForm({ athlete_id: '', appointment_type: '', scheduled_at: '', notes: '', title: '', duration: '60', location: '' });
      fetchData();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAppointmentStatus = async (id: string, status: "scheduled" | "completed" | "cancelled" | "no_show") => {
    try {
      const { error } = await supabase.from('appointments').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success(`Status atualizado para: ${status}`);
      fetchData();
    } catch { toast.error('Erro ao atualizar'); }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Agendamento excluído');
      fetchData();
    } catch { toast.error('Erro ao excluir'); }
  };

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
      case 'avaliacao_fisica': return 'bg-purple-500';
      case 'aula': return 'bg-blue-500';
      case 'consultoria': return 'bg-green-500';
      default: return 'bg-primary';
    }
  };

  const getAppointmentBorderColor = (type: string | null) => {
    switch (type) {
      case 'avaliacao_fisica': return 'border-purple-500/50';
      case 'aula': return 'border-blue-500/50';
      case 'consultoria': return 'border-green-500/50';
      default: return 'border-primary/50';
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Agendado';
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      case 'no_show': return 'Faltou';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-400';
      case 'confirmed': return 'bg-green-500/20 text-green-400';
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'cancelled': return 'bg-destructive/20 text-destructive';
      case 'no_show': return 'bg-amber-500/20 text-amber-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const selectedDayBookings = selectedDay ? getBookingsForDay(selectedDay) : [];
  const selectedDayAppointments = selectedDay ? getAppointmentsForDay(selectedDay) : [];

  // Stats
  const totalAppointments = appointments.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.open('https://nineprogresstracker.lovable.app/', '_blank')}
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
            <Activity className="w-4 h-4 mr-2" />Avaliação Física<ExternalLink className="w-3 h-3 ml-2" />
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowNewAppointment(true)}>
            <Plus className="w-4 h-4 mr-2" />Novo agendamento
          </Button>
        </div>
      </div>

      {/* New Appointment Dialog */}
      <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Aluno *</Label>
              <Select value={appointmentForm.athlete_id} onValueChange={(v) => setAppointmentForm({ ...appointmentForm, athlete_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>{athletes.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={appointmentForm.appointment_type} onValueChange={(v) => setAppointmentForm({ ...appointmentForm, appointment_type: v })}>
                <SelectTrigger><SelectValue placeholder="Tipo de agendamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avaliacao_fisica">Avaliação Física</SelectItem>
                  <SelectItem value="aula">Aula</SelectItem>
                  <SelectItem value="consultoria">Consultoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Data e Hora *</Label><Input type="datetime-local" value={appointmentForm.scheduled_at} onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_at: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Duração (min)</Label><Input type="number" value={appointmentForm.duration} onChange={(e) => setAppointmentForm({ ...appointmentForm, duration: e.target.value })} /></div>
              <div className="space-y-2"><Label>Local</Label><Input value={appointmentForm.location} placeholder="Ex: Studio 1" onChange={(e) => setAppointmentForm({ ...appointmentForm, location: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Título (opcional)</Label><Input value={appointmentForm.title} placeholder="Ex: Reavaliação mensal" onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={appointmentForm.notes} placeholder="Notas..." onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })} /></div>
            <Button onClick={handleCreateAppointment} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : 'Criar Agendamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center"><Activity className="w-6 h-6 text-purple-400" /></div>
              <div><p className="text-sm text-muted-foreground">Agendamentos</p><p className="text-2xl font-bold text-purple-400">{totalAppointments}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center"><Users className="w-6 h-6 text-blue-400" /></div>
              <div><p className="text-sm text-muted-foreground">Aulas confirmadas</p><p className="text-2xl font-bold text-blue-400">{confirmedBookings}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center"><Check className="w-6 h-6 text-green-400" /></div>
              <div><p className="text-sm text-muted-foreground">Concluídos</p><p className="text-2xl font-bold text-green-400">{completedAppointments}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center"><Calendar className="w-6 h-6 text-primary" /></div>
              <div><p className="text-sm text-muted-foreground">Hoje</p><p className="text-2xl font-bold text-primary">{getAppointmentsForDay(new Date()).length + getBookingsForDay(new Date()).length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500" /> Avaliação</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /> Aula</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /> Consultoria</span>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="w-4 h-4" /></Button>
              <h2 className="text-xl font-semibold capitalize min-w-[180px] text-center">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</h2>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="w-4 h-4" /></Button>
            </div>
            <Button variant={isToday(currentDate) ? "default" : "outline"} size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
          </div>

          {loading ? (
            <div className="text-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Carregando...</p></div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`e-${i}`} className="aspect-square" />)}
                {monthDays.map((day) => {
                  const dayBookings = getBookingsForDay(day);
                  const dayAppointments = getAppointmentsForDay(day);
                  const hasEvents = dayBookings.length > 0 || dayAppointments.length > 0;
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  return (
                    <button key={day.toISOString()} onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`aspect-square p-1 rounded-lg border transition-all text-sm
                        ${isSelected ? 'bg-primary text-primary-foreground border-primary' : isToday(day) ? 'bg-primary/20 border-primary/50' : 'border-border hover:border-primary/50 hover:bg-muted'}
                        ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}`}>
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="font-medium">{format(day, 'd')}</span>
                        {hasEvents && (
                          <div className="flex gap-0.5 mt-1">
                            {dayAppointments.slice(0, 3).map((a, i) => (
                              <div key={`a-${i}`} className={`w-1.5 h-1.5 rounded-full ${getAppointmentColor(a.appointment_type)}`} />
                            ))}
                            {dayBookings.slice(0, 2).map((_, i) => (
                              <div key={`b-${i}`} className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Detail */}
              {selectedDay && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
                    {format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  {selectedDayAppointments.length === 0 && selectedDayBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento neste dia</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedDayAppointments.map((apt) => (
                        <div key={apt.id} className={`p-4 rounded-lg border ${getAppointmentBorderColor(apt.appointment_type)} bg-card`}>
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-foreground">{apt.title}</p>
                              <p className="text-xs text-muted-foreground">{apt.student_name} • {format(new Date(apt.scheduled_at), "HH:mm")}{apt.duration ? ` • ${apt.duration}min` : ''}</p>
                              {apt.location && <p className="text-xs text-muted-foreground mt-1">📍 {apt.location}</p>}
                              {apt.description && <p className="text-xs text-muted-foreground mt-1">{apt.description}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(apt.status)}>{getStatusLabel(apt.status)}</Badge>
                              <Badge variant="outline">{getAppointmentLabel(apt.appointment_type)}</Badge>
                            </div>
                          </div>
                          {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" variant="outline" className="text-green-500 border-green-500/30 hover:bg-green-500/10" onClick={() => handleUpdateAppointmentStatus(apt.id, 'completed')}>
                                <Check className="w-3 h-3 mr-1" />Concluir
                              </Button>
                              <Button size="sm" variant="outline" className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10" onClick={() => handleUpdateAppointmentStatus(apt.id, 'no_show')}>
                                Faltou
                              </Button>
                              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleUpdateAppointmentStatus(apt.id, 'cancelled')}>
                                <X className="w-3 h-3 mr-1" />Cancelar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAppointment(apt.id)} className="bg-destructive">Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      ))}
                      {selectedDayBookings.map((booking) => (
                        <div key={booking.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-blue-500/20">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-blue-400" /></div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{booking.gym_classes?.class_name || 'Aula'}</p>
                            <p className="text-xs text-muted-foreground">{booking.user_email} • {booking.gym_classes?.class_datetime ? format(new Date(booking.gym_classes.class_datetime), "HH:mm") : ''}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {booking.check_in_at && <Badge className="bg-green-500/20 text-green-500">Check-in ✓</Badge>}
                            <Badge variant="secondary">{booking.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* All Upcoming Events */}
              {!selectedDay && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">Próximos Eventos</h3>
                  {appointments.filter(a => a.status !== 'cancelled' && new Date(a.scheduled_at) >= new Date()).length === 0 &&
                   bookings.filter(b => b.status === 'confirmed').length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Nenhum agendamento</h3>
                      <p className="text-muted-foreground mb-4">Crie seu primeiro agendamento.</p>
                      <Button onClick={() => setShowNewAppointment(true)}><Plus className="w-4 h-4 mr-2" />Criar agendamento</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {appointments.filter(a => a.status !== 'cancelled' && new Date(a.scheduled_at) >= new Date()).slice(0, 10).map((apt) => (
                        <div key={apt.id} className={`flex items-center gap-3 p-3 bg-muted/50 rounded-lg border ${getAppointmentBorderColor(apt.appointment_type)}`}>
                          <div className={`w-10 h-10 rounded-full ${getAppointmentColor(apt.appointment_type)}/20 flex items-center justify-center`}>
                            <CalendarDays className="w-5 h-5 text-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{apt.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(apt.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })} • {apt.student_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(apt.status)}>{getStatusLabel(apt.status)}</Badge>
                            <Badge variant="outline">{getAppointmentLabel(apt.appointment_type)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
