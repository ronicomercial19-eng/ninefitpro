import { getAccessToken,googleSignIn } from "@/services/googleAuth";
import { removeCalendarCommitment } from "@/services/googleCalendar";
import { serviceCreditBalance } from "@/services/athleteCardRules";
import { ServiceCreditOptions } from "@/components/9fit/ServiceCreditOptions";
import { useEffect, useMemo, useState, useCallback } from "react";
import { format, differenceInMinutes, isBefore, addMinutes, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, AlertCircle,
  Loader2, ChevronRight, History, CalendarDays, Activity, Sparkles,
} from "lucide-react";
import { useNavigate, useSearchParams,useLocation } from "react-router-dom";
import { toast } from "sonner";

import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/9fit/EmptyState";

type ApptStatus = "scheduled" | "confirmed" | "completed" | "no_show" | "cancelled" | "pending";

interface Appointment {
  id: string;
  scheduled_at: string;
  duration: number | null;
  status: ApptStatus;
  confirmed_at: string | null;
  notes: string | null;
  appointment_type: string | null;
  title: string | null;
  google_calendar_event_id: string | null;
  google_calendar_status: string;
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Realizada",
  no_show: "Perdida",
  cancelled: "Cancelada",
  pending: "Pendente",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: "bg-primary/10 text-primary border-primary/30",
    confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    no_show: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    cancelled: "bg-muted text-muted-foreground border-border",
    pending: "bg-primary/10 text-primary border-primary/30",
  };
  return (
    <Badge variant="outline" className={`text-[10px] font-medium uppercase tracking-wider ${map[status] || ""}`}>
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}

