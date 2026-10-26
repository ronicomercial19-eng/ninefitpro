import { useEffect, useState } from "react";
import { ResponsiveContainer, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type RunPoint = { date: string; km: number; speed: number; pace: string };

const formatPace = (secondsPerKm: number) => {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "—";
  const min = Math.floor(secondsPerKm / 60);
  const sec = Math.round(secondsPerKm % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
};

function RunTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: RunPoint = payload[0].payload;
  return (
    <div style={{ backgroundColor: "#111", border: "none", fontSize: 12, padding: "8px 10px", borderRadius: 8 }}>
      <div style={{ color: "#fff", fontWeight: 600 }}>{p.date}</div>
      <div style={{ color: "#ff6b2c" }}>Velocidade: {p.speed.toFixed(1)} km/h</div>
      <div style={{ color: "#fff" }}>KM: {p.km.toFixed(2)}</div>
      <div style={{ color: "#a3a3a3" }}>Pace: {p.pace} /km</div>
    </div>
  );
}

export function ProgressGraph() {
  const { user } = useAuth();
  const [data, setData] = useState<RunPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setData([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void (supabase as any)
      .from("bio_activity_logs")
      .select("distance_m,duration_seconds,recorded_at")
      .eq("user_id", user.id)
      .eq("source", "move_gps")
      .gte("distance_m", 200)
      .gte("duration_seconds", 120)
      .order("recorded_at", { ascending: false })
      .limit(10)
      .then(({ data: rows, error }: any) => {
        if (!active) return;
        setLoading(false);
        if (error) {
          setData([]);
          return;
        }
        const points: RunPoint[] = (rows || [])
          .map((r: any) => {
            const km = Number(r.distance_m || 0) / 1000;
            const sec = Number(r.duration_seconds || 0);
            if (km <= 0 || sec <= 0) return null;
            return {
              date: new Date(r.recorded_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
              km,
              speed: km / (sec / 3600),
              pace: formatPace(sec / km),
            };
          })
          .filter(Boolean)
          .reverse() as RunPoint[];
        setData(points);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  return (
    <div className="mx-5 mt-5 p-4 rounded-xl bg-white/[0.02] border border-white/10">
      <h3 className="text-white font-semibold mb-4 text-sm">Progressão de Velocidade vs KM</h3>
      <div className="h-48">
        {loading ? null : data.length < 2 ? (
          <div className="h-full flex items-center justify-center text-xs text-neutral-400 text-center px-4">
            Registre mais corridas para ver sua evolução
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6b2c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff6b2c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" fontSize={10} />
              <YAxis stroke="#666" fontSize={10} />
              <Tooltip content={<RunTooltip />} />
              <Area type="monotone" dataKey="speed" stroke="#ff6b2c" fillOpacity={1} fill="url(#colorSpeed)" name="Velocidade (km/h)" />
              <Line type="monotone" dataKey="km" stroke="#ffffff" strokeWidth={2} name="KM" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
