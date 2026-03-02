 import { useState, useEffect, useCallback } from "react";
 import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, isAfter, isBefore, addDays } from "date-fns";
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
   Plus,
   Minus,
   CheckCircle,
   AlertCircle,
   Calendar,
   Palmtree,
   ShoppingCart
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
 export default function AulasCreditos() {
   const { user } = useAuth();
   const [currentMonth, setCurrentMonth] = useState(new Date());
   const [selectedDate, setSelectedDate] = useState<Date | null>(null);
   const [classes, setClasses] = useState<GymClass[]>([]);
   const [bookings, setBookings] = useState<Booking[]>([]);
   const [credits, setCredits] = useState<StudentCredits | null>(null);
   const [loading, setLoading] = useState(true);
   const [bookingLoading, setBookingLoading] = useState<string | null>(null);
   const [athleteId, setAthleteId] = useState<string | null>(null);
   
   // Multi-select mode
   const [selectionMode, setSelectionMode] = useState(false);
   const [selectedClasses, setSelectedClasses] = useState<GymClass[]>([]);
   
   // Dialogs
   const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
   const [showVacationDialog, setShowVacationDialog] = useState(false);
   const [vacationStart, setVacationStart] = useState('');
   const [vacationEnd, setVacationEnd] = useState('');
   const [vacationReason, setVacationReason] = useState('');
    const [submittingVacation, setSubmittingVacation] = useState(false);
    const [myAppointments, setMyAppointments] = useState<MyAppointment[]>([]);
   const monthStart = startOfMonth(currentMonth);
   const monthEnd = endOfMonth(currentMonth);
   const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
 
   // Find athlete ID for current user
   useEffect(() => {
     const findAthleteId = async () => {
       if (!user) return;
       
       const { data: athlete } = await supabase
         .from('athletes')
         .select('id')
         .eq('user_id', user.id)
         .maybeSingle();
       
       if (athlete) {
         setAthleteId(athlete.id);
       } else {
         const { data: link } = await supabase
           .from('athlete_auth_link')
           .select('athlete_id')
           .eq('user_id', user.id)
           .maybeSingle();
         
         if (link) {
           setAthleteId(link.athlete_id);
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
    }, [currentMonth, user, athleteId]);
 
   const fetchClasses = async () => {
     setLoading(true);
     const start = format(monthStart, "yyyy-MM-dd");
     const end = format(monthEnd, "yyyy-MM-dd");
 
     const { data, error } = await supabase
       .from("gym_classes")
       .select("*")
       .gte("class_datetime", start)
       .lte("class_datetime", `${end}T23:59:59`)
       .order("class_datetime");
 
     if (!error && data) {
       setClasses(data);
     }
     setLoading(false);
   };
 
   const fetchBookings = async () => {
     if (!user) return;
 
     const { data, error } = await supabase
       .from("class_bookings")
       .select("id, class_id, status, credits_used, check_in_at")
       .or(`user_id.eq.${user.id},user_email.eq.${user.email}`);
 
     if (!error && data) {
       setBookings(data);
     }
   };
 
   const fetchCredits = async () => {
     if (!athleteId) return;
 
     const { data, error } = await supabase
       .from("student_credits")
       .select("total_credits, used_credits, expires_at")
       .eq("student_id", athleteId)
       .maybeSingle();
 
     if (!error && data) {
       setCredits(data);
     } else {
       // No credits found, set default
       setCredits({ total_credits: 0, used_credits: 0, expires_at: null });
     }
    };

    const fetchMyAppointments = async () => {
      if (!athleteId) return;
      const { data } = await supabase
        .from("appointments")
        .select("id, title, scheduled_at, status, appointment_type")
        .eq("student_id", athleteId)
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true })
        .limit(10);

      if (data) setMyAppointments(data);
    };

    const availableCredits = credits ? credits.total_credits - credits.used_credits : 0;
 
   const toggleClassSelection = (gymClass: GymClass) => {
     const isSelected = selectedClasses.some(c => c.id === gymClass.id);
     if (isSelected) {
       setSelectedClasses(prev => prev.filter(c => c.id !== gymClass.id));
     } else {
       setSelectedClasses(prev => [...prev, gymClass]);
     }
   };
 
   const totalCreditsRequired = selectedClasses.reduce((sum, c) => sum + (c.credits_required || 1), 0);
 
   const handleBookMultiple = async () => {
     if (!user || selectedClasses.length === 0) return;
     
     if (totalCreditsRequired > availableCredits) {
       toast.error('Créditos insuficientes');
       return;
     }
 
     setBookingLoading('multiple');
     
     try {
       // Create all bookings
       const bookingsToInsert = selectedClasses.map(gymClass => ({
         class_id: gymClass.id,
         user_id: user.id,
         user_email: user.email || "",
         status: "confirmed",
         booking_time: new Date().toISOString(),
         credits_used: gymClass.credits_required || 1
       }));
 
       const { error: bookError } = await supabase
         .from("class_bookings")
         .insert(bookingsToInsert);
 
       if (bookError) throw bookError;
 
       // Update credits
       if (athleteId) {
         const { error: creditError } = await supabase
           .from("student_credits")
           .update({ 
             used_credits: (credits?.used_credits || 0) + totalCreditsRequired 
           })
           .eq("student_id", athleteId);
 
         if (creditError) throw creditError;
       }
 
       toast.success(`${selectedClasses.length} aula(s) agendada(s)!`);
       setSelectedClasses([]);
       setSelectionMode(false);
       setShowCheckoutDialog(false);
       fetchBookings();
       fetchCredits();
     } catch (error) {
       console.error(error);
       toast.error("Erro ao agendar aulas");
     } finally {
       setBookingLoading(null);
     }
   };
 
   const handleBookClass = async (classId: string, creditsRequired: number = 1) => {
     if (!user) {
       toast.error("Faça login para agendar aulas");
       return;
     }
 
     if (creditsRequired > availableCredits) {
       toast.error("Créditos insuficientes");
       return;
     }
 
     setBookingLoading(classId);
 
     try {
       const { error: bookError } = await supabase.from("class_bookings").insert({
         class_id: classId,
         user_id: user.id,
         user_email: user.email || "",
         status: "confirmed",
         booking_time: new Date().toISOString(),
         credits_used: creditsRequired
       });
 
       if (bookError) throw bookError;
 
       // Update credits
       if (athleteId) {
         await supabase
           .from("student_credits")
           .update({ 
             used_credits: (credits?.used_credits || 0) + creditsRequired 
           })
           .eq("student_id", athleteId);
       }
 
       toast.success("Aula agendada com sucesso!");
       fetchBookings();
       fetchCredits();
     } catch (error) {
       toast.error("Erro ao agendar aula");
     } finally {
       setBookingLoading(null);
     }
   };
 
   const handleCancelBooking = async (classId: string) => {
     const booking = bookings.find((b) => b.class_id === classId);
     if (!booking) return;
 
     setBookingLoading(classId);
 
     try {
       const { error } = await supabase
         .from("class_bookings")
         .update({ 
           status: "cancelled",
           cancelled_at: new Date().toISOString()
         })
         .eq("id", booking.id);
 
       if (error) throw error;
 
       // Refund credits
       if (athleteId && booking.credits_used) {
         await supabase
           .from("student_credits")
           .update({ 
             used_credits: Math.max(0, (credits?.used_credits || 0) - booking.credits_used)
           })
           .eq("student_id", athleteId);
       }
 
       toast.success("Agendamento cancelado");
       fetchBookings();
       fetchCredits();
     } catch (error) {
       toast.error("Erro ao cancelar agendamento");
     } finally {
       setBookingLoading(null);
     }
   };
 
   const handleCheckIn = async (classId: string) => {
     const booking = bookings.find((b) => b.class_id === classId && b.status === "confirmed");
     if (!booking) return;
 
     setBookingLoading(classId);
 
     try {
       const { error } = await supabase
         .from("class_bookings")
         .update({ check_in_at: new Date().toISOString() })
         .eq("id", booking.id);
 
       if (error) throw error;
 
       toast.success("Check-in realizado!");
       fetchBookings();
     } catch (error) {
       toast.error("Erro no check-in");
     } finally {
       setBookingLoading(null);
     }
   };
 
   const handleSubmitVacation = async () => {
     if (!athleteId || !vacationStart || !vacationEnd) {
       toast.error("Preencha as datas");
       return;
     }
 
     setSubmittingVacation(true);
 
     try {
       const { error } = await supabase
         .from("vacation_requests")
         .insert({
           student_id: athleteId,
           start_date: vacationStart,
           end_date: vacationEnd,
           reason: vacationReason || null,
           status: "pending"
         });
 
       if (error) throw error;
 
       toast.success("Solicitação de férias enviada!");
       setShowVacationDialog(false);
       setVacationStart('');
       setVacationEnd('');
       setVacationReason('');
     } catch (error) {
       toast.error("Erro ao enviar solicitação");
     } finally {
       setSubmittingVacation(false);
     }
   };
 
   const isBooked = (classId: string) => {
     return bookings.some((b) => b.class_id === classId && b.status === "confirmed");
   };
 
   const hasCheckedIn = (classId: string) => {
     return bookings.some((b) => b.class_id === classId && b.check_in_at);
   };
 
   const getClassesForDate = (date: Date) => {
     return classes.filter((c) => isSameDay(new Date(c.class_datetime), date));
   };
 
   const hasClassesOnDate = (date: Date) => {
     return classes.some((c) => isSameDay(new Date(c.class_datetime), date));
   };
 
   const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
 
   return (
     <div className="min-h-screen bg-background pb-24">
       {/* Header */}
       <div className="px-4 pt-6 pb-4">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
               Aulas do Mês
             </h1>
             <p className="text-sm text-muted-foreground mt-1">
               Agende suas aulas e gerencie seus créditos
             </p>
           </div>
           <Button 
             variant="outline" 
             size="sm"
             onClick={() => setShowVacationDialog(true)}
             className="gap-2"
           >
             <Palmtree className="w-4 h-4" />
             <span className="hidden sm:inline">Férias</span>
           </Button>
         </div>
       </div>
 
       {/* Credits Banner */}
       <div className="px-4 mb-4">
         <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-sm p-4">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-primary rounded-sm flex items-center justify-center">
                 <CreditCard className="w-6 h-6 text-primary-foreground" />
               </div>
               <div>
                 <p className="text-xs text-muted-foreground uppercase tracking-wider">Créditos Disponíveis</p>
                 <p className="text-3xl font-black text-foreground">{availableCredits}</p>
               </div>
             </div>
             {credits?.expires_at && (
               <div className="text-right">
                 <p className="text-xs text-muted-foreground">Expiram em</p>
                 <p className="text-sm font-bold text-foreground">
                   {format(parseISO(credits.expires_at), "dd/MM/yyyy")}
                 </p>
               </div>
             )}
           </div>
         </div>
       </div>
 
       {/* Multi-select Mode Toggle */}
       <div className="px-4 mb-4">
         <Button
           variant={selectionMode ? "default" : "outline"}
           onClick={() => {
             setSelectionMode(!selectionMode);
             setSelectedClasses([]);
           }}
           className="w-full gap-2"
         >
           <ShoppingCart className="w-4 h-4" />
           {selectionMode ? "Cancelar Seleção" : "Selecionar Múltiplas Aulas"}
         </Button>
       </div>
 
       {/* Selection Summary */}
       {selectionMode && selectedClasses.length > 0 && (
         <div className="px-4 mb-4">
           <div className="bg-card border border-primary rounded-sm p-4">
             <div className="flex items-center justify-between mb-3">
               <div>
                 <p className="font-bold text-foreground">{selectedClasses.length} aula(s) selecionada(s)</p>
                 <p className="text-sm text-muted-foreground">Total: {totalCreditsRequired} crédito(s)</p>
               </div>
               <Button onClick={() => setShowCheckoutDialog(true)} className="gap-2">
                 <Check className="w-4 h-4" />
                 Confirmar
               </Button>
             </div>
           </div>
         </div>
       )}
 
       {/* Month Navigation */}
       <div className="px-4 mb-4">
         <div className="flex items-center justify-between bg-card border border-border rounded-sm p-3">
           <button
             onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
             className="p-2 hover:bg-muted rounded-sm transition-colors"
           >
             <ChevronLeft className="w-5 h-5 text-foreground" />
           </button>
           <span className="text-lg font-bold text-foreground capitalize">
             {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
           </span>
           <button
             onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
             className="p-2 hover:bg-muted rounded-sm transition-colors"
           >
             <ChevronRight className="w-5 h-5 text-foreground" />
           </button>
         </div>
       </div>
 
       {/* Calendar Grid */}
       <div className="px-4 mb-6">
         <div className="bg-card border border-border rounded-sm p-3">
           <div className="grid grid-cols-7 gap-1 mb-2">
             {weekDays.map((day) => (
               <div key={day} className="text-center text-[10px] font-bold uppercase text-muted-foreground py-2">
                 {day}
               </div>
             ))}
           </div>
 
           <div className="grid grid-cols-7 gap-1">
             {Array.from({ length: monthStart.getDay() }).map((_, i) => (
               <div key={`empty-${i}`} className="aspect-square" />
             ))}
 
             {daysInMonth.map((day) => {
               const hasClasses = hasClassesOnDate(day);
               const isSelected = selectedDate && isSameDay(day, selectedDate);
               const isToday = isSameDay(day, new Date());
 
               return (
                 <button
                   key={day.toString()}
                   onClick={() => setSelectedDate(isSelected ? null : day)}
                   className={`aspect-square flex flex-col items-center justify-center rounded-sm transition-all relative ${
                     isSelected
                       ? "bg-primary text-primary-foreground"
                       : isToday
                       ? "bg-primary/20 text-primary"
                       : hasClasses
                       ? "bg-muted hover:bg-muted/80"
                       : "hover:bg-muted/50"
                   }`}
                 >
                   <span className="text-sm font-medium">{format(day, "d")}</span>
                   {hasClasses && (
                     <div
                       className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                         isSelected ? "bg-primary-foreground" : "bg-primary"
                       }`}
                     />
                   )}
                 </button>
               );
             })}
           </div>
         </div>
       </div>
 
       {/* Selected Date Classes */}
       {selectedDate && (
         <div className="px-4">
           <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
             <CalendarDays className="w-4 h-4" />
             {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
           </h2>
 
           {loading ? (
             <div className="flex items-center justify-center py-8">
               <Loader2 className="w-6 h-6 animate-spin text-primary" />
             </div>
           ) : getClassesForDate(selectedDate).length === 0 ? (
             <div className="bg-card border border-border rounded-sm p-6 text-center">
               <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
               <p className="text-sm text-muted-foreground">
                 Nenhuma aula disponível neste dia
               </p>
             </div>
           ) : (
             <div className="space-y-3">
               {getClassesForDate(selectedDate).map((gymClass) => {
                 const booked = isBooked(gymClass.id);
                 const checkedIn = hasCheckedIn(gymClass.id);
                 const isLoading = bookingLoading === gymClass.id;
                 const isClassSelected = selectedClasses.some(c => c.id === gymClass.id);
                 const creditsNeeded = gymClass.credits_required || 1;
 
                 return (
                   <div
                     key={gymClass.id}
                     className={`bg-card border rounded-sm p-4 transition-all ${
                       booked ? "border-primary" : isClassSelected ? "border-green-500 bg-green-500/10" : "border-border"
                     }`}
                   >
                     <div className="flex items-start justify-between mb-3">
                       <div>
                         <h3 className="font-bold text-foreground">{gymClass.class_name}</h3>
                         {gymClass.instructor_name && (
                           <p className="text-xs text-muted-foreground">com {gymClass.instructor_name}</p>
                         )}
                       </div>
                       <div className="flex flex-col items-end gap-1">
                         {booked && (
                           <Badge className="bg-primary/20 text-primary">
                             {checkedIn ? "Check-in feito" : "Agendado"}
                           </Badge>
                         )}
                         <Badge variant="outline" className="gap-1">
                           <CreditCard className="w-3 h-3" />
                           {creditsNeeded} crédito{creditsNeeded > 1 ? 's' : ''}
                         </Badge>
                       </div>
                     </div>
 
                     <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                       <div className="flex items-center gap-1">
                         <Clock className="w-3 h-3" />
                         {format(new Date(gymClass.class_datetime), "HH:mm")}
                       </div>
                       <div className="flex items-center gap-1">
                         <MapPin className="w-3 h-3" />
                         {gymClass.location}
                       </div>
                       <div className="flex items-center gap-1">
                         <Users className="w-3 h-3" />
                         {gymClass.available_slots} vagas
                       </div>
                     </div>
 
                     {gymClass.description && (
                       <p className="text-xs text-muted-foreground mb-4">{gymClass.description}</p>
                     )}
 
                     {selectionMode && !booked ? (
                       <button
                         onClick={() => toggleClassSelection(gymClass)}
                         className={`w-full flex items-center justify-center gap-2 py-2 rounded-sm transition-colors ${
                           isClassSelected
                             ? "bg-green-500 text-white"
                             : "bg-muted text-foreground hover:bg-muted/80"
                         }`}
                       >
                         {isClassSelected ? (
                           <>
                             <Check className="w-4 h-4" />
                             <span className="text-sm font-medium">Selecionada</span>
                           </>
                         ) : (
                           <>
                             <Plus className="w-4 h-4" />
                             <span className="text-sm font-medium">Selecionar</span>
                           </>
                         )}
                       </button>
                     ) : booked ? (
                       <div className="flex gap-2">
                         {!checkedIn && (
                           <button
                             onClick={() => handleCheckIn(gymClass.id)}
                             disabled={isLoading}
                             className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                           >
                             {isLoading ? (
                               <Loader2 className="w-4 h-4 animate-spin" />
                             ) : (
                               <>
                                 <CheckCircle className="w-4 h-4" />
                                 <span className="text-sm font-medium">Check-in</span>
                               </>
                             )}
                           </button>
                         )}
                         <button
                           onClick={() => handleCancelBooking(gymClass.id)}
                           disabled={isLoading || checkedIn}
                           className="flex-1 flex items-center justify-center gap-2 py-2 bg-destructive/10 text-destructive rounded-sm hover:bg-destructive/20 transition-colors disabled:opacity-50"
                         >
                           {isLoading ? (
                             <Loader2 className="w-4 h-4 animate-spin" />
                           ) : (
                             <>
                               <X className="w-4 h-4" />
                               <span className="text-sm font-medium">Cancelar</span>
                             </>
                           )}
                         </button>
                       </div>
                     ) : (
                       <button
                         onClick={() => handleBookClass(gymClass.id, creditsNeeded)}
                         disabled={isLoading || gymClass.available_slots === 0 || creditsNeeded > availableCredits}
                         className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                       >
                         {isLoading ? (
                           <Loader2 className="w-4 h-4 animate-spin" />
                         ) : creditsNeeded > availableCredits ? (
                           <>
                             <AlertCircle className="w-4 h-4" />
                             <span className="text-sm font-medium">Créditos insuficientes</span>
                           </>
                         ) : (
                           <>
                             <Check className="w-4 h-4" />
                             <span className="text-sm font-medium">Agendar</span>
                           </>
                         )}
                       </button>
                     )}
                   </div>
                 );
               })}
             </div>
           )}
         </div>
       )}
 
       {/* Summary when no date selected */}
       {!selectedDate && (
         <div className="px-4">
           <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">
             Seus Agendamentos
           </h2>
           
           {bookings.filter((b) => b.status === "confirmed").length === 0 ? (
             <div className="bg-card border border-border rounded-sm p-6 text-center">
               <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
               <p className="text-sm text-muted-foreground">
                 Você ainda não tem aulas agendadas
               </p>
               <p className="text-xs text-muted-foreground mt-1">
                 Selecione uma data para ver as aulas disponíveis
               </p>
             </div>
           ) : (
             <div className="space-y-2">
               {bookings
                 .filter((b) => b.status === "confirmed")
                 .map((booking) => {
                   const gymClass = classes.find((c) => c.id === booking.class_id);
                   if (!gymClass) return null;
 
                   return (
                     <div
                       key={booking.id}
                       className="bg-card border border-primary/30 rounded-sm p-3 flex items-center justify-between"
                     >
                       <div>
                         <p className="font-medium text-foreground text-sm">{gymClass.class_name}</p>
                         <p className="text-xs text-muted-foreground">
                           {format(new Date(gymClass.class_datetime), "dd/MM 'às' HH:mm", { locale: ptBR })}
                         </p>
                       </div>
                       <div className="flex items-center gap-2">
                         {booking.check_in_at && (
                           <Badge variant="outline" className="text-green-500">
                             <CheckCircle className="w-3 h-3 mr-1" />
                             Check-in
                           </Badge>
                         )}
                         <button
                           onClick={() => handleCancelBooking(gymClass.id)}
                           className="text-destructive hover:text-destructive/80 transition-colors"
                           disabled={!!booking.check_in_at}
                         >
                           <X className="w-5 h-5" />
                         </button>
                       </div>
                     </div>
                   );
                 })}
             </div>
           )}
         </div>
       )}
 
       {/* Checkout Dialog */}
       <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Confirmar Agendamento</DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               {selectedClasses.map(c => (
                 <div key={c.id} className="flex items-center justify-between p-3 bg-muted rounded-sm">
                   <div>
                     <p className="font-medium">{c.class_name}</p>
                     <p className="text-xs text-muted-foreground">
                       {format(new Date(c.class_datetime), "dd/MM 'às' HH:mm", { locale: ptBR })}
                     </p>
                   </div>
                   <Badge variant="outline">{c.credits_required || 1} crédito(s)</Badge>
                 </div>
               ))}
             </div>
             <div className="flex items-center justify-between p-4 bg-primary/10 rounded-sm">
               <span className="font-bold">Total</span>
               <span className="font-bold text-lg">{totalCreditsRequired} crédito(s)</span>
             </div>
             {totalCreditsRequired > availableCredits && (
               <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-sm">
                 <AlertCircle className="w-4 h-4" />
                 <span className="text-sm">Você não tem créditos suficientes</span>
               </div>
             )}
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowCheckoutDialog(false)}>
               Cancelar
             </Button>
             <Button 
               onClick={handleBookMultiple} 
               disabled={bookingLoading === 'multiple' || totalCreditsRequired > availableCredits}
             >
               {bookingLoading === 'multiple' ? (
                 <Loader2 className="w-4 h-4 animate-spin mr-2" />
               ) : null}
               Confirmar Agendamento
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Vacation Request Dialog */}
       <Dialog open={showVacationDialog} onOpenChange={setShowVacationDialog}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <Palmtree className="w-5 h-5" />
               Solicitar Férias
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="vacationStart">Data Início</Label>
                 <Input
                   id="vacationStart"
                   type="date"
                   value={vacationStart}
                   onChange={(e) => setVacationStart(e.target.value)}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="vacationEnd">Data Fim</Label>
                 <Input
                   id="vacationEnd"
                   type="date"
                   value={vacationEnd}
                   onChange={(e) => setVacationEnd(e.target.value)}
                 />
               </div>
             </div>
             <div className="space-y-2">
               <Label htmlFor="vacationReason">Motivo (opcional)</Label>
               <Textarea
                 id="vacationReason"
                 value={vacationReason}
                 onChange={(e) => setVacationReason(e.target.value)}
                 placeholder="Ex: Viagem em família..."
                 rows={3}
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowVacationDialog(false)}>
               Cancelar
             </Button>
             <Button onClick={handleSubmitVacation} disabled={submittingVacation}>
               {submittingVacation && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
               Enviar Solicitação
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
        {/* Meus Agendamentos */}
        {myAppointments.length > 0 && (
          <div className="px-4 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">Meus Agendamentos</h2>
            <div className="space-y-2">
              {myAppointments.map((apt) => (
                <div key={apt.id} className="bg-card border border-border rounded-sm p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{apt.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(apt.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {apt.appointment_type === 'avaliacao_fisica' ? 'Avaliação' : apt.appointment_type === 'consultoria' ? 'Consultoria' : 'Aula'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <BottomNavigation />
      </div>
    );
  }