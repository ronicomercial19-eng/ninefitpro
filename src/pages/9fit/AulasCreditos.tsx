import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, isAfter, isBefore, addDays, getDay, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Users, Check, X, Loader2,
  CreditCard, CheckCircle, AlertCircle, Calendar, Palmtree, RefreshCw, HelpCircle,
  ArrowLeft, MessageCircle, Plus, Send
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

const WHATSAPP_SAC = '5511988328351';
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

  // Cancel request dialog
  const [showCancelRequestDialog, setShowCancelRequestDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelTargetType, setCancelTargetType] = useState<'booking' | 'appointment'>('booking');
  const [submittingCancel, setSubmittingCancel] = useState(false);

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
  }, [currentMonth, user, athleteId]);

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
    if (!athleteId || !user) return;
    const { data } = await supabase
      .from("class_bookings")
      .select("booking_time, class_id, gym_classes(class_datetime)")
      .or(`user_id.eq.${user.id},user_email.eq.${user.email}`)
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

  // ===== SCHEDULING: Does NOT deduct credits - credits are deducted on check-in =====
  const handleSmartSchedule = async () => {
    if (!athleteId || !user) { toast.error("Faça login primeiro"); return; }
    if (scheduleSelectedDates.length === 0) { toast.error("Selecione ao menos um dia"); return; }

    setScheduleSaving(true);
    try {
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('coach_id')
        .eq('id', athleteId)
        .single();
      
      const teacherId = athleteData?.coach_id || user.id;

      const inserts = scheduleSelectedDates.map(d => ({
        student_id: athleteId,
        teacher_id: teacherId,
        title: `${scheduleType === 'aula' ? 'Aula' : scheduleType === 'avaliacao_fisica' ? 'Avaliação' : 'Consultoria'} - ${athleteName}`,
        scheduled_at: `${format(d, 'yyyy-MM-dd')}T${scheduleTime}:00`,
        status: 'scheduled' as const,
        appointment_type: scheduleType,
        duration: 60,
        description: scheduleNotes || null,
      }));

      const { error } = await supabase.from('appointments').insert(inserts);
      if (error) throw error;

      toast.success(`${scheduleSelectedDates.length} agendamento(s) solicitado(s)!`);
      setShowScheduleDialog(false);
      setScheduleSelectedDates([]);
      setScheduleNotes('');
      fetchMyAppointments();
    } catch (error: any) {
      toast.error('Erro ao solicitar: ' + error.message);
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

  // ===== BOOK CLASS (from grid) - no credit deduction =====
  const handleBookClass = async (classId: string, creditsRequired: number = 1) => {
    if (!user) { toast.error("Faça login para agendar"); return; }
    setBookingLoading(classId);
    try {
      const { error } = await supabase.from("class_bookings").insert({
        class_id: classId, user_id: user.id, user_email: user.email || "",
        status: "confirmed", booking_time: new Date().toISOString(), credits_used: creditsRequired
      });
      if (error) throw error;
      toast.success("Aula agendada! Crédito será descontado no check-in.");
      fetchBookings();
    } catch { toast.error("Erro ao agendar"); }
    finally { setBookingLoading(null); }
  };

  // ===== CHECK-IN: Deducts 1 credit =====
  const handleCheckIn = async (classId: string) => {
    const booking = bookings.find((b) => b.class_id === classId && b.status === "confirmed");
    if (!booking) return;

    // Check available credits
    if (availableCredits < 1) {
      toast.error("Créditos insuficientes para check-in");
      return;
    }

    setBookingLoading(classId);
    try {
      await supabase.from("class_bookings").update({ check_in_at: new Date().toISOString() }).eq("id", booking.id);
      
      // Deduct 1 credit on check-in
      if (athleteId) {
        await supabase.from("student_credits").update({ 
          used_credits: (credits?.used_credits || 0) + 1 
        }).eq("student_id", athleteId);
      }

      toast.success("Check-in realizado! 1 crédito descontado.");
      fetchBookings();
      fetchCredits();
    } catch { toast.error("Erro no check-in"); }
    finally { setBookingLoading(null); }
  };

  // ===== CANCEL BOOKING: Only before check-in, with 12h rule =====
  const handleCancelBooking = async (classId: string) => {
    const booking = bookings.find((b) => b.class_id === classId && b.status === "confirmed");
    if (!booking) return;

    // If already checked in, cancel only via request
    if (booking.check_in_at) {
      setCancelTargetId(booking.id);
      setCancelTargetType('booking');
      setShowCancelRequestDialog(true);
      return;
    }

    // Check 12h rule
    const gymClass = classes.find(c => c.id === classId);
    if (gymClass) {
      const classTime = new Date(gymClass.class_datetime);
      const hoursUntil = differenceInHours(classTime, new Date());
      
      if (hoursUntil < 12) {
        // Cannot cancel, only reschedule up to 6h before
        if (hoursUntil < 6) {
          toast.error("Não é possível cancelar ou reagendar com menos de 6h de antecedência. Solicite via app.");
          setCancelTargetId(booking.id);
          setCancelTargetType('booking');
          setShowCancelRequestDialog(true);
          return;
        }
        toast.error("Cancelamento não permitido com menos de 12h. Você pode reagendar até 6h antes.");
        return;
      }
    }

    setBookingLoading(classId);
    try {
      await supabase.from("class_bookings").update({ 
        status: "cancelled", cancelled_at: new Date().toISOString() 
      }).eq("id", booking.id);
      
      toast.success("Aula cancelada");
      fetchBookings();
    } catch { toast.error("Erro ao cancelar"); }
    finally { setBookingLoading(null); }
  };

  // ===== RESCHEDULE: Only up to 6h before confirmed class =====
  const handleReschedule = async (classId: string) => {
    const gymClass = classes.find(c => c.id === classId);
    if (gymClass) {
      const classTime = new Date(gymClass.class_datetime);
      const hoursUntil = differenceInHours(classTime, new Date());
      
      if (hoursUntil < 6) {
        toast.error("Reagendamento não permitido com menos de 6h de antecedência.");
        setCancelTargetId(bookings.find(b => b.class_id === classId)?.id || null);
        setCancelTargetType('booking');
        setShowCancelRequestDialog(true);
        return;
      }
    }

    // Cancel current and open schedule dialog
    const booking = bookings.find((b) => b.class_id === classId && b.status === "confirmed");
    if (booking && !booking.check_in_at) {
      setBookingLoading(classId);
      try {
        await supabase.from("class_bookings").update({ 
          status: "cancelled", cancelled_at: new Date().toISOString() 
        }).eq("id", booking.id);
        toast.info("Aula cancelada. Selecione um novo horário.");
        fetchBookings();
      } catch { toast.error("Erro ao reagendar"); }
      finally { setBookingLoading(null); }
    }
    setShowScheduleDialog(true);
  };

  // ===== CANCEL REQUEST (post check-in or outside time window) =====
  const handleSubmitCancelRequest = async () => {
    if (!cancelReason.trim()) { toast.error("Informe o motivo do cancelamento"); return; }
    setSubmittingCancel(true);
    try {
      const msg = encodeURIComponent(
        `Olá, sou ${athleteName}.\n\n🚫 Solicito cancelamento:\n📝 Motivo: ${cancelReason}\n📅 ID: ${cancelTargetId}\n\nAguardo retorno.`
      );
      window.open(`https://wa.me/${WHATSAPP_SAC}?text=${msg}`, '_blank');
      toast.success("Solicitação enviada via WhatsApp");
      setShowCancelRequestDialog(false);
      setCancelReason('');
      setCancelTargetId(null);
    } catch { toast.error("Erro ao enviar solicitação"); }
    finally { setSubmittingCancel(false); }
  };

  const handleSubmitVacation = async () => {
    if (!athleteId || !vacationStart || !vacationEnd) { toast.error("Preencha as datas"); return; }
    setSubmittingVacation(true);
    try {
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

  const canCancelClass = (gymClass: GymClass) => {
    const classTime = new Date(gymClass.class_datetime);
    return differenceInHours(classTime, new Date()) >= 12;
  };

  const canRescheduleClass = (gymClass: GymClass) => {
    const classTime = new Date(gymClass.class_datetime);
    return differenceInHours(classTime, new Date()) >= 6;
  };

  const nextClass = classes
    .filter(c => isBooked(c.id) && !hasCheckedIn(c.id) && new Date(c.class_datetime) >= new Date())
    .sort((a, b) => new Date(a.class_datetime).getTime() - new Date(b.class_datetime).getTime())[0];

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const currentMonthName = format(currentMonth, "MMMM/yyyy", { locale: ptBR });
  const monthPeriod = `${format(monthStart, "dd/MM")} – ${format(monthEnd, "dd/MM")}`;

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
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-sm text-green-500 font-medium">Status: Ativo</span>
            </div>
            <span className="text-sm font-bold text-primary">{availableCredits} créditos restantes</span>
          </div>

          <p className="text-[10px] text-muted-foreground mt-2">
            ⚡ Créditos são descontados no check-in da aula
          </p>
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

      {/* Meus Agendamentos */}
      {myAppointments.length > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-lg font-bold text-foreground mb-3">Próximos Agendamentos</h3>
            <div className="space-y-2">
              {myAppointments.slice(0, 5).map((apt) => {
                const aptTime = new Date(apt.scheduled_at);
                const hoursUntil = differenceInHours(aptTime, new Date());
                
                return (
                  <div key={apt.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-foreground text-sm">{apt.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(aptTime, "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {hoursUntil < 12 && hoursUntil > 0 && (
                        <p className="text-[10px] text-amber-500">⚠️ Confirmação obrigatória</p>
                      )}
                    </div>
                    {getAppointmentStatusBadge(apt.status)}
                  </div>
                );
              })}
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
              <button onClick={() => handleCheckIn(nextClass.id)} disabled={bookingLoading === nextClass.id || availableCredits < 1}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-card border border-green-500/50 text-green-500 rounded-lg text-sm font-medium hover:bg-green-500/10 transition-colors disabled:opacity-50">
                {bookingLoading === nextClass.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Check-in
              </button>
              {canRescheduleClass(nextClass) ? (
                <button onClick={() => handleReschedule(nextClass.id)}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-card border border-amber-500/50 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/10 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  Reagendar
                </button>
              ) : (
                <button disabled className="flex items-center justify-center gap-1.5 py-2.5 bg-card border border-border text-muted-foreground rounded-lg text-sm font-medium opacity-50">
                  <RefreshCw className="w-4 h-4" />
                  Reagendar
                </button>
              )}
              {canCancelClass(nextClass) ? (
                <button onClick={() => handleCancelBooking(nextClass.id)} disabled={bookingLoading === nextClass.id}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-card border border-destructive/50 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors">
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              ) : (
                <button onClick={() => { setCancelTargetId(bookings.find(b => b.class_id === nextClass.id)?.id || null); setCancelTargetType('booking'); setShowCancelRequestDialog(true); }}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-card border border-amber-500/50 text-amber-500 rounded-lg text-sm font-medium hover:bg-amber-500/10 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  Solicitar
                </button>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Cancelar até 12h antes • Reagendar até 6h antes • Check-in desconta 1 crédito
            </p>
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
              <p className="text-sm text-muted-foreground">Nenhuma aula na grade neste dia</p>
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

                    {checkedIn ? (
                      /* After check-in: cancel only via request */
                      <button onClick={() => { setCancelTargetId(bookings.find(b => b.class_id === gymClass.id)?.id || null); setCancelTargetType('booking'); setShowCancelRequestDialog(true); }}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg text-xs font-medium">
                        <MessageCircle className="w-3 h-3" /> Solicitar cancelamento
                      </button>
                    ) : booked ? (
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => handleCheckIn(gymClass.id)} disabled={isLoadingClass || availableCredits < 1}
                          className="flex items-center justify-center gap-1 py-2 bg-green-500/10 border border-green-500/30 text-green-500 rounded-lg text-xs font-medium disabled:opacity-50">
                          {isLoadingClass ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Check-in
                        </button>
                        {canRescheduleClass(gymClass) ? (
                          <button onClick={() => handleReschedule(gymClass.id)}
                            className="flex items-center justify-center gap-1 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg text-xs font-medium">
                            <RefreshCw className="w-3 h-3" /> Reagendar
                          </button>
                        ) : (
                          <button disabled className="flex items-center justify-center gap-1 py-2 bg-muted border border-border text-muted-foreground rounded-lg text-xs font-medium opacity-50">
                            <RefreshCw className="w-3 h-3" /> Reagendar
                          </button>
                        )}
                        {canCancelClass(gymClass) ? (
                          <button onClick={() => handleCancelBooking(gymClass.id)} disabled={isLoadingClass}
                            className="flex items-center justify-center gap-1 py-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-xs font-medium">
                            <X className="w-3 h-3" /> Cancelar
                          </button>
                        ) : (
                          <button onClick={() => { setCancelTargetId(bookings.find(b => b.class_id === gymClass.id)?.id || null); setCancelTargetType('booking'); setShowCancelRequestDialog(true); }}
                            className="flex items-center justify-center gap-1 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg text-xs font-medium">
                            <MessageCircle className="w-3 h-3" /> Solicitar
                          </button>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => handleBookClass(gymClass.id, gymClass.credits_required || 1)}
                        disabled={isLoadingClass || gymClass.available_slots === 0}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                        {isLoadingClass ? <Loader2 className="w-4 h-4 animate-spin" /> :
                          <><Check className="w-4 h-4" /> Agendar</>
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
                      {!booking.check_in_at && canCancelClass(gymClass) && (
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

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Solicitar Agendamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Créditos disponíveis</p>
                <p className="text-xs text-muted-foreground">Descontados no check-in</p>
              </div>
              <span className="text-2xl font-black text-primary">{availableCredits}</span>
            </div>

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

            <div className="space-y-2">
              <Label>Horário</Label>
              <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </div>

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
                              : "hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} placeholder="Ex: Prefiro horário da manhã..." rows={2} />
            </div>

            {scheduleSelectedDates.length > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs text-primary">
                <p className="font-medium mb-1">📋 Agendamento livre</p>
                <p>Solicitação será enviada para confirmação. Créditos descontados no check-in.</p>
              </div>
            )}

            <Button 
              onClick={handleSmartSchedule} 
              disabled={scheduleSaving || scheduleSelectedDates.length === 0}
              className="w-full gap-2"
            >
              {scheduleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {scheduleSelectedDates.length === 0 
                ? 'Selecione os dias' 
                : `Solicitar ${scheduleSelectedDates.length} aula(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Request Dialog (post check-in or outside time window) */}
      <Dialog open={showCancelRequestDialog} onOpenChange={setShowCancelRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageCircle className="w-5 h-5" />Solicitar Cancelamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-500">
              <p className="font-medium">⚠️ Cancelamento fora do prazo</p>
              <p>Cancelamentos após check-in ou com menos de 12h de antecedência devem ser solicitados com motivo.</p>
            </div>
            <div className="space-y-2">
              <Label>Motivo do cancelamento *</Label>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Explique o motivo..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelRequestDialog(false)}>Voltar</Button>
            <Button onClick={handleSubmitCancelRequest} disabled={submittingCancel || !cancelReason.trim()} className="gap-2">
              {submittingCancel ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vacation Dialog */}
      <Dialog open={showVacationDialog} onOpenChange={setShowVacationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5" />Solicitar Troca / Férias</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {myAppointments.length > 0 && (
              <div className="space-y-2">
                <Label>Selecione a(s) aula(s) para trocar (opcional)</Label>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-muted rounded-lg p-2">
                  {myAppointments.map((apt) => (
                    <label key={apt.id} className="flex items-center gap-2 p-2 rounded hover:bg-background cursor-pointer text-sm">
                      <input type="checkbox" className="accent-primary" value={apt.id} />
                      <span className="text-foreground">{apt.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(apt.scheduled_at), "dd/MM HH:mm")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nova Data Início</Label><Input type="date" value={vacationStart} onChange={(e) => setVacationStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>Nova Data Fim</Label><Input type="date" value={vacationEnd} onChange={(e) => setVacationEnd(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Motivo / Novo horário desejado</Label><Textarea value={vacationReason} onChange={(e) => setVacationReason(e.target.value)} placeholder="Ex: Gostaria de trocar para terças às 10h..." rows={3} /></div>
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

      {/* How it works */}
      <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <DialogContent>
          <DialogHeader><DialogTitle>Como funciona</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">Solicitar Agendamento</p>
                <p className="text-muted-foreground">Selecione dias e horário. Agendamentos livres com ou sem aula na grade.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-foreground">Check-in = 1 crédito</p>
                <p className="text-muted-foreground">No dia da aula, faça check-in. Isso desconta 1 crédito automaticamente.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="font-bold text-foreground">Cancelamento</p>
                <p className="text-muted-foreground">Cancelar até 12h antes da aula. Após esse prazo, apenas via solicitação.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-foreground">Reagendamento</p>
                <p className="text-muted-foreground">Reagendar até 6h antes da aula confirmada.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="font-bold text-foreground">Após Check-in</p>
                <p className="text-muted-foreground">Cancelamento somente via solicitação com envio do motivo.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}
