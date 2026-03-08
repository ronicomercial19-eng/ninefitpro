import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, isAfter, isBefore, addDays, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Users, 
  Check, 
  X, 
  Loader2, 
  CreditCard,
  CheckCircle,
  AlertCircle,
  Calendar,
  Palmtree,
  RefreshCw,
  HelpCircle,
  ArrowLeft,
  MessageCircle,
  Plus,
  Send
} from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

interface GymClass {
  id: string;
  class_name: string;
  class_datetime: string;
  location: string;
  instructor_name: string | null;
  available_slots: number;
  description: string | null;
  credits_required: number;
  class_type: string;
}

interface Booking {
  id: string;
  class_id: string;
  status: string;
  credits_used: number;
  check_in_at: string | null;
  booking_time: string | null;
}

interface StudentCredits {
  total_credits: number;
  used_credits: number;
  expires_at: string | null;
}

interface MyAppointment {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  appointment_type: string | null;
}

interface FixedSchedule {
  day: string;
  time: string;
}

interface ClassSchedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_slots: number;
  class_name: string;
  instructor: string | null;
  is_active: boolean;
}

const WHATSAPP_SAC = '5511988328351'; // SAC number
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function AulasCreditos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [credits, setCredits] = useState<StudentCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>('');
  
  // Scheduling dialog
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleSelectedDates, setScheduleSelectedDates] = useState<Date[]>([]);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleType, setScheduleType] = useState('aula');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [classSchedules, setClassSchedules] = useState<ClassSchedule[]>([]);

  // Dialogs
  const [showVacationDialog, setShowVacationDialog] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [vacationStart, setVacationStart] = useState('');
  const [vacationEnd, setVacationEnd] = useState('');
  const [vacationReason, setVacationReason] = useState('');
  const [submittingVacation, setSubmittingVacation] = useState(false);
  const [myAppointments, setMyAppointments] = useState<MyAppointment[]>([]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const [fixedSchedule, setFixedSchedule] = useState<FixedSchedule[]>([]);

  useEffect(() => {
    const findAthleteId = async () => {
      if (!user) return;
      const { data: athlete } = await supabase
        .from('athletes')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (athlete) {
        setAthleteId(athlete.id);
        setAthleteName(athlete.name);
      } else {
        const { data: link } = await supabase
          .from('athlete_auth_link')
          .select('athlete_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (link) {
          setAthleteId(link.athlete_id);
          const { data: a } = await supabase.from('athletes').select('name').eq('id', link.athlete_id).maybeSingle();
          if (a) setAthleteName(a.name);
        }
      }
    };
    findAthleteId();
  }, [user]);

  useEffect(() => {
    fetchClasses();
    fetchBookings();
    fetchCredits();
    fetchMyAppointments();
    fetchFixedSchedule();
    fetchClassSchedules();
  }, [currentMonth, user, athleteId]);

  const fetchClassSchedules = async () => {
    const { data } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('is_active', true);
    if (data) setClassSchedules(data as any);
  };

  const fetchClasses = async () => {
    setLoading(true);
    const start = format(monthStart, "yyyy-MM-dd");
    const end = format(monthEnd, "yyyy-MM-dd");
    const { data } = await supabase
      .from("gym_classes")
      .select("*")
      .gte("class_datetime", start)
      .lte("class_datetime", `${end}T23:59:59`)
      .order("class_datetime");
    if (data) setClasses(data);
    setLoading(false);
  };

  const fetchBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("class_bookings")
      .select("id, class_id, status, credits_used, check_in_at, booking_time")
      .or(`user_id.eq.${user.id},user_email.eq.${user.email}`);
    if (data) setBookings(data);
  };

  const fetchCredits = async () => {
    if (!athleteId) return;
    const { data } = await supabase
      .from("student_credits")
      .select("total_credits, used_credits, expires_at")
      .eq("student_id", athleteId)
      .maybeSingle();
    setCredits(data || { total_credits: 0, used_credits: 0, expires_at: null });
  };

  const fetchMyAppointments = async () => {
    if (!athleteId) return;
    const { data } = await supabase
      .from("appointments")
      .select("id, title, scheduled_at, status, appointment_type")
      .eq("student_id", athleteId)
      .neq("status", "cancelled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(10);
    if (data) setMyAppointments(data);
  };

  const fetchFixedSchedule = async () => {
    if (!athleteId) return;
    const { data } = await supabase
      .from("class_bookings")
      .select("booking_time, class_id, gym_classes(class_datetime)")
      .or(`user_id.eq.${user?.id},user_email.eq.${user?.email}`)
      .eq("status", "confirmed")
      .order("booking_time", { ascending: false })
      .limit(20);
    
    if (data && data.length > 0) {
      const dayCount: Record<string, { count: number; time: string }> = {};
      data.forEach((b: any) => {
        const dt = b.gym_classes?.class_datetime;
        if (dt) {
          const date = new Date(dt);
          const dayName = DAY_NAMES[date.getDay()];
          const time = format(date, 'HH:mm');
          const key = `${dayName}-${time}`;
          dayCount[key] = { count: (dayCount[key]?.count || 0) + 1, time };
        }
      });
      const frequent = Object.entries(dayCount)
        .filter(([_, v]) => v.count >= 2)
        .map(([k, v]) => ({ day: k.split('-')[0], time: v.time }));
      setFixedSchedule(frequent);
    }
  };

  const availableCredits = credits ? credits.total_credits - credits.used_credits : 0;
  const totalCredits = credits?.total_credits || 0;
  const usedCredits = credits?.used_credits || 0;
  const progressPercent = totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0;

  // Check if a date/time is in the class_schedules grid
  const isInGrid = (date: Date, time: string): ClassSchedule | null => {
    const dayOfWeek = getDay(date);
    return classSchedules.find(s => 
      s.day_of_week === dayOfWeek && 
      s.start_time <= time + ':00' && 
      s.end_time >= time + ':00'
    ) || null;
  };

  // Count existing appointments for a schedule slot on a given date
  const countBookingsForSlot = async (date: Date, scheduleId: string): Promise<number> => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_at', `${dateStr}T00:00:00`)
      .lte('scheduled_at', `${dateStr}T23:59:59`)
      .neq('status', 'cancelled');
    return count || 0;
  };

  const handleSmartSchedule = async () => {
    if (!athleteId || !user) { toast.error("Faça login primeiro"); return; }
    if (scheduleSelectedDates.length === 0) { toast.error("Selecione ao menos um dia"); return; }
    if (availableCredits < scheduleSelectedDates.length) { toast.error("Créditos insuficientes"); return; }

    setScheduleSaving(true);
    try {
      const inGridDates: Date[] = [];
      const outOfGridDates: Date[] = [];

      // Classify each selected date
      for (const date of scheduleSelectedDates) {
        const schedule = isInGrid(date, scheduleTime);
        if (schedule) {
          // Check if there are slots available
          const existing = await countBookingsForSlot(date, schedule.id);
          if (existing < schedule.max_slots) {
            inGridDates.push(date);
          } else {
            outOfGridDates.push(date);
          }
        } else {
          outOfGridDates.push(date);
        }
      }

      // Auto-confirm in-grid dates
      if (inGridDates.length > 0) {
        const inserts = inGridDates.map(d => ({
          student_id: athleteId,
          teacher_id: user.id,
          title: `Aula - ${athleteName}`,
          scheduled_at: `${format(d, 'yyyy-MM-dd')}T${scheduleTime}:00`,
          status: 'confirmed' as const,
          appointment_type: scheduleType,
          duration: 60,
          description: scheduleNotes || null,
        }));

        const { error } = await supabase.from('appointments').insert(inserts as any);
        if (error) throw error;

        // Debit credits
        await supabase.from('student_credits').update({
          used_credits: usedCredits + inGridDates.length
        }).eq('student_id', athleteId);

        toast.success(`${inGridDates.length} aula(s) confirmada(s) automaticamente!`);
      }

      // Redirect to WhatsApp for out-of-grid dates
      if (outOfGridDates.length > 0) {
        const datesText = outOfGridDates
          .map(d => format(d, "dd/MM (EEE)", { locale: ptBR }))
          .join(', ');
        
        const msg = encodeURIComponent(
          `Olá, sou ${athleteName}.\n\nGostaria de agendar aula nos seguintes horários:\n📅 ${datesText}\n⏰ ${scheduleTime}\n\nObrigado!`
        );
        
        toast.info(`${outOfGridDates.length} horário(s) fora da grade. Redirecionando para o WhatsApp...`, { duration: 3000 });
        
        // Also create pending appointments for tracking
        const pendingInserts = outOfGridDates.map(d => ({
          student_id: athleteId,
          teacher_id: user.id,
          title: `Solicitação - ${athleteName}`,
          scheduled_at: `${format(d, 'yyyy-MM-dd')}T${scheduleTime}:00`,
          status: 'scheduled' as const,
          appointment_type: scheduleType,
          duration: 60,
          description: `[VIA WHATSAPP] ${scheduleNotes || ''}`.trim(),
        }));

        await supabase.from('appointments').insert(pendingInserts as any);

        setTimeout(() => {
          window.open(`https://wa.me/${WHATSAPP_SAC}?text=${msg}`, '_blank');
        }, 1000);
      }

      setShowScheduleDialog(false);
      setScheduleSelectedDates([]);
      setScheduleNotes('');
      fetchMyAppointments();
      fetchCredits();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setScheduleSaving(false);
    }
  };

  const toggleScheduleDate = (date: Date) => {
    setScheduleSelectedDates(prev => {
      const exists = prev.find(d => isSameDay(d, date));
      if (exists) return prev.filter(d => !isSameDay(d, date));
      return [...prev, date];
    });
  };

  const handleBookClass = async (classId: string, creditsRequired: number = 1) => {
    if (!user) { toast.error("Faça login para agendar"); return; }
    if (creditsRequired > availableCredits) { toast.error("Créditos insuficientes"); return; }
    setBookingLoading(classId);
    try {
      const { error } = await supabase.from("class_bookings").insert({
        class_id: classId, user_id: user.id, user_email: user.email || "",
        status: "confirmed", booking_time: new Date().toISOString(), credits_used: creditsRequired
      });
      if (error) throw error;
      if (athleteId) {
        await supabase.from("student_credits").update({ 
          used_credits: (credits?.used_credits || 0) + creditsRequired 
        }).eq("student_id", athleteId);
      }
      toast.success("Aula agendada!");
      fetchBookings(); fetchCredits();
    } catch { toast.error("Erro ao agendar"); }
    finally { setBookingLoading(null); }
  };

  const handleCancelBooking = async (classId: string) => {
    const booking = bookings.find((b) => b.class_id === classId && b.status === "confirmed");
    if (!booking) return;
    setBookingLoading(classId);
    try {
      await supabase.from("class_bookings").update({ 
        status: "cancelled", cancelled_at: new Date().toISOString() 
      }).eq("id", booking.id);
      if (athleteId && booking.credits_used) {
        await supabase.from("student_credits").update({ 
          used_credits: Math.max(0, (credits?.used_credits || 0) - booking.credits_used)
        }).eq("student_id", athleteId);
      }
      toast.success("Cancelado"); fetchBookings(); fetchCredits();
    } catch { toast.error("Erro ao cancelar"); }
    finally { setBookingLoading(null); }
  };

  const handleCheckIn = async (classId: string) => {
    const booking = bookings.find((b) => b.class_id === classId && b.status === "confirmed");
    if (!booking) return;
    setBookingLoading(classId);
    try {
      await supabase.from("class_bookings").update({ check_in_at: new Date().toISOString() }).eq("id", booking.id);
      toast.success("Check-in realizado!");
      fetchBookings();
    } catch { toast.error("Erro no check-in"); }
    finally { setBookingLoading(null); }
  };

  const handleReschedule = async (classId: string) => {
    toast.info("Selecione outro horário no calendário para reagendar");
    handleCancelBooking(classId);
  };

  const handleSubmitVacation = async () => {
    if (!athleteId || !vacationStart || !vacationEnd) { toast.error("Preencha as datas"); return; }
    setSubmittingVacation(true);
    try {
      // Send via WhatsApp instead
      const msg = encodeURIComponent(
        `Olá, sou ${athleteName}.\n\nGostaria de solicitar férias/troca:\n📅 De: ${vacationStart}\n📅 Até: ${vacationEnd}\n${vacationReason ? `📝 Motivo: ${vacationReason}` : ''}\n\nObrigado!`
      );
      window.open(`https://wa.me/${WHATSAPP_SAC}?text=${msg}`, '_blank');
      toast.success("Redirecionado para WhatsApp!");
      setShowVacationDialog(false); setVacationStart(''); setVacationEnd(''); setVacationReason('');
    } catch { toast.error("Erro ao enviar solicitação"); }
    finally { setSubmittingVacation(false); }
  };

  const isBooked = (classId: string) => bookings.some((b) => b.class_id === classId && b.status === "confirmed");
  const hasCheckedIn = (classId: string) => bookings.some((b) => b.class_id === classId && b.check_in_at);
  const getClassesForDate = (date: Date) => classes.filter((c) => isSameDay(new Date(c.class_datetime), date));
  const hasClassesOnDate = (date: Date) => classes.some((c) => isSameDay(new Date(c.class_datetime), date));

  const getBookingStatus = (classId: string) => {
    const booking = bookings.find(b => b.class_id === classId);
    if (!booking) return null;
    if (booking.check_in_at) return 'checked_in';
    if (booking.status === 'confirmed') return 'confirmed';
    if (booking.status === 'cancelled') return 'cancelled';
    return booking.status;
  };

  const nextClass = classes
    .filter(c => isBooked(c.id) && !hasCheckedIn(c.id) && new Date(c.class_datetime) >= new Date())
    .sort((a, b) => new Date(a.class_datetime).getTime() - new Date(b.class_datetime).getTime())[0];

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const currentMonthName = format(currentMonth, "MMMM/yyyy", { locale: ptBR });
  const monthPeriod = `${format(monthStart, "dd/MM")} – ${format(monthEnd, "dd/MM")}`;

  const getAppointmentTypeLabel = (type: string | null) => {
    switch (type) {
      case 'avaliacao_fisica': return 'Avaliação';
      case 'aula': return 'Aula';
      case 'consultoria': return 'Consultoria';
      default: return 'Agendamento';
    }
  };

  const getAppointmentStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[10px]">Confirmado</Badge>;
      case 'scheduled': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">Pendente</Badge>;
      case 'completed': return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Concluído</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-black italic uppercase tracking-tighter text-foreground">
            9<span className="text-primary">FIT</span>
          </h1>
          <button onClick={() => setShowHowItWorks(true)} className="text-xs border border-border rounded-full px-3 py-1 text-foreground">
            Como funciona
          </button>
        </div>
        <div className="mt-4">
          <h2 className="text-3xl font-black text-foreground">Aulas</h2>
          <p className="text-sm text-muted-foreground">Agende e gerencie suas aulas</p>
        </div>
      </div>

      {/* Meu Plano Card */}
      <div className="px-4 mt-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-bold text-foreground">Meu Plano</h3>
          <p className="text-sm font-semibold text-foreground">
            Assinatura {totalCredits > 0 ? `${totalCredits > 8 ? '3' : totalCredits > 4 ? '2' : '1'}x/semana` : '—'}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {currentMonthName} ({monthPeriod})
          </p>
          
          <div className="mt-3 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-foreground">
                Aulas do mês: <span className="font-bold">{usedCredits}/{totalCredits}</span> realizadas
              </p>
              <Progress value={progressPercent} className="h-2 mt-1" />
            </div>
            <Button variant="outline" size="sm" className="ml-4 text-xs" onClick={() => setSelectedDate(null)}>
              Ver extrato
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-sm text-green-500 font-medium">Status: Ativo</span>
          </div>
        </div>
      </div>

      {/* Solicitar Agendamento Button */}
      <div className="px-4 mt-4">
        <Button 
          onClick={() => setShowScheduleDialog(true)} 
          className="w-full py-6 text-base font-bold gap-2"
          size="lg"
        >
          <Plus className="w-5 h-5" />
          Solicitar Agendamento
        </Button>
      </div>

      {/* Meus Agendamentos (real data) */}
      {myAppointments.length > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-bold text-foreground mb-3">Próximos Agendamentos</h3>
            <div className="space-y-2">
              {myAppointments.slice(0, 5).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground text-sm">{apt.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(apt.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {getAppointmentStatusBadge(apt.status)}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowVacationDialog(true)}
              className="w-full mt-3 py-2.5 bg-amber-600/20 border border-amber-600/30 rounded-lg text-amber-500 font-medium text-sm flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Solicitar troca de horário / férias
            </button>
          </div>
        </div>
      )}

      {/* Next Class Card */}
      {nextClass && (
        <div className="px-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold uppercase text-foreground">
              {format(new Date(nextClass.class_datetime), "dd 'DE' MMMM", { locale: ptBR }).toUpperCase()}
            </span>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-bold text-foreground">{nextClass.class_name}</h4>
                {nextClass.instructor_name && (
                  <p className="text-xs text-muted-foreground">— {nextClass.instructor_name}</p>
                )}
              </div>
              <div className="flex items-center gap-1 bg-green-500/20 text-green-500 text-xs font-bold px-2 py-1 rounded">
                <CheckCircle className="w-3 h-3" />
                {format(new Date(nextClass.class_datetime), "HH:mm")}
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
              <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(nextClass.class_datetime), "HH:mm")}</div>
              <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{nextClass.location}</div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => handleCheckIn(nextClass.id)} disabled={bookingLoading === nextClass.id}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-card border border-green-500/50 text-green-500 rounded-lg text-sm font-medium hover:bg-green-500/10 transition-colors">
                {bookingLoading === nextClass.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirmar
              </button>
              <button onClick={() => handleReschedule(nextClass.id)}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-card border border-amber-500/50 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/10 transition-colors">
                <RefreshCw className="w-4 h-4" />
                Reagendar
              </button>
              <button onClick={() => handleCancelBooking(nextClass.id)} disabled={bookingLoading === nextClass.id}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-card border border-destructive/50 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors">
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Realizada</span>
            <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> Agendada</span>
            <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-amber-500" /> Reagendada</span>
            <span className="flex items-center gap-1"><X className="w-3 h-3 text-destructive" /> Falta</span>
          </div>
        </div>
      )}

      {/* Month Navigation + Calendar */}
      <div className="px-4 mt-6 mb-4">
        <div className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-muted rounded transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="text-lg font-bold text-foreground capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-muted rounded transition-colors">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="px-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-[10px] font-bold uppercase text-muted-foreground py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {daysInMonth.map((day) => {
              const hasClasses = hasClassesOnDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isDayToday = isSameDay(day, new Date());
              const dayClasses = getClassesForDate(day);
              const hasBookedClass = dayClasses.some(c => isBooked(c.id));
              const hasCheckedInClass = dayClasses.some(c => hasCheckedIn(c.id));
              const hasAppointment = myAppointments.some(a => isSameDay(new Date(a.scheduled_at), day));

              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg transition-all relative ${
                    isSelected ? "bg-primary text-primary-foreground" :
                    isDayToday ? "bg-primary/20 text-primary ring-1 ring-primary" :
                    hasClasses || hasAppointment ? "bg-muted hover:bg-muted/80" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="text-sm font-medium">{format(day, "d")}</span>
                  {(hasClasses || hasAppointment) && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasCheckedInClass && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                      {hasBookedClass && !hasCheckedInClass && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />}
                      {hasAppointment && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      {!hasBookedClass && !hasAppointment && hasClasses && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground/60" : "bg-muted-foreground"}`} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Date Classes */}
      {selectedDate && (
        <div className="px-4 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : getClassesForDate(selectedDate).length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma aula disponível neste dia</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowScheduleDialog(true)}>
                <Plus className="w-4 h-4 mr-1" /> Solicitar horário
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {getClassesForDate(selectedDate).map((gymClass) => {
                const booked = isBooked(gymClass.id);
                const checkedIn = hasCheckedIn(gymClass.id);
                const isLoadingClass = bookingLoading === gymClass.id;
                const creditsNeeded = gymClass.credits_required || 1;

                return (
                  <div key={gymClass.id} className={`bg-card border rounded-lg p-4 transition-all ${
                    checkedIn ? "border-green-500/50" : booked ? "border-primary" : "border-border"
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-foreground">{gymClass.class_name}</h3>
                        {gymClass.instructor_name && (
                          <p className="text-xs text-muted-foreground">com {gymClass.instructor_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {checkedIn && <Badge className="bg-green-500/20 text-green-500 border-green-500/30">✓ Realizada</Badge>}
                        {booked && !checkedIn && <Badge className="bg-primary/20 text-primary border-primary/30">Agendada</Badge>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(gymClass.class_datetime), "HH:mm")}</div>
                      <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{gymClass.location}</div>
                      <div className="flex items-center gap-1"><Users className="w-3 h-3" />{gymClass.available_slots} vagas</div>
                    </div>

                    {booked ? (
                      <div className="grid grid-cols-3 gap-2">
                        {!checkedIn && (
                          <button onClick={() => handleCheckIn(gymClass.id)} disabled={isLoadingClass}
                            className="flex items-center justify-center gap-1 py-2 bg-green-500/10 border border-green-500/30 text-green-500 rounded-lg text-xs font-medium">
                            {isLoadingClass ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Check-in
                          </button>
                        )}
                        {!checkedIn && (
                          <button onClick={() => handleReschedule(gymClass.id)}
                            className="flex items-center justify-center gap-1 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg text-xs font-medium">
                            <RefreshCw className="w-3 h-3" /> Reagendar
                          </button>
                        )}
                        <button onClick={() => handleCancelBooking(gymClass.id)} disabled={isLoadingClass || checkedIn}
                          className="flex items-center justify-center gap-1 py-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-xs font-medium disabled:opacity-50">
                          <X className="w-3 h-3" /> Cancelar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleBookClass(gymClass.id, creditsNeeded)}
                        disabled={isLoadingClass || gymClass.available_slots === 0 || creditsNeeded > availableCredits}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                        {isLoadingClass ? <Loader2 className="w-4 h-4 animate-spin" /> :
                          creditsNeeded > availableCredits ? <><AlertCircle className="w-4 h-4" /> Créditos insuficientes</> :
                          <><Check className="w-4 h-4" /> Agendar ({creditsNeeded} crédito{creditsNeeded > 1 ? 's' : ''})</>
                        }
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Meus Agendamentos */}
      {myAppointments.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">Meus Agendamentos</h2>
          <div className="space-y-2">
            {myAppointments.map((apt) => (
              <div key={apt.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground text-sm">{apt.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(apt.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getAppointmentStatusBadge(apt.status)}
                  <Badge variant="outline" className="text-xs">{getAppointmentTypeLabel(apt.appointment_type)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings Summary */}
      {!selectedDate && (
        <div className="px-4 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">Seus Agendamentos de Aula</h2>
          {bookings.filter((b) => b.status === "confirmed").length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma aula agendada</p>
              <p className="text-xs text-muted-foreground mt-1">Use o botão "Solicitar Agendamento" acima</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.filter((b) => b.status === "confirmed").map((booking) => {
                const gymClass = classes.find((c) => c.id === booking.class_id);
                if (!gymClass) return null;
                return (
                  <div key={booking.id} className="bg-card border border-primary/30 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">{gymClass.class_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(gymClass.class_datetime), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {booking.check_in_at && <Badge variant="outline" className="text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Check-in</Badge>}
                      {!booking.check_in_at && (
                        <button onClick={() => handleCancelBooking(gymClass.id)} className="text-destructive hover:text-destructive/80"><X className="w-5 h-5" /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Schedule Dialog - Smart Scheduling */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Solicitar Agendamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Credits info */}
            <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Créditos disponíveis</p>
                <p className="text-xs text-muted-foreground">Cada aula usa 1 crédito</p>
              </div>
              <span className="text-2xl font-black text-primary">{availableCredits}</span>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={scheduleType} onValueChange={setScheduleType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aula">Aula</SelectItem>
                  <SelectItem value="avaliacao_fisica">Avaliação Física</SelectItem>
                  <SelectItem value="consultoria">Consultoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </div>

            {/* Mini Calendar for selecting days */}
            <div className="space-y-2">
              <Label>Selecione os dias ({scheduleSelectedDates.length} selecionados)</Label>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm font-bold capitalize">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</span>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekDays.map(d => <div key={d} className="text-center text-[10px] font-bold text-muted-foreground">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`e-${i}`} className="aspect-square" />)}
                  {daysInMonth.map((day) => {
                    const isSelectedForSchedule = scheduleSelectedDates.some(d => isSameDay(d, day));
                    const isPast = isBefore(day, new Date()) && !isSameDay(day, new Date());
                    const gridMatch = isInGrid(day, scheduleTime);
                    
                    return (
                      <button
                        key={day.toString()}
                        onClick={() => !isPast && toggleScheduleDate(day)}
                        disabled={isPast}
                        className={`aspect-square flex flex-col items-center justify-center rounded text-xs transition-all ${
                          isSelectedForSchedule 
                            ? "bg-primary text-primary-foreground font-bold" 
                            : isPast 
                              ? "opacity-30 cursor-not-allowed" 
                              : gridMatch 
                                ? "bg-green-500/10 hover:bg-green-500/20 text-foreground" 
                                : "hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        {format(day, "d")}
                        {gridMatch && !isSelectedForSchedule && <div className="w-1 h-1 rounded-full bg-green-500 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Na grade</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> Selecionado</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} placeholder="Ex: Prefiro horário da manhã..." rows={2} />
            </div>

            {/* Info about logic */}
            {scheduleSelectedDates.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-400">
                <p className="font-medium mb-1">ℹ️ Como funciona:</p>
                <p>• Horários <strong>disponíveis na grade</strong> serão confirmados automaticamente</p>
                <p>• Horários <strong>fora da grade</strong> serão enviados via WhatsApp para o SAC</p>
              </div>
            )}

            <Button 
              onClick={handleSmartSchedule} 
              disabled={scheduleSaving || scheduleSelectedDates.length === 0 || availableCredits < scheduleSelectedDates.length}
              className="w-full gap-2"
            >
              {scheduleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {scheduleSelectedDates.length === 0 
                ? 'Selecione os dias' 
                : availableCredits < scheduleSelectedDates.length 
                  ? 'Créditos insuficientes' 
                  : `Solicitar ${scheduleSelectedDates.length} aula(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vacation Dialog */}
      <Dialog open={showVacationDialog} onOpenChange={setShowVacationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Palmtree className="w-5 h-5" />Solicitar Férias / Troca</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data Início</Label><Input type="date" value={vacationStart} onChange={(e) => setVacationStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>Data Fim</Label><Input type="date" value={vacationEnd} onChange={(e) => setVacationEnd(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Motivo (opcional)</Label><Textarea value={vacationReason} onChange={(e) => setVacationReason(e.target.value)} placeholder="Ex: Viagem..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVacationDialog(false)}>Cancelar</Button>
            <Button onClick={handleSubmitVacation} disabled={submittingVacation} className="gap-2">
              {submittingVacation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              Enviar via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* How it works Dialog */}
      <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <DialogContent>
          <DialogHeader><DialogTitle>Como funciona</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-foreground">Horário Fixo</p>
                <p className="text-muted-foreground">O sistema detecta automaticamente sua rotina com base nas aulas frequentadas.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">Agendar Aula</p>
                <p className="text-muted-foreground">Selecione dias no calendário. Horários na grade são confirmados automaticamente. Fora da grade, enviamos para o WhatsApp do SAC.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="font-bold text-foreground">Check-in</p>
                <p className="text-muted-foreground">No dia da aula, confirme sua presença clicando em "Confirmar".</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-foreground">Reagendar</p>
                <p className="text-muted-foreground">Cancele a aula atual e selecione outro horário disponível.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Palmtree className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="font-bold text-foreground">Férias / Troca</p>
                <p className="text-muted-foreground">Solicite pausa ou alteração de horário fixo via WhatsApp.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}
