import { useState, useEffect } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface WeeklyProgressChartProps {
  athleteId: string | null;
}

export function WeeklyProgressChart({ athleteId }: WeeklyProgressChartProps) {
  const [weekData, setWeekData] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!athleteId) return;
    const fetchWeek = async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      const { data } = await supabase
        .from("workout_progress")
        .select("date, calories_burned")
        .eq("aluno_id", athleteId)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"));

      const map: Record<string, number> = {};
      (data || []).forEach((d: any) => {
        map[d.date] = (map[d.date] || 0) + (d.calories_burned || 1);
      });
      setWeekData(map);
    };
    fetchWeek();
  }, [athleteId]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="bg-card border border-border rounded-sm p-4">
      <div className="flex items-end justify-between h-20 gap-2">
        {days.map((day, i) => {
          const dateStr = format(addDays(weekStart, i), "yyyy-MM-dd");
          const hasWorkout = !!weekData[dateStr];
          const value = hasWorkout ? 80 : 5;
          const isToday = i === (new Date().getDay() + 6) % 7;

          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-sm transition-all ${
                    hasWorkout ? "bg-primary" : "bg-muted"
                  } ${isToday ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                  style={{ height: `${value}%` }}
                />
              </div>
              <span className={`text-[10px] uppercase ${
                isToday ? "text-primary font-bold" : "text-muted-foreground"
              }`}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
