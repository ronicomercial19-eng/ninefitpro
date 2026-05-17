import { useCallback, useEffect, useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
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

interface Metrics {
  trainingByDate: Record<string, number>;
  nutritionByDate: Record<string, number>;
  sleepAvg: number;
  mobilityAvg: number;
  hydrationAvg: number;
}

export function WeeklyProgressChart({ athleteId }: WeeklyProgressChartProps) {
  const { user } = useAuth();
  const [m, setM] = useState<Metrics>({
    trainingByDate: {},
    nutritionByDate: {},
    sleepAvg: 0,
    mobilityAvg: 0,
    hydrationAvg: 0,
  });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 7), "yyyy-MM-dd");

  const refetch = useCallback(async () => {
    if (!athleteId) return;
    const training: Record<string, number> = {};
    const nutrition: Record<string, number> = {};

    const { data: ex } = await supabase
      .from("workout_executions")
      .select("completed_at, status")
      .eq("athlete_id", athleteId)
      .eq("status", "completed")
      .gte("completed_at", weekStartStr)
      .lte("completed_at", weekEndStr);
    (ex || []).forEach((d: any) => {
      if (!d.completed_at) return;
      const key = d.completed_at.slice(0, 10);
      training[key] = (training[key] || 0) + 1;
    });

    const { data: nut } = await supabase
      .from("nutrition_logs")
      .select("logged_at")
      .eq("athlete_id", athleteId)
      .gte("logged_at", weekStartStr)
      .lte("logged_at", weekEndStr);
    (nut || []).forEach((d: any) => {
      if (!d.logged_at) return;
      const key = d.logged_at.slice(0, 10);
      nutrition[key] = (nutrition[key] || 0) + 1;
    });

    // Master registry derivado: sono / mobilidade / hidratação
    let sleepAvg = 0, mobilityAvg = 0, hydrationAvg = 0;
    if (user?.id) {
      const { data: events } = await supabase
        .from("master_registry" as any)
        .select("event_type, payload, created_at")
        .eq("user_id", user.id)
        .gte("created_at", `${weekStartStr}T00:00:00Z`)
        .lte("created_at", `${weekEndStr}T23:59:59Z`);
      const arr = (events as any[]) || [];
      const score = (type: string, field: string) => {
        const vals = arr.filter((e) => e.event_type === type).map((e) => Number(e.payload?.[field] ?? 0)).filter((n) => n > 0);
        if (!vals.length) return 0;
        return Math.round(Math.min(100, vals.reduce((s, v) => s + v, 0) / vals.length));
      };
      sleepAvg = score("sleep_log", "score");
      mobilityAvg = score("mobility_log", "score");
      hydrationAvg = score("hydration_log", "score");
    }

    setM({ trainingByDate: training, nutritionByDate: nutrition, sleepAvg, mobilityAvg, hydrationAvg });
  }, [athleteId, user?.id, weekStartStr, weekEndStr]);

  useEffect(() => { refetch(); }, [refetch]);

  useRealtimeTable(
    { table: "workout_executions", filter: athleteId ? `athlete_id=eq.${athleteId}` : undefined, enabled: !!athleteId },
    refetch,
  );
  useRealtimeTable(
    { table: "nutrition_logs", filter: athleteId ? `athlete_id=eq.${athleteId}` : undefined, enabled: !!athleteId },
    refetch,
  );
  useRealtimeTable(
    { table: "master_registry", filter: user?.id ? `user_id=eq.${user.id}` : undefined, enabled: !!user?.id },
    refetch,
  );

  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const lineData = days.map((day, i) => {
    const dateStr = format(addDays(weekStart, i), "yyyy-MM-dd");
    const sessions = m.trainingByDate[dateStr] || 0;
    return { day, xp: sessions * 50 };
  });
  const totalXP = lineData.reduce((s, d) => s + d.xp, 0);
  const sessions = Object.values(m.trainingByDate).reduce((s, v) => s + v, 0);
  const meals = Object.values(m.nutritionByDate).reduce((s, v) => s + v, 0);

  const radarData = [
    { metric: "Treino",     value: Math.min(100, sessions * 18) },
    { metric: "Nutrição",   value: Math.min(100, meals * 6) },
    { metric: "Sono",       value: m.sleepAvg },
    { metric: "Mobilidade", value: m.mobilityAvg },
    { metric: "Hidratação", value: m.hydrationAvg },
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
