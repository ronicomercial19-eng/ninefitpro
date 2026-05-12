import { useEffect, useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

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
      const map: Record<string, number> = {};

      const { data: wp } = await supabase
        .from("workout_progress")
        .select("date, calories_burned")
        .or(`aluno_id.eq.${athleteId},athlete_id.eq.${athleteId}`)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"));
      (wp || []).forEach((d: any) => {
        map[d.date] = (map[d.date] || 0) + (d.calories_burned || 1);
      });

      const { data: ex } = await supabase
        .from("workout_executions")
        .select("completed_at, status")
        .eq("athlete_id", athleteId)
        .eq("status", "completed")
        .gte("completed_at", format(weekStart, "yyyy-MM-dd"))
        .lte("completed_at", format(addDays(weekEnd, 1), "yyyy-MM-dd"));
      (ex || []).forEach((d: any) => {
        if (!d.completed_at) return;
        const key = d.completed_at.slice(0, 10);
        map[key] = (map[key] || 0) + 1;
      });

      setWeekData(map);
    };
    fetchWeek();

    const ch = supabase
      .channel(`weekly-${athleteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workout_executions", filter: `athlete_id=eq.${athleteId}` }, fetchWeek)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [athleteId]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const lineData = days.map((day, i) => {
    const dateStr = format(addDays(weekStart, i), "yyyy-MM-dd");
    return { day, xp: weekData[dateStr] ? 25 + (weekData[dateStr] * 25) : 0 };
  });
  const totalXP = lineData.reduce((s, d) => s + d.xp, 0);
  const sessions = Object.keys(weekData).length;

  const radarData = [
    { metric: "Treino",    value: Math.min(100, sessions * 18) },
    { metric: "Nutrição",  value: 70 },
    { metric: "Sono",      value: 78 },
    { metric: "Mobilidade",value: 62 },
    { metric: "Hidratação",value: 84 },
  ];

  const orange = "hsl(20, 100%, 50%)";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-data tracking-[0.25em] text-primary/80">XP SEMANAL</p>
        <p className="text-massive text-xl text-foreground">{totalXP}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <PolarGrid stroke="hsl(0 0% 100% / 0.08)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(0 0% 70%)", fontSize: 8 }} />
              <Radar dataKey="value" stroke={orange} fill={orange} fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
              <XAxis dataKey="day" tick={{ fill: "hsl(0 0% 60%)", fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(20 100% 50% / 0.4)", borderRadius: 8, fontSize: 10 }}
                labelStyle={{ color: "hsl(20 100% 50%)" }}
              />
              <Line type="monotone" dataKey="xp" stroke={orange} strokeWidth={2} dot={{ r: 2.5, fill: orange }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <span className="text-[9px] font-data tracking-widest text-muted-foreground">7 DIAS</span>
        <span className="text-[9px] font-data tracking-widest text-primary">{sessions} SESSÕES</span>
      </div>
    </div>
  );
}
