import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarDays, Plus, Activity, Users, ChevronLeft, ChevronRight, ExternalLink, Check, X, Trash2,
  CreditCard, Send, MessageCircle, Bell, RefreshCw, RotateCcw, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ClassBooking {
  id: string; class_id: string; user_email: string; status: string; booking_time: string; check_in_at: string | null;
  gym_classes: { class_name: string; class_datetime: string; location: string; instructor_name: string | null; } | null;
}
interface Athlete { id: string; name: string; email: string | null; }
interface Appointment {
  id: string; student_id: string; title: string; description: string | null; scheduled_at: string;
  status: string; appointment_type: string | null; duration: number | null; location: string | null; student_name?: string;
  cancelled_by_role?: string | null; cancel_reason?: string | null; makeup_status?: string | null;
  makeup_for_id?: string | null; reschedule_count?: number | null; credit_charged?: boolean | null;
}
interface AgendaStats {
  periodo: { ano: number; mes: number };
  totais: Record<string, number>;
  por_aluno: Array<Record<string, any>>;
  reposicoes_abertas: Array<Record<string, any>>;
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const EMPTY_FORM = {
  athlete_id: '', appointment_type: '', scheduled_at: '', notes: '', title: '', duration: '60', location: '',
  multiDay: false, selectedWeekDays: [] as number[], time: '09:00', waiveCredit: false,
};

const friendlyError = (e: any): string => {
  const m: string = e?.message || String(e || '');
  if (m.includes('insufficient_credits')) return 'Aluno sem créditos suficientes. Envie créditos ou marque "agendar sem debitar".';
  if (m.includes('schedule_conflict')) return 'Conflito de horário com outro agendamento.';
  if (m.includes('makeup_not_owed')) return 'Esse aluno não tem reposição devida para esse cancelamento.';
  if (m.includes('makeup_already_used')) return 'A reposição desse cancelamento já foi usada.';
  if (m.includes('cannot_reduce_below_used')) return 'Não dá pra reduzir abaixo do que o aluno já usou.';
  if (m.includes('invalid_schedule')) return 'Data/horário inválido.';
  if (m.includes('not_authorized') || m.includes('not_allowed')) return 'Sem permissão para essa ação.';
  return m;
};

const getStatusLabel = (s: string) => {
  switch (s) { case 'scheduled': return 'Agendado'; case 'confirmed': return 'Confirmado'; case 'completed': return 'Concluído'; case 'cancelled': return 'Cancelado'; case 'no_show': return 'Faltou'; default: return s; }
};
const getStatusColor = (s: string) => {
  switch (s) { case 'scheduled': return 'bg-blue-500/20 text-blue-400'; case 'confirmed': return 'bg-green-500/20 text-green-500'; case 'completed': return 'bg-green-500/20 text-green-500'; case 'cancelled': return 'bg-destructive/20 text-destructive'; case 'no_show': return 'bg-amber-500/20 text-amber-500'; default: return 'bg-muted text-muted-foreground'; }
};
const makeupLabel = (s?: string | null) => {
  switch (s) { case 'owed': return 'Tem reposição'; case 'not_owed': return 'Sem reposição'; case 'undecided': return 'Reposição a decidir'; case 'done': return 'Reposição feita'; default: return null; }
};
const makeupColor = (s?: string | null) => {
  switch (s) { case 'owed': return 'bg-emerald-500/20 text-emerald-400'; case 'not_owed': return 'bg-muted text-muted-foreground'; case 'undecided': return 'bg-amber-500/20 text-amber-500'; case 'done': return 'bg-blue-500/20 text-blue-400'; default: return ''; }
};
const roleLabel = (r?: string | null) => (r === 'student' ? 'pelo aluno' : r === 'teacher' ? 'pelo professor' : r === 'system' ? 'pelo sistema' : '');

export default function AgendaPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [stats, setStats] = useState<AgendaStats | null>(null);
  const [pendingClose, setPendingClose] = useState<Appointment[]>([]);
  const [makeupList, setMakeupList] = useState<Appointment[]>([]);
  const [tab, setTab] = useState('mes');

