import { motion } from "framer-motion";
import { Droplet, Activity, Flame, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Metric {
  key: string;
  label: string;
  value: number;
  unit: string;
  max: number;
  Icon: typeof Droplet;
}

/**
 * Floating Metrics — 4 sensores glass premium.
 * Lê dos novos domínios bio_* (Onda 12) com fallback estimado.
 */
export function HubFloatingMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([
    { key: "water", label: "ÁGUA", value: 0, unit: "ml", max: 2500, Icon: Droplet },
    { key: "hrv", label: "HRV", value: 0, unit: "ms", max: 80, Icon: Activity },
    { key: "cal", label: "KCAL", value: 0, unit: "kcal", max: 2400, Icon: Flame },
    { key: "hr", label: "BPM", value: 0, unit: "bpm", max: 100, Icon: Heart },
  ]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [hrv, hr, act] = await Promise.all([
        supabase
          .from("bio_hrv_logs" as any)
          .select("hrv_ms")
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("bio_heart_rate_logs" as any)
          .select("bpm")
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("bio_activity_logs" as any)
          .select("calories")
          .eq("user_id", user.id)
          .gte("recorded_at", `${today}T00:00:00`)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setMetrics((prev) =>
        prev.map((m) => {
          if (m.key === "hrv") return { ...m, value: Math.round((hrv.data as any)?.hrv_ms || 0) };
          if (m.key === "hr") return { ...m, value: (hr.data as any)?.bpm || 0 };
          if (m.key === "cal") return { ...m, value: Math.round((act.data as any)?.calories || 0) };
          return m;
        })
      );
    })();
  }, [user?.id]);

  return (
    // FIX #16 (QA Master): -mt-6 puxava esse grid pra cima e sobrepunha
    // o texto do Hero (HeroSyncSection) embaixo dele. Espaçamento
    // positivo elimina a sobreposição.
    <div className="px-4 mt-3 relative z-10">
      <div className="grid grid-cols-4 gap-2">
        {metrics.map((m, i) => (
          <MetricCard key={m.key} metric={m} delay={i * 0.08} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({ metric, delay }: { metric: Metric; delay: number }) {
  const { Icon, value, max, label, unit } = metric;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const r = 14;
  const c = 2 * Math.PI * r;
  const dash = c - (pct / 100) * c;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl p-3 flex flex-col items-center justify-center text-center"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="relative w-9 h-9 mb-1.5">
        <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--border) / 0.15)" strokeWidth="2.5" />
          <motion.circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: dash }}
            transition={{ duration: 1.2, delay: delay + 0.2, ease: "easeOut" }}
          />
        </svg>
        <Icon className="absolute inset-0 m-auto w-3.5 h-3.5 text-primary" />
      </div>
      <p className="text-[8px] tracking-[0.22em] text-muted-foreground font-data">{label}</p>
      <p className="text-sm font-display text-foreground leading-tight">
        {value > 0 ? value : "—"}
        {value > 0 && <span className="text-[8px] text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </motion.div>
  );
}
