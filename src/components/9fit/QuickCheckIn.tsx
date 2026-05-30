import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, Clock, MapPin, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface NextClass {
  bookingId: string;
  classId: string;
  className: string;
  classDatetime: string;
  location: string;
  checkedIn: boolean;
}

export function QuickCheckIn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (user) fetchNextClass();
  }, [user]);

  const fetchNextClass = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("class_bookings")
      .select("id, class_id, check_in_at, gym_classes(class_name, class_datetime, location)")
      .or(`user_id.eq.${user.id},user_email.eq.${user.email}`)
      .eq("status", "confirmed")
      .is("check_in_at", null)
      .order("booking_time", { ascending: true })
      .limit(1);

    if (data && data.length > 0) {
      const b = data[0] as any;
      setNextClass({
        bookingId: b.id,
        classId: b.class_id,
        className: b.gym_classes?.class_name || "Aula",
        classDatetime: b.gym_classes?.class_datetime || "",
        location: b.gym_classes?.location || "",
        checkedIn: !!b.check_in_at,
      });
    }
    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!nextClass) return;
    setCheckingIn(true);
    try {
      const { error } = await supabase
        .from("class_bookings")
        .update({ check_in_at: new Date().toISOString() })
        .eq("id", nextClass.bookingId);

      if (error) throw error;
      
      // Award XP for check-in
      if (user) {
        const { data: athlete } = await supabase
          .from("athletes")
          .select("id, total_xp, level")
          .eq("user_id", user.id)
          .single();
        
        if (athlete) {
          const newXP = (athlete.total_xp || 0) + 50;
          const newLevel = Math.floor(newXP / 500) + 1;
          await supabase.from("athletes").update({ 
            total_xp: newXP, 
            level: newLevel 
          }).eq("id", athlete.id);
        }
      }

      toast.success("Check-in realizado! +50 XP ✅ — abrindo Staff");
      setNextClass(prev => prev ? { ...prev, checkedIn: true } : null);
      // Fluxo Staff: após check-in, abrir Staff para escolher serviço / suporte
      setTimeout(() => navigate("/9fit/staff?from=checkin"), 600);
    } catch {
      toast.error("Erro no check-in");
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading || !nextClass) return null;

  if (nextClass.checkedIn) {
    return (
      <button
        onClick={() => navigate("/9fit/staff?from=checkin")}
        className="w-full bg-card border border-green-500/30 rounded-sm p-4 flex items-center gap-3 text-left hover:border-green-500/60 transition"
      >
        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">Check-in feito!</p>
          <p className="text-xs text-muted-foreground">{nextClass.className} · falar com Staff</p>
        </div>
        <Users className="w-4 h-4 text-primary" />
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/40 rounded-sm p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Próxima Aula</p>
            <p className="text-sm font-bold text-foreground">{nextClass.className}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {nextClass.classDatetime && (
                <span>{format(new Date(nextClass.classDatetime), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
              )}
              {nextClass.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{nextClass.location}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handleCheckIn}
          disabled={checkingIn}
          className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-sm hover:opacity-90 transition-all flex items-center gap-2"
        >
          {checkingIn ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Check-in
            </>
          )}
        </button>
      </div>
    </div>
  );
}