  // Novo agendamento (e reposição)
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({ ...EMPTY_FORM });
  const [makeupFor, setMakeupFor] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);

  // Créditos
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [creditAthleteId, setCreditAthleteId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [currentCredits, setCurrentCredits] = useState<{ total: number; used: number } | null>(null);
  const [statement, setStatement] = useState<Array<any>>([]);
  const [savingCredits, setSavingCredits] = useState(false);

  // Cancelar / remarcar
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelMakeup, setCancelMakeup] = useState<'owed' | 'not_owed' | 'undecided'>('undecided');
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const nameOf = useCallback((id: string, list: Athlete[] = athletes) => list.find(a => a.id === id)?.name || 'Aluno', [athletes]);

  const fetchStats = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc('fn_professor_agenda_stats', {
      p_year: currentDate.getFullYear(), p_month: currentDate.getMonth() + 1,
    });
    if (error) { console.error('stats', error); return; }
    setStats(data as AgendaStats);
  }, [currentDate]);

  const fetchOpenLists = useCallback(async (list: Athlete[]) => {
    if (!user) return;
    const nowIso = new Date().toISOString();
    const [pendRes, mkRes] = await Promise.all([
      (supabase as any).from('appointments').select('*').eq('teacher_id', user.id)
        .in('status', ['scheduled', 'confirmed']).lt('scheduled_at', nowIso).order('scheduled_at', { ascending: false }).limit(300),
      (supabase as any).from('appointments').select('*').eq('teacher_id', user.id)
        .in('makeup_status', ['owed', 'undecided']).order('scheduled_at', { ascending: false }).limit(200),
    ]);
    setPendingClose(((pendRes.data || []) as Appointment[]).map(a => ({ ...a, student_name: nameOf(a.student_id, list) })));
    setMakeupList(((mkRes.data || []) as Appointment[]).map(a => ({ ...a, student_name: nameOf(a.student_id, list) })));
  }, [user, nameOf]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const [bookingsRes, athletesRes, appointmentsRes] = await Promise.all([
        supabase.from('class_bookings').select(`id, class_id, user_email, status, booking_time, check_in_at, gym_classes (class_name, class_datetime, location, instructor_name)`).order('booking_time', { ascending: true }),
        (supabase as any).from('athletes').select('id, name, email').or('is_test_account.is.null,is_test_account.eq.false').order('name'),
        (supabase as any).from('appointments').select('*')
          .gte('scheduled_at', format(monthStart, 'yyyy-MM-dd')).lte('scheduled_at', format(monthEnd, 'yyyy-MM-dd') + 'T23:59:59').order('scheduled_at', { ascending: true }),
      ]);
      if (bookingsRes.data) setBookings(bookingsRes.data as any);
      const athleteList: Athlete[] = athletesRes.data || [];
      setAthletes(athleteList);
      if (appointmentsRes.data) {
        setAppointments((appointmentsRes.data as Appointment[]).map(a => ({ ...a, student_name: athleteList.find(at => at.id === a.student_id)?.name || 'Aluno' })));
      }
      await Promise.all([fetchStats(), fetchOpenLists(athleteList)]);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  }, [currentDate, fetchStats, fetchOpenLists]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  // ---------- Créditos ----------
  const fetchAthleteCredits = async (athleteId: string) => {
    const { data } = await (supabase as any).rpc('fn_class_credit_statement', { p_athlete: athleteId, p_limit: 30 });
    const bal = (data as any)?.balance;
    setCurrentCredits(bal ? { total: bal.total, used: bal.used } : { total: 0, used: 0 });
    setStatement(((data as any)?.transactions as any[]) || []);
  };

  const handleSendCredits = async () => {
    if (!creditAthleteId || !creditAmount) { toast.error('Preencha os campos'); return; }
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount === 0) { toast.error('Quantidade inválida'); return; }
    setSavingCredits(true);
    try {
      const { error } = await (supabase as any).rpc('fn_grant_class_credits', {
        p_athlete: creditAthleteId, p_amount: amount, p_note: creditNote || null, p_expires_at: null,
      });
      if (error) throw error;
      toast.success(amount > 0 ? `${amount} créditos enviados!` : `${Math.abs(amount)} créditos removidos`);
      setCreditAmount(''); setCreditNote('');
      fetchAthleteCredits(creditAthleteId);
    } catch (error: any) { toast.error(friendlyError(error)); }
    finally { setSavingCredits(false); }
  };

  // ---------- Criar agendamento / reposição ----------
  const openNewAppointment = () => {
    setMakeupFor(null);
    setAppointmentForm({ ...EMPTY_FORM });
    setCurrentCredits(null);
    setShowNewAppointment(true);
  };

  const openMakeup = (apt: Appointment) => {
    setMakeupFor(apt);
    setAppointmentForm({ ...EMPTY_FORM, athlete_id: apt.student_id, appointment_type: 'aula', title: `Reposição - ${apt.student_name}` });
    fetchAthleteCredits(apt.student_id);
    setShowNewAppointment(true);
  };

  const handleCreateAppointment = async () => {
    if (!appointmentForm.athlete_id || !appointmentForm.appointment_type) { toast.error('Preencha campos obrigatórios'); return; }
    const selectedAthlete = athletes.find(a => a.id === appointmentForm.athlete_id);
    const typeLabels: Record<string, string> = { avaliacao_fisica: 'Avaliação Física', aula: 'Aula', consultoria: 'Consultoria' };
    const baseTitle = appointmentForm.title || `${typeLabels[appointmentForm.appointment_type] || 'Agendamento'} - ${selectedAthlete?.name}`;

    setSaving(true);
    try {
      if (appointmentForm.multiDay && appointmentForm.selectedWeekDays.length > 0 && !makeupFor) {
        const allDays = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
        const matchingDays = allDays.filter(d => appointmentForm.selectedWeekDays.includes(getDay(d)));
        const inserts = matchingDays.map(d => ({
          student_id: appointmentForm.athlete_id, teacher_id: user!.id, title: baseTitle,
          description: appointmentForm.notes || null,
          scheduled_at: `${format(d, 'yyyy-MM-dd')}T${appointmentForm.time}:00`,
          status: 'scheduled' as const, appointment_type: appointmentForm.appointment_type,
          duration: parseInt(appointmentForm.duration) || 60, location: appointmentForm.location || null,
          credit_waived: appointmentForm.waiveCredit,
          recurrence_pattern: { weekDays: appointmentForm.selectedWeekDays, time: appointmentForm.time } as any,
        }));
        const { error } = await (supabase as any).from('appointments').insert(inserts);
        if (error) throw error;
        toast.success(`${inserts.length} agendamentos criados!`);
      } else {
        if (!appointmentForm.scheduled_at) { toast.error('Selecione data/hora'); setSaving(false); return; }
        const { error } = await (supabase as any).from('appointments').insert({
          student_id: appointmentForm.athlete_id, teacher_id: user!.id, title: baseTitle,
          description: appointmentForm.notes || null, scheduled_at: appointmentForm.scheduled_at,
          status: 'scheduled', appointment_type: appointmentForm.appointment_type,
          duration: parseInt(appointmentForm.duration) || 60, location: appointmentForm.location || null,
          credit_waived: appointmentForm.waiveCredit,
          makeup_for_id: makeupFor?.id || null,
        });
        if (error) throw error;
        toast.success(makeupFor ? 'Reposição agendada!' : 'Agendamento criado!');
      }
      setShowNewAppointment(false); setMakeupFor(null); setAppointmentForm({ ...EMPTY_FORM });
      fetchData();
    } catch (error: any) { toast.error(friendlyError(error)); }
    finally { setSaving(false); }
  };

  // ---------- Status ----------
  const handleUpdateStatus = async (id: string, status: 'scheduled' | 'confirmed' | 'completed' | 'no_show') => {
    try {
      const { error } = await (supabase as any).from('appointments').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success(`Status: ${getStatusLabel(status)}`);
      fetchData();
    } catch (e: any) { toast.error(friendlyError(e)); }
  };

  const handleCloseMany = async (ids: string[], status: 'completed' | 'no_show') => {
    if (ids.length === 0) return;
    try {
      const { data, error } = await (supabase as any).rpc('fn_close_appointments', { p_ids: ids, p_status: status });
      if (error) throw error;
      toast.success(`${(data as any)?.updated ?? ids.length} atualizados: ${getStatusLabel(status)}`);
      fetchData();
    } catch (e: any) { toast.error(friendlyError(e)); }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      const { error } = await (supabase as any).from('appointments').update({
        status: 'cancelled', cancel_reason: cancelReason || null, makeup_status: cancelMakeup, updated_at: new Date().toISOString(),
      }).eq('id', cancelTarget.id);
      if (error) throw error;
      toast.success(cancelMakeup === 'owed' ? 'Cancelado — aluno tem reposição (crédito devolvido)' : cancelMakeup === 'not_owed' ? 'Cancelado sem reposição' : 'Cancelado — decida a reposição depois');
      setCancelTarget(null); setCancelReason(''); setCancelMakeup('undecided');
      fetchData();
    } catch (e: any) { toast.error(friendlyError(e)); }
  };

  const handleSetMakeup = async (id: string, makeup: 'owed' | 'not_owed' | 'undecided') => {
    try {
      const { error } = await (supabase as any).from('appointments').update({ makeup_status: makeup }).eq('id', id);
      if (error) throw error;
      toast.success(makeup === 'owed' ? 'Reposição liberada (crédito devolvido)' : makeup === 'not_owed' ? 'Sem reposição' : 'Marcado como a decidir');
      fetchData();
    } catch (e: any) { toast.error(friendlyError(e)); }
  };

  const handleReopen = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('appointments').update({ status: 'scheduled' }).eq('id', id);
      if (error) throw error;
      toast.success('Agendamento reaberto'); fetchData();
    } catch (e: any) { toast.error(friendlyError(e)); }
  };

  const confirmReschedule = async () => {
    if (!rescheduleTarget || !rescheduleAt) { toast.error('Selecione a nova data/hora'); return; }
    try {
      const { error } = await (supabase as any).rpc('fn_reschedule_appointment', {
        p_id: rescheduleTarget.id, p_new_at: new Date(rescheduleAt).toISOString(), p_reason: rescheduleReason || null,
      });
      if (error) throw error;
      toast.success('Remarcado — aluno avisado');
      setRescheduleTarget(null); setRescheduleAt(''); setRescheduleReason('');
      fetchData();
    } catch (e: any) { toast.error(friendlyError(e)); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Excluído (crédito devolvido se estava reservado)'); fetchData();
    } catch { toast.error('Erro ao excluir'); }
  };

  const toggleWeekDay = (day: number) => {
    setAppointmentForm(prev => ({
      ...prev,
      selectedWeekDays: prev.selectedWeekDays.includes(day) ? prev.selectedWeekDays.filter(d => d !== day) : [...prev.selectedWeekDays, day],
    }));
  };

  // ---------- Derivados ----------
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const getBookingsForDay = (date: Date) => bookings.filter(b => b.gym_classes?.class_datetime?.startsWith(format(date, 'yyyy-MM-dd')));
  const getAppointmentsForDay = (date: Date) => appointments.filter(a => a.scheduled_at?.startsWith(format(date, 'yyyy-MM-dd')));
  const getColor = (type: string | null) => { switch (type) { case 'avaliacao_fisica': return 'bg-purple-500'; case 'aula': return 'bg-blue-500'; case 'consultoria': return 'bg-green-500'; default: return 'bg-primary'; } };
  const getBorderColor = (type: string | null) => { switch (type) { case 'avaliacao_fisica': return 'border-purple-500/50'; case 'aula': return 'border-blue-500/50'; case 'consultoria': return 'border-green-500/50'; default: return 'border-primary/50'; } };
  const getLabel = (type: string | null) => { switch (type) { case 'avaliacao_fisica': return 'Avaliação'; case 'aula': return 'Aula'; case 'consultoria': return 'Consultoria'; default: return 'Agendamento'; } };

  const selectedDayBookings = selectedDay ? getBookingsForDay(selectedDay) : [];
  const selectedDayAppointments = selectedDay ? getAppointmentsForDay(selectedDay) : [];
  const pendingRequests = appointments.filter(a => a.status === 'scheduled' && a.description?.includes('[VIA WHATSAPP]'));
  const t = stats?.totais || {};
  const remainingCredits = currentCredits ? currentCredits.total - currentCredits.used : null;

  const StatCard = ({ label, value, sub, tone, onClick }: { label: string; value: number | string; sub?: string; tone: string; onClick?: () => void }) => (
    <Card className={`${tone} ${onClick ? 'cursor-pointer hover:bg-muted/40 transition-colors' : ''}`} onClick={onClick}>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );

  const AppointmentActions = ({ apt }: { apt: Appointment }) => {
    if (apt.status === 'scheduled' || apt.status === 'confirmed') {
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" variant="outline" className="text-green-500 border-green-500/30 hover:bg-green-500/10" onClick={() => handleUpdateStatus(apt.id, 'completed')}><Check className="w-3 h-3 mr-1" />Concluir</Button>
          <Button size="sm" variant="outline" className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10" onClick={() => handleUpdateStatus(apt.id, 'no_show')}>Faltou</Button>
          <Button size="sm" variant="outline" onClick={() => { setRescheduleTarget(apt); setRescheduleAt(''); }}><RefreshCw className="w-3 h-3 mr-1" />Remarcar</Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setCancelTarget(apt); setCancelMakeup('undecided'); setCancelReason(''); }}><X className="w-3 h-3 mr-1" />Cancelar</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Excluir agendamento?</AlertDialogTitle><AlertDialogDescription>Some do histórico. Se havia crédito reservado, ele volta pro aluno. Para manter o registro, prefira Cancelar.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(apt.id)} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    }
    if (apt.status === 'cancelled') {
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          {apt.makeup_status !== 'owed' && apt.makeup_status !== 'done' && (
            <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30" onClick={() => handleSetMakeup(apt.id, 'owed')}>Tem reposição</Button>
          )}
          {apt.makeup_status !== 'not_owed' && apt.makeup_status !== 'done' && (
            <Button size="sm" variant="outline" onClick={() => handleSetMakeup(apt.id, 'not_owed')}>Sem reposição</Button>
          )}
          {apt.makeup_status === 'owed' && (
            <Button size="sm" onClick={() => openMakeup(apt)}><Plus className="w-3 h-3 mr-1" />Agendar reposição</Button>
          )}
          {apt.makeup_status !== 'done' && (
            <Button size="sm" variant="ghost" onClick={() => handleReopen(apt.id)}><RotateCcw className="w-3 h-3 mr-1" />Reabrir</Button>
          )}
        </div>
      );
    }
    if (apt.status === 'no_show') {
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" variant="outline" className="text-green-500 border-green-500/30" onClick={() => handleUpdateStatus(apt.id, 'completed')}><Check className="w-3 h-3 mr-1" />Na verdade foi feita</Button>
        </div>
      );
    }
    return null;
  };

  const AppointmentBadges = ({ apt }: { apt: Appointment }) => (
    <div className="flex flex-wrap items-center gap-2">
      {apt.description?.includes('[VIA WHATSAPP]') && (
        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px]"><MessageCircle className="w-3 h-3 mr-1" />WhatsApp</Badge>
      )}
      <Badge className={getStatusColor(apt.status)}>{getStatusLabel(apt.status)}{apt.status === 'cancelled' && apt.cancelled_by_role ? ` ${roleLabel(apt.cancelled_by_role)}` : ''}</Badge>
      {makeupLabel(apt.makeup_status) && <Badge className={makeupColor(apt.makeup_status)}>{makeupLabel(apt.makeup_status)}</Badge>}
      {apt.makeup_for_id && <Badge className="bg-blue-500/20 text-blue-400">Reposição</Badge>}
      {!!apt.reschedule_count && apt.reschedule_count > 0 && <Badge variant="outline">Remarcada {apt.reschedule_count}x</Badge>}
      <Badge variant="outline">{getLabel(apt.appointment_type)}</Badge>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowCreditDialog(true)} className="border-primary/50 text-primary hover:bg-primary/10">
            <CreditCard className="w-4 h-4 mr-2" />Créditos
          </Button>
          <Button variant="outline" onClick={() => window.open('https://nineprogresstracker.lovable.app/', '_blank')} className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
            <Activity className="w-4 h-4 mr-2" />Avaliação Física<ExternalLink className="w-3 h-3 ml-2" />
          </Button>
          <Button variant="outline" onClick={() => window.open('https://stevent.lovable.app/fitpro-staff', '_blank')} className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
            <Users className="w-4 h-4 mr-2" />Contratar avulso (Stevent)<ExternalLink className="w-3 h-3 ml-2" />
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={openNewAppointment}>
            <Plus className="w-4 h-4 mr-2" />Novo agendamento
          </Button>
        </div>
      </div>

      {/* Solicitações via WhatsApp */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"><Bell className="w-5 h-5 text-amber-500" /></div>
              <div className="flex-1">
                <p className="font-bold text-foreground">{pendingRequests.length} solicitação(ões) pendente(s)</p>
                <p className="text-xs text-muted-foreground">Solicitações enviadas via WhatsApp aguardando confirmação</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {pendingRequests.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center justify-between bg-card rounded-lg p-2 border border-amber-500/20">
                  <div>
                    <p className="text-sm font-medium text-foreground">{req.student_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(req.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-green-500 border-green-500/30 h-7 text-xs" onClick={() => handleUpdateStatus(req.id, 'confirmed')}>
                    <Check className="w-3 h-3 mr-1" />Confirmar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navegação de mês (vale pro painel e pro calendário) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <h2 className="text-xl font-semibold capitalize min-w-[180px] text-center">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
      </div>

      {/* Números do mês */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Aulas dadas" value={t.realizadas ?? 0} sub={`${t.agendadas ?? 0} agendadas no mês`} tone="border-green-500/30" />
        <StatCard label="Canceladas" value={t.canceladas ?? 0} sub={`${t.canceladas_pelo_aluno ?? 0} aluno · ${t.canceladas_pelo_professor ?? 0} você${t.canceladas_sem_origem ? ` · ${t.canceladas_sem_origem} s/ origem` : ''}`} tone="border-destructive/30" />
        <StatCard label="Remarcações" value={t.remarcacoes ?? 0} sub={`${t.remarcacoes_pelo_aluno ?? 0} aluno · ${t.remarcacoes_pelo_professor ?? 0} você`} tone="border-blue-500/30" />
        <StatCard label="Faltas" value={t.faltas ?? 0} sub={`${t.alunos_que_cancelaram ?? 0} aluno(s) cancelaram`} tone="border-amber-500/30" />
        <StatCard label="Pendentes de baixa" value={t.pendentes_de_baixa ?? 0} sub="passaram e não foram fechadas" tone="border-purple-500/30" onClick={() => setTab('baixa')} />
        <StatCard label="Reposições" value={(Number(t.reposicoes_devidas) || 0) + (Number(t.reposicoes_a_decidir) || 0)} sub={`${t.reposicoes_devidas ?? 0} devidas · ${t.reposicoes_a_decidir ?? 0} a decidir`} tone="border-emerald-500/30" onClick={() => setTab('reposicoes')} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="mes">Calendário</TabsTrigger>
          <TabsTrigger value="alunos">Por aluno</TabsTrigger>
          <TabsTrigger value="reposicoes">Reposições{makeupList.length > 0 ? ` (${makeupList.length})` : ''}</TabsTrigger>
          <TabsTrigger value="baixa">Pendentes de baixa{pendingClose.length > 0 ? ` (${pendingClose.length})` : ''}</TabsTrigger>
        </TabsList>

        {/* ===== CALENDÁRIO ===== */}
        <TabsContent value="mes" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 text-xs mb-4">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500" /> Avaliação</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /> Aula</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /> Consultoria</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /> Via WhatsApp</span>
              </div>
              {loading ? (
                <div className="text-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Carregando...</p></div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAY_NAMES.map(day => <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>)}
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
                                  <div key={`a-${i}`} className={`w-1.5 h-1.5 rounded-full ${a.status === 'cancelled' ? 'bg-destructive' : a.description?.includes('[VIA WHATSAPP]') ? 'bg-amber-500' : getColor(a.appointment_type)}`} />
                                ))}
                                {dayBookings.slice(0, 2).map((_, i) => <div key={`b-${i}`} className="w-1.5 h-1.5 rounded-full bg-blue-400" />)}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedDay ? (
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">{format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}</h3>
                      {selectedDayAppointments.length === 0 && selectedDayBookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento neste dia</p>
                      ) : (
                        <div className="space-y-3">
                          {selectedDayAppointments.map((apt) => (
                            <div key={apt.id} className={`p-4 rounded-lg border ${apt.description?.includes('[VIA WHATSAPP]') ? 'border-amber-500/50' : getBorderColor(apt.appointment_type)} bg-card`}>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <p className="font-bold text-foreground">{apt.title}</p>
                                  <p className="text-xs text-muted-foreground">{apt.student_name} • {format(new Date(apt.scheduled_at), 'HH:mm')}{apt.duration ? ` • ${apt.duration}min` : ''}</p>
                                  {apt.location && <p className="text-xs text-muted-foreground mt-1">📍 {apt.location}</p>}
                                  {apt.description && <p className="text-xs text-muted-foreground mt-1">{apt.description}</p>}
                                  {apt.status === 'cancelled' && apt.cancel_reason && <p className="text-xs text-muted-foreground mt-1 italic">Motivo: {apt.cancel_reason}</p>}
                                </div>
                                <AppointmentBadges apt={apt} />
                              </div>
                              <AppointmentActions apt={apt} />
                            </div>
                          ))}
                          {selectedDayBookings.map((booking) => (
                            <div key={booking.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-blue-500/20">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-blue-400" /></div>
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{booking.gym_classes?.class_name || 'Aula'}</p>
                                <p className="text-xs text-muted-foreground">{booking.user_email} • {booking.gym_classes?.class_datetime ? format(new Date(booking.gym_classes.class_datetime), 'HH:mm') : ''}</p>
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
                  ) : (
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">Próximos eventos</h3>
                      {appointments.filter(a => (a.status === 'scheduled' || a.status === 'confirmed') && new Date(a.scheduled_at) >= new Date()).length === 0 ? (
                        <div className="text-center py-12">
                          <CalendarDays className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">Nenhum agendamento futuro neste mês</h3>
                          <Button onClick={openNewAppointment}><Plus className="w-4 h-4 mr-2" />Criar agendamento</Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {appointments.filter(a => (a.status === 'scheduled' || a.status === 'confirmed') && new Date(a.scheduled_at) >= new Date()).slice(0, 10).map((apt) => (
                            <div key={apt.id} className={`flex items-center gap-3 p-3 bg-muted/50 rounded-lg border ${getBorderColor(apt.appointment_type)}`}>
                              <div className={`w-10 h-10 rounded-full ${getColor(apt.appointment_type)}/20 flex items-center justify-center`}><CalendarDays className="w-5 h-5 text-foreground" /></div>
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{apt.title}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(apt.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })} • {apt.student_name}</p>
                              </div>
                              <AppointmentBadges apt={apt} />
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
        </TabsContent>

        {/* ===== POR ALUNO ===== */}
        <TabsContent value="alunos" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {(stats?.por_aluno?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem movimentação neste mês.</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[640px]">
                    <div className="grid grid-cols-7 gap-2 text-[11px] uppercase tracking-wider text-muted-foreground pb-2 border-b">
                      <span className="col-span-2">Aluno</span><span className="text-center">Feitas</span><span className="text-center">Canc.</span>
                      <span className="text-center">Faltas</span><span className="text-center">Remarc.</span><span className="text-center">Repos.</span>
                    </div>
                    {stats!.por_aluno.map((s: any) => (
                      <div key={s.athlete_id} className="grid grid-cols-7 gap-2 items-center py-2 border-b border-border/50 text-sm">
                        <span className="col-span-2 font-medium truncate">{s.aluno}{s.pendentes_de_baixa > 0 && <Badge className="ml-2 bg-purple-500/20 text-purple-400 text-[10px]">{s.pendentes_de_baixa} p/ baixar</Badge>}</span>
                        <span className="text-center text-green-500 font-semibold">{s.realizadas}</span>
                        <span className="text-center">{s.canceladas}{s.canceladas_pelo_aluno > 0 && <span className="text-[10px] text-muted-foreground"> ({s.canceladas_pelo_aluno} aluno)</span>}</span>
                        <span className="text-center text-amber-500">{s.faltas}</span>
                        <span className="text-center">{s.remarcacoes}</span>
                        <span className="text-center">{s.reposicoes_abertas > 0 ? <Badge className="bg-emerald-500/20 text-emerald-400">{s.reposicoes_abertas}</Badge> : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== REPOSIÇÕES ===== */}
        <TabsContent value="reposicoes" className="mt-4 space-y-3">
          {makeupList.length === 0 ? (
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground text-center py-8">Nenhuma reposição em aberto.</p></CardContent></Card>
          ) : makeupList.map(apt => (
            <Card key={apt.id} className={apt.makeup_status === 'undecided' ? 'border-amber-500/40' : 'border-emerald-500/30'}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{apt.student_name}</p>
                    <p className="text-xs text-muted-foreground">{apt.title} • era {format(new Date(apt.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                    {apt.cancel_reason && <p className="text-xs text-muted-foreground italic mt-1">Motivo: {apt.cancel_reason}</p>}
                  </div>
                  <AppointmentBadges apt={apt} />
                </div>
                <AppointmentActions apt={apt} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ===== PENDENTES DE BAIXA ===== */}
        <TabsContent value="baixa" className="mt-4 space-y-3">
          {pendingClose.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-400" />
              <p className="text-sm text-muted-foreground flex-1">{pendingClose.length} sessões já passaram e ainda estão abertas.</p>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-green-500 border-green-500/30">Concluir todas</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Marcar {pendingClose.length} sessões como concluídas?</AlertDialogTitle><AlertDialogDescription>Use quando as aulas aconteceram. Para faltas ou cancelamentos, feche uma a uma abaixo.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => handleCloseMany(pendingClose.map(p => p.id), 'completed')}>Concluir todas</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
          {pendingClose.length === 0 ? (
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground text-center py-8">Tudo em dia — nada pendente de baixa.</p></CardContent></Card>
          ) : pendingClose.map(apt => (
            <Card key={apt.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{apt.student_name}</p>
                    <p className="text-xs text-muted-foreground">{apt.title} • {format(new Date(apt.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                  <AppointmentBadges apt={apt} />
                </div>
                <AppointmentActions apt={apt} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* ===== Diálogo: Créditos ===== */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Créditos de aula</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Aluno</Label>
              <Select value={creditAthleteId} onValueChange={(v) => { setCreditAthleteId(v); fetchAthleteCredits(v); }}>
                <SelectTrigger><SelectValue placeholder="Buscar aluno..." /></SelectTrigger>
                <SelectContent>{athletes.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {creditAthleteId && currentCredits && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Saldo atual</p>
                <div className="flex items-center gap-4 mt-1">
                  <div><p className="text-2xl font-black text-primary">{currentCredits.total - currentCredits.used}</p><p className="text-xs text-muted-foreground">disponíveis</p></div>
                  <div className="text-xs text-muted-foreground"><p>Comprados: {currentCredits.total}</p><p>Usados: {currentCredits.used}</p></div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Quantidade (use negativo para ajustar/remover)</Label>
              <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="Ex: 8" />
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Input value={creditNote} onChange={(e) => setCreditNote(e.target.value)} placeholder="Ex: pacote de setembro" />
            </div>
            <Button onClick={handleSendCredits} disabled={savingCredits || !creditAthleteId || !creditAmount} className="w-full gap-2">
              {savingCredits ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              Confirmar
            </Button>
            {statement.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Extrato</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {statement.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between text-xs border-b border-border/50 py-1.5">
                      <div><p className="text-foreground">{s.reason}</p><p className="text-muted-foreground">{format(new Date(s.created_at), 'dd/MM HH:mm')}</p></div>
                      <span className={s.amount > 0 ? 'text-green-500 font-semibold' : 'text-muted-foreground font-semibold'}>{s.amount > 0 ? `+${s.amount}` : s.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Diálogo: Novo agendamento / reposição ===== */}
      <Dialog open={showNewAppointment} onOpenChange={(o) => { setShowNewAppointment(o); if (!o) setMakeupFor(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{makeupFor ? 'Agendar reposição' : 'Novo agendamento'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Aluno *</Label>
              <Select value={appointmentForm.athlete_id} disabled={!!makeupFor}
                onValueChange={(v) => { setAppointmentForm({ ...appointmentForm, athlete_id: v }); fetchAthleteCredits(v); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>{athletes.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
              {appointmentForm.athlete_id && currentCredits && currentCredits.total > 0 && (
                <p className="text-xs text-muted-foreground">Saldo de créditos: <span className="text-primary font-semibold">{remainingCredits}</span></p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={appointmentForm.appointment_type} disabled={!!makeupFor} onValueChange={(v) => setAppointmentForm({ ...appointmentForm, appointment_type: v })}>
                <SelectTrigger><SelectValue placeholder="Tipo de agendamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avaliacao_fisica">Avaliação Física</SelectItem>
                  <SelectItem value="aula">Aula</SelectItem>
                  <SelectItem value="consultoria">Consultoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!makeupFor && (
              <div className="flex items-center gap-2">
                <Checkbox id="multiDay" checked={appointmentForm.multiDay} onCheckedChange={(c) => setAppointmentForm({ ...appointmentForm, multiDay: !!c })} />
                <Label htmlFor="multiDay" className="text-sm cursor-pointer">Agendar múltiplos dias da semana</Label>
              </div>
            )}

            {appointmentForm.multiDay && !makeupFor ? (
              <>
                <div className="space-y-2">
                  <Label>Dias da semana *</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_NAMES.map((name, i) => (
                      <button key={i} type="button" onClick={() => toggleWeekDay(i)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${appointmentForm.selectedWeekDays.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary/50'}`}>
                        {name}
                      </button>
                    ))}
                  </div>
                  {appointmentForm.selectedWeekDays.length > 0 && (
                    <p className="text-xs text-muted-foreground">Serão criados agendamentos para todas as {appointmentForm.selectedWeekDays.map(d => DAY_NAMES[d]).join(', ')} de {format(currentDate, 'MMMM/yyyy', { locale: ptBR })}. Cada aula usa 1 crédito.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Horário *</Label>
                  <Input type="time" value={appointmentForm.time} onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })} />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Data e hora *</Label>
                <Input type="datetime-local" value={appointmentForm.scheduled_at} onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_at: e.target.value })} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Duração (min)</Label><Input type="number" value={appointmentForm.duration} onChange={(e) => setAppointmentForm({ ...appointmentForm, duration: e.target.value })} /></div>
              <div className="space-y-2"><Label>Local</Label><Input value={appointmentForm.location} placeholder="Ex: Studio 1" onChange={(e) => setAppointmentForm({ ...appointmentForm, location: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Título (opcional)</Label><Input value={appointmentForm.title} placeholder="Ex: Reavaliação mensal" onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={appointmentForm.notes} placeholder="Notas..." onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })} /></div>

            {!makeupFor && appointmentForm.appointment_type === 'aula' && currentCredits && currentCredits.total > 0 && (
              <div className="flex items-start gap-2">
                <Checkbox id="waive" checked={appointmentForm.waiveCredit} onCheckedChange={(c) => setAppointmentForm({ ...appointmentForm, waiveCredit: !!c })} />
                <Label htmlFor="waive" className="text-xs cursor-pointer text-muted-foreground">Agendar sem debitar crédito (cortesia / já pago fora)</Label>
              </div>
            )}
            {makeupFor && <p className="text-xs text-muted-foreground">Usa o crédito devolvido no cancelamento de {format(new Date(makeupFor.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}.</p>}

            <Button onClick={handleCreateAppointment} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : makeupFor ? 'Agendar reposição' : appointmentForm.multiDay ? 'Criar agendamentos' : 'Criar agendamento'}
            </Button>

            {!makeupFor && (
              <div className="pt-3 border-t border-border/60 space-y-2">
                <p className="text-xs text-muted-foreground text-center">Precisa de um profissional avulso (sem ser da sua equipe)?</p>
                <Button type="button" variant="outline" className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => window.open('https://stevent.lovable.app/fitpro-staff', '_blank')}>
                  <Users className="w-4 h-4 mr-2" />Contratar via Stevent<ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Diálogo: Cancelar ===== */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cancelar agendamento</DialogTitle></DialogHeader>
          {cancelTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">{cancelTarget.student_name} • {format(new Date(cancelTarget.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ex: aluno avisou em cima da hora" />
              </div>
              <div className="space-y-2">
                <Label>O aluno tem reposição?</Label>
                <Select value={cancelMakeup} onValueChange={(v) => setCancelMakeup(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owed">Sim — devolver o crédito</SelectItem>
                    <SelectItem value="not_owed">Não — crédito consumido</SelectItem>
                    <SelectItem value="undecided">Decidir depois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={confirmCancel} className="w-full bg-destructive hover:bg-destructive/90">Confirmar cancelamento</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Diálogo: Remarcar ===== */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(o) => { if (!o) setRescheduleTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Remarcar</DialogTitle></DialogHeader>
          {rescheduleTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">{rescheduleTarget.student_name} • hoje em {format(new Date(rescheduleTarget.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
              <div className="space-y-2"><Label>Nova data e hora *</Label><Input type="datetime-local" value={rescheduleAt} onChange={(e) => setRescheduleAt(e.target.value)} /></div>
              <div className="space-y-2"><Label>Motivo (opcional)</Label><Input value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} /></div>
              <Button onClick={confirmReschedule} className="w-full">Confirmar remarcação</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