export default function AulasCreditos() {
  const { user } = useAuth();
  const { athleteId, athleteName } = useAthleteId();
  const navigate = useNavigate();
  const location=useLocation();
  const nutritionReview=(location.state as any)?.nutritionReview;
  const [searchParams] = useSearchParams();
  const staffProfessionalId = searchParams.get("staff_professional_id");
  const staffMethodId = searchParams.get("staff_method_id");
  const staffHub = searchParams.get("hub");
  const requestedTeacher=searchParams.get("teacher_id");
  const [tab,setTab]=useState(searchParams.get("tab") || "schedule");
  const [appointmentType,setAppointmentType]=useState(searchParams.get("service") || "aula");
  const [lastReserved,setLastReserved]=useState(false);
  const [creditError,setCreditError]=useState(false);
  const [creditLoading,setCreditLoading]=useState(true);
  const [duration,setDuration]=useState(60);

  const [appts, setAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [classesPerMonth, setClassesPerMonth] = useState(0);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [extractFilter, setExtractFilter] = useState<"all" | "completed" | "no_show" | "scheduled" | "cancelled">("all");

  // Schedule form
  const [date, setDate] = useState("");
  const [accountingMonth, setAccountingMonth] = useState(format(new Date(), "yyyy-MM"));
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState(nutritionReview?.summary || "");

  const todayISO = format(new Date(), "yyyy-MM-dd");

  const fetchAppointments = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    // 1. Reconcile (auto-mark past as realizada/perdida)
    await supabase.rpc("reconcile_appointments_for_user" as any);
    // 2. Fetch current month + future
    const start = startOfMonth(new Date()).toISOString();
    const { data, error } = await supabase
      .from("appointments")
      .select("id, scheduled_at, duration, status, confirmed_at, notes, appointment_type, title, google_calendar_event_id, google_calendar_status")
      .eq("student_id", athleteId)
      
      .order("scheduled_at", { ascending: false });
    if (error) toast.error("Não foi possível atualizar as aulas");
    else setAppts((data || []) as Appointment[]);
    setLoading(false);
  }, [athleteId]);

  const fetchPlan = useCallback(async () => {
    if (!athleteId) {setCreditLoading(false);return;}
    setCreditLoading(true);
    const { data: credits, error: creditsError } = await supabase
      .from("student_credits")
      .select("total_credits, used_credits, expires_at")
      .eq("student_id", athleteId)
      .maybeSingle();
    setCreditError(!!creditsError);setCreditLoading(false);
    if(creditsError){setCreditsRemaining(null);return;}
    setCreditsRemaining(serviceCreditBalance(credits,format(new Date(),"yyyy-MM-dd")));
    if (credits) {
      setClassesPerMonth(credits.total_credits);
      return;
    }
    if (!user?.email) return;
    const { data } = await supabase
      .from("user_plans")
      .select("classes_per_month")
      .eq("user_email", user.email)
      .eq("is_active", true)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setClassesPerMonth((data as any)?.classes_per_month || 0);
  }, [athleteId, user?.email]);

  useEffect(() => {
    fetchAppointments();
    fetchPlan();
  }, [fetchAppointments, fetchPlan]);

  // Realtime
  useEffect(() => {
    if (!athleteId) return;
    const channelName = `appts-${athleteId}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `student_id=eq.${athleteId}` },
        () => { fetchAppointments(); fetchPlan(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "student_credits", filter: `student_id=eq.${athleteId}` }, fetchPlan)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [athleteId, fetchAppointments, fetchPlan]);

  // ---- Derived counts ----
  const monthAppts = useMemo(() => {
    const month = new Date(`${accountingMonth}-01T12:00:00`);
    const s = startOfMonth(month);
    const e = endOfMonth(month);
    return appts.filter(a => {
      const d = parseISO(a.scheduled_at);
      return d >= s && d <= e;
    });
  }, [appts, accountingMonth]);

  const realizadasMes = monthAppts.filter(a => a.status === "completed").length;
  const perdidasMes = monthAppts.filter(a => a.status === "no_show").length;
  const agendadasMes = monthAppts.filter(a => ["scheduled", "confirmed", "pending"].includes(a.status)).length;
  const restantes = creditsRemaining;

  // ---- Actions ----
  const handleSchedule = async () => {
    if (busy) return;
    if (!athleteId) return toast.error("Perfil de atleta não encontrado");
    if (!date || !time) return toast.error("Selecione data e horário");
    if(creditLoading)return toast.error("Aguarde a atualização do saldo.");
    if(creditError)return toast.error("Atualize o saldo antes de reservar.");
    if(["aula","staff"].includes(appointmentType)&&creditsRemaining!==null&&creditsRemaining<=0){setTab("credits");return toast.error("Sem créditos disponíveis para novas aulas.");}

    const when = new Date(`${date}T${time}:00`);
    if (isBefore(when, new Date())) return toast.error("Não é possível agendar no passado");
    const usedInTargetMonth = appts.filter(a => format(parseISO(a.scheduled_at), "yyyy-MM") === date.slice(0, 7) && a.status !== "cancelled").length;
    if (creditsRemaining === null && classesPerMonth > 0 && usedInTargetMonth >= classesPerMonth) {
      return toast.error("Você já usou ou agendou todas as aulas do plano deste mês");
    }

    setBusy(true);
    try {
      const { data: athleteRow } = await supabase
        .from("athletes").select("coach_id").eq("id", athleteId).maybeSingle();

      const { data: result, error } = await supabase.rpc("fn_create_staff_appointment" as any, {
        p_athlete_id: athleteId,
        p_teacher_id: requestedTeacher || (athleteRow as any)?.coach_id || null,
        p_title: `${appointmentType === "aula" ? "Aula" : appointmentType === "avaliacao_fisica" ? "Avaliação física" : appointmentType === "consultoria" ? "Consultoria" : "Sessão Staff"} — ${athleteName || ""}`.trim(),
        p_scheduled_at: when.toISOString(),
        p_duration: duration,
        p_appointment_type: appointmentType,
        p_notes: notes || null,
        p_staff_professional_id: staffProfessionalId,
        p_staff_method_id: staffMethodId,
      });
      if (error) throw error;

      const appointmentId = (result as any)?.appointment_id;
      if (!appointmentId) throw new Error((result as any)?.error || "A reserva não foi confirmada pelo servidor");
      setAccountingMonth(date.slice(0, 7));
      if (appointmentId && staffProfessionalId) {
        const { data: external, error: externalError } = await supabase.functions.invoke("staff-api/booking", {
          body: {
            action: "booking",
            freelancer_id: staffProfessionalId,
            method: staffMethodId || "aula",
            slot: when.toISOString(),
            client_id: athleteId,
            client_name: athleteName,
            hub: staffHub,
            notes: notes || undefined,
          },
        });

        // The external adapter records a request; it does not confirm provider availability.
        if (externalError || !(external as any)?.ok) {
          toast.error("Reserva local registrada. A solicitação ao Staff externo falhou; contate o atendimento antes de repetir a reserva.");
        } else {
          toast.info("Solicitação enviada ao Staff externo. Aguarde a confirmação do profissional.");
        }

      }

      setCreditsRemaining(typeof (result as any)?.credits_remaining === "number" ? (result as any).credits_remaining : creditsRemaining);
      toast.success("Reserva registrada. Confira a confirmação e as condições do serviço na agenda.");
      setLastReserved(true);
      window.dispatchEvent(new Event("9fit:appointments-updated"));
      setDate(""); setTime(""); setNotes("");
      await Promise.all([fetchAppointments(), fetchPlan()]);
    } catch (e: any) {
      toast.error("Erro ao agendar: " + e.message);
      await Promise.all([fetchAppointments(), fetchPlan()]);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (a: Appointment) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "confirmed" as any, confirmed_at: new Date().toISOString() })
        .eq("id", a.id);
      if (error) throw error;
      toast.success("Presença confirmada");
      window.dispatchEvent(new Event("9fit:appointments-updated"));
      fetchAppointments();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally { setBusy(false); }
  };

  const handleCancel = async (a: Appointment) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", a.id);
      if (error) throw error;
      if(a.google_calendar_event_id){
        const token=getAccessToken();
        if(token){try{await removeCalendarCommitment(token,a.google_calendar_event_id);await supabase.from("appointments").update({google_calendar_status:"not_synced",google_calendar_event_id:null}).eq("id",a.id).eq("student_id",athleteId!);}catch{await supabase.from("appointments").update({google_calendar_status:"pending"}).eq("id",a.id).eq("student_id",athleteId!);toast.error("Reserva cancelada. Atualização no Google pendente; tente novamente no Extrato.");}}
        else{await supabase.from("appointments").update({google_calendar_status:"pending"}).eq("id",a.id).eq("student_id",athleteId!);toast.info("Reserva cancelada. Reconecte o Google e atualize o cancelamento no Extrato.");}
      }
      toast.success("Agendamento cancelado. Reposição e devolução seguem as condições do serviço.");
      window.dispatchEvent(new Event("9fit:appointments-updated"));
      void fetchPlan();
      fetchAppointments();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally { setBusy(false); }
  };

  async function retryCalendarCancellation(a:Appointment){
    if(!a.google_calendar_event_id||busy)return;setBusy(true);try{const token=getAccessToken()||(await googleSignIn()).accessToken;await removeCalendarCommitment(token,a.google_calendar_event_id);const {error}=await supabase.from("appointments").update({google_calendar_status:"not_synced",google_calendar_event_id:null}).eq("id",a.id).eq("student_id",athleteId!).eq("status","cancelled").select("id").single();if(error)throw error;toast.success("Cancelamento atualizado no Google");void fetchAppointments();}catch{toast.error("Não foi possível atualizar o cancelamento no Google.");}finally{setBusy(false);}
  }

  // Confirmation window: from 90 min before until start
  const canConfirm = (a: Appointment) => {
    if (a.status !== "scheduled") return false;
    const when = parseISO(a.scheduled_at);
    const minsTo = differenceInMinutes(when, new Date());
    return minsTo <= 90 && minsTo >= 0;
  };

  const upcoming = appts.filter(a =>
    (a.status === "scheduled" || a.status === "confirmed") &&
    parseISO(a.scheduled_at) >= new Date()
  );

  const filteredExtract = appts.filter(a => extractFilter === "all" ? true : extractFilter === "scheduled" ? ["scheduled", "confirmed", "pending"].includes(a.status) : a.status === extractFilter);

  // ---- Render ----
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-4 pt-6 pb-3">
        <p className="text-label">9FIT • AGENDA</p>
        <h1 className="text-display text-3xl mt-1">Aulas e avaliações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Agende, confirme e acompanhe sem sair do app.
        </p>
      </div>

      {/* Meu Plano hero */}
      <div className="px-4 mb-4">
        <div className="surface-card p-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-50 pointer-events-none"
               style={{ background: "var(--halo-primary, transparent)" }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-label">MEU PLANO</p>
                <label className="text-xs">Mês de referência<input aria-label="Mês de referência" type="month" value={accountingMonth} onChange={e => e.target.value && setAccountingMonth(e.target.value)} className="block bg-elevated rounded p-2 mt-1" /></label>
                <p className="text-xl font-bold mt-1">
                  Compromissos do mês:{" "}
                  <span className="text-primary">{realizadasMes}</span>

                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {agendadasMes} agendada{agendadasMes !== 1 ? "s" : ""} · {restantes ?? "—"} crédito{restantes !== 1 ? "s" : ""} disponível{restantes !== 1 ? "s" : ""} · {perdidasMes} perdida{perdidasMes !== 1 ? "s" : ""}
                </p>
              </div>
              <Activity className="w-8 h-8 text-primary opacity-60" />
            </div>
            {classesPerMonth > 0 && (
              <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, (classesPerMonth - (creditsRemaining ?? classesPerMonth)) / classesPerMonth * 100))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="px-4">
        <TabsList className="grid grid-cols-4 w-full bg-elevated">
          <TabsTrigger value="schedule" className="text-xs uppercase tracking-wider">
            <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Agendar
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 mr-1.5" /> Minhas
          </TabsTrigger>
          <TabsTrigger value="credits" className="text-xs">Créditos</TabsTrigger>
          <TabsTrigger value="extract" className="text-xs uppercase tracking-wider">
            <History className="w-3.5 h-3.5 mr-1.5" /> Extrato
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credits" className="mt-4"><ServiceCreditOptions /></TabsContent>
        {/* ========== AGENDAR ========== */}
        <TabsContent value="schedule" className="mt-4">
          <div className="surface-card p-5 space-y-4">
            {lastReserved && <div role="status" className="rounded-lg border border-emerald-500/30 p-3 text-sm">Reserva salva. {creditsRemaining!==null&&creditsRemaining>0 ? `Você ainda tem ${creditsRemaining} créditos de aulas: escolha a próxima data e confirme outra reserva.` : "Confira seus compromissos na aba Minhas."}<button className="block mt-2 text-primary text-xs" onClick={()=>setTab("upcoming")}>Ver reservas</button></div>}
            <label className="block text-xs">Serviço<select value={appointmentType} onChange={e=>setAppointmentType(e.target.value)} className="block mt-1 w-full rounded-lg bg-elevated border border-border p-3"><option value="aula">Aula</option><option value="staff">Sessão Staff</option><option value="avaliacao_fisica">Avaliação física</option><option value="consultoria">Consultoria</option></select></label>
            <label className="block text-xs">Duração<select className="block mt-1 w-full rounded-lg bg-elevated border border-border p-3" value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[30,45,50,60].map(minutes=><option key={minutes} value={minutes}>{minutes} minutos</option>)}</select></label>
            <p className="text-xs text-muted-foreground">{creditLoading?"Atualizando saldo…":creditError?"Saldo indisponível: atualize antes de reservar.":`${creditsRemaining ?? "—"} créditos de aulas disponíveis. Aulas e sessões Staff reservam um crédito; outros serviços seguem as condições do profissional.`}</p>
            <div className="flex items-start gap-3 text-xs text-muted-foreground bg-elevated p-3 rounded-lg">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p>
                A aula só conta como <span className="text-foreground font-medium">realizada</span> se você
                confirmar presença em até <span className="text-primary font-medium">1h antes</span> do horário.
                Sem confirmação, ela vira <span className="text-rose-400">perdida</span>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="date" className="text-xs uppercase tracking-wider text-muted-foreground">Data</Label>
                <Input
                  id="date" type="date" value={date} min={todayISO}
                  onChange={(e) => { setDate(e.target.value); if (e.target.value) setAccountingMonth(e.target.value.slice(0, 7)); }}
                  className="mt-1 bg-elevated border-border"
                />
              </div>
              <div>
                <Label htmlFor="time" className="text-xs uppercase tracking-wider text-muted-foreground">Horário</Label>
                <Input
                  id="time" type="time" value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 bg-elevated border-border"
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-xs uppercase tracking-wider text-muted-foreground">Observações (opcional)</Label>
                <Textarea
                  id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Algo que o coach deveria saber?"
                  className="mt-1 bg-elevated border-border min-h-[72px]"
                />
              </div>
            </div>

            <Button
              onClick={handleSchedule}
              disabled={busy || !date || !time || creditError || creditLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirmar reserva <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        </TabsContent>

        {/* ========== MINHAS AULAS ========== */}
        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              variant="no-data"
              title="Nenhuma aula agendada"
              description="Use a aba Agendar para marcar sua próxima sessão."
            />
          ) : upcoming.map(a => {
            const when = parseISO(a.scheduled_at);
            const confirm = canConfirm(a);
            const minsTo = differenceInMinutes(when, new Date());
            return (
              <div key={a.id} className="surface-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      <p className="text-sm font-semibold">
                        {format(when, "EEE, dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{format(when, "HH:mm")}</p>
                    {a.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{a.notes}"</p>}
                  </div>
                  <StatusBadge status={a.status} />
                </div>

                {confirm && (
                  <Button
                    onClick={() => handleConfirm(a)}
                    disabled={busy}
                    className="w-full bg-emerald-500 text-white hover:bg-emerald-600 h-11 mb-2"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar presença
                  </Button>
                )}
                {!confirm && a.status === "scheduled" && minsTo > 90 && (
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Confirmação disponível a partir de 1h30 antes do horário.
                  </p>
                )}
                {a.status === "confirmed" && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Presença confirmada
                  </div>
                )}

                <Button
                  variant="ghost" size="sm" onClick={() => handleCancel(a)}
                  disabled={busy}
                  className="w-full text-xs text-muted-foreground hover:text-rose-400"
                >
                  Cancelar agendamento
                </Button>
              </div>
            );
          })}
        </TabsContent>

        {/* ========== EXTRATO ========== */}
        <TabsContent value="extract" className="mt-4">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="surface-card p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Realizadas</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{realizadasMes}</p>
            </div>
            <div className="surface-card p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Perdidas</p>
              <p className="text-xl font-bold text-rose-400 mt-1">{perdidasMes}</p>
            </div>
            <div className="surface-card p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Restantes</p>
              <p className="text-xl font-bold text-primary mt-1">{restantes ?? "—"}</p>
            </div>
          </div>

          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {([
              ["all", "Todas"],
              ["completed", "Realizadas"],
              ["no_show", "Perdidas"],
              ["scheduled", "Agendadas"],
              ["cancelled", "Canceladas"],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setExtractFilter(k as any)}
                className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider whitespace-nowrap border transition-colors ${
                  extractFilter === k
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-elevated text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredExtract.length === 0 ? (
              <EmptyState
                variant="no-data"
                title="Sem registros"
                description="Seus agendamentos aparecerão aqui."
              />
            ) : filteredExtract.map(a => {
              const when = parseISO(a.scheduled_at);
              return (
                <div key={a.id} className="surface-card p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {format(when, "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.confirmed_at ? `Confirmada em ${format(parseISO(a.confirmed_at), "dd/MM HH:mm")}` : "Sem confirmação"}
                    </p>
                  </div>
                  <div className="space-y-2"><StatusBadge status={a.status} />{a.status==="cancelled"&&a.google_calendar_event_id&&<button disabled={busy} className="block text-xs text-primary" onClick={()=>void retryCalendarCancellation(a)}>Atualizar cancelamento no Google</button>}</div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <BottomNavigation />
    </div>
  );
}
