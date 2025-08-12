import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as DayPicker } from "@/components/ui/calendar";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GymClass {
  id: string;
  class_datetime: string;
  class_name: string;
  location: string;
  available_slots: number;
}

export default function ClassesCalendar({ userEmail }: { userEmail: string }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [credits, setCredits] = useState<{ remaining: number; total: number }>({ remaining: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const monthRange = useMemo(() => {
    const base = selectedDate || new Date();
    return { from: startOfMonth(base), to: endOfMonth(base) };
  }, [selectedDate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!userEmail) return;
      setLoading(true);
      try {
        const { data: creditsData } = await supabase
          .from("user_credits")
          .select("credits_remaining, total_credits")
          .eq("user_email", userEmail)
          .maybeSingle();
        if (creditsData) {
          setCredits({ remaining: creditsData.credits_remaining ?? 0, total: creditsData.total_credits ?? 0 });
        }

        const { data: classesData } = await supabase
          .from("gym_classes")
          .select("id, class_datetime, class_name, location, available_slots")
          .gte("class_datetime", monthRange.from.toISOString())
          .lte("class_datetime", monthRange.to.toISOString())
          .order("class_datetime", { ascending: true });
        setClasses(classesData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userEmail, monthRange.from, monthRange.to]);

  const dayClasses = useMemo(() => {
    if (!selectedDate) return [] as GymClass[];
    return classes.filter(c => isSameDay(new Date(c.class_datetime), selectedDate));
  }, [classes, selectedDate]);

  const handleReserve = async (gymClass: GymClass) => {
    if (!userEmail) return;
    if (credits.remaining <= 0) {
      toast.error("Você não tem créditos suficientes");
      return;
    }
    if (gymClass.available_slots <= 0) {
      toast.error("Sem vagas disponíveis");
      return;
    }

    setLoading(true);
    try {
      const { error: bookErr } = await supabase
        .from("class_bookings")
        .insert({ user_email: userEmail, class_id: gymClass.id, status: "booked" });
      if (bookErr) throw bookErr;

      const { error: creditErr } = await supabase
        .from("user_credits")
        .update({ credits_remaining: credits.remaining - 1 })
        .eq("user_email", userEmail);
      if (creditErr) throw creditErr;

      const { error: slotErr } = await supabase
        .from("gym_classes")
        .update({ available_slots: gymClass.available_slots - 1 })
        .eq("id", gymClass.id);
      if (slotErr) throw slotErr;

      toast.success("Aula reservada com sucesso!");
      // Refresh
      setCredits((c) => ({ ...c, remaining: Math.max(0, c.remaining - 1) }));
      setClasses((list) => list.map((c) => c.id === gymClass.id ? { ...c, available_slots: Math.max(0, c.available_slots - 1) } : c));
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao reservar: " + (e?.message || "erro"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Calendário de Aulas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            className="rounded-md border border-gray-800 bg-black text-white"
          />
          <div className="flex-1 space-y-2">
            <div className="text-sm text-gray-400">
              Créditos: <span className="text-white font-semibold">{credits.remaining}</span> / {credits.total}
            </div>
            {selectedDate && (
              <div className="text-white font-semibold">
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </div>
            )}
            {dayClasses.length === 0 ? (
              <div className="text-gray-400 text-sm">Nenhuma aula para o dia selecionado.</div>
            ) : (
              <div className="space-y-2">
                {dayClasses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-md bg-gray-800">
                    <div>
                      <div className="text-white font-medium">{c.class_name}</div>
                      <div className="text-gray-400 text-xs">{format(new Date(c.class_datetime), "HH:mm")} • {c.location}</div>
                      <div className="text-gray-400 text-xs">Vagas: {c.available_slots}</div>
                    </div>
                    <Button disabled={loading} onClick={() => handleReserve(c)} className="bg-white text-black hover:bg-gray-200">
                      Reservar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
