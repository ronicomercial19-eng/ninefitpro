import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Users, Check, X, Loader2 } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface GymClass {
  id: string;
  class_name: string;
  class_datetime: string;
  location: string;
  instructor_name: string | null;
  available_slots: number;
  description: string | null;
}

interface Booking {
  id: string;
  class_id: string;
  status: string;
}

export default function NineFitAulas() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    fetchClasses();
    fetchBookings();
  }, [currentMonth, user]);

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
      .select("id, class_id, status")
      .or(`user_id.eq.${user.id},user_email.eq.${user.email}`);

    if (!error && data) {
      setBookings(data);
    }
  };

  const handleBookClass = async (classId: string) => {
    if (!user) {
      toast.error("Faça login para agendar aulas");
      return;
    }

    setBookingLoading(classId);

    const { error } = await supabase.from("class_bookings").insert({
      class_id: classId,
      user_id: user.id,
      user_email: user.email || "",
      status: "confirmed",
      booking_time: new Date().toISOString(),
    });

    if (error) {
      toast.error("Erro ao agendar aula");
    } else {
      toast.success("Aula agendada com sucesso!");
      fetchBookings();
    }

    setBookingLoading(null);
  };

  const handleCancelBooking = async (classId: string) => {
    const booking = bookings.find((b) => b.class_id === classId);
    if (!booking) return;

    setBookingLoading(classId);

    const { error } = await supabase
      .from("class_bookings")
      .delete()
      .eq("id", booking.id);

    if (error) {
      toast.error("Erro ao cancelar agendamento");
    } else {
      toast.success("Agendamento cancelado");
      fetchBookings();
    }

    setBookingLoading(null);
  };

  const isBooked = (classId: string) => {
    return bookings.some((b) => b.class_id === classId && b.status === "confirmed");
  };

  const getClassesForDate = (date: Date) => {
    return classes.filter((c) =>
      isSameDay(new Date(c.class_datetime), date)
    );
  };

  const hasClassesOnDate = (date: Date) => {
    return classes.some((c) => isSameDay(new Date(c.class_datetime), date));
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
          Aulas do Mês
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Agende suas aulas para o mês
        </p>
      </div>

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
          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-bold uppercase text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Month days */}
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
                const isLoading = bookingLoading === gymClass.id;

                return (
                  <div
                    key={gymClass.id}
                    className={`bg-card border rounded-sm p-4 ${
                      booked ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-foreground">
                          {gymClass.class_name}
                        </h3>
                        {gymClass.instructor_name && (
                          <p className="text-xs text-muted-foreground">
                            com {gymClass.instructor_name}
                          </p>
                        )}
                      </div>
                      {booked && (
                        <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-1 rounded-sm">
                          Agendado
                        </span>
                      )}
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
                      <p className="text-xs text-muted-foreground mb-4">
                        {gymClass.description}
                      </p>
                    )}

                    {booked ? (
                      <button
                        onClick={() => handleCancelBooking(gymClass.id)}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-destructive/10 text-destructive rounded-sm hover:bg-destructive/20 transition-colors disabled:opacity-50"
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
                    ) : (
                      <button
                        onClick={() => handleBookClass(gymClass.id)}
                        disabled={isLoading || gymClass.available_slots === 0}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
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

      {/* Summary */}
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
                        <p className="font-medium text-foreground text-sm">
                          {gymClass.class_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(gymClass.class_datetime), "dd/MM 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancelBooking(gymClass.id)}
                        className="text-destructive hover:text-destructive/80 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}
