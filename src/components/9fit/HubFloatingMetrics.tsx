import { motion } from "framer-motion";
import { Droplet, Activity, Flame, Heart, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { HubMetric } from "@/hooks/useAthleteScores";

interface Props {
  vitals?: {
    water: HubMetric;
    hrv: HubMetric;
    calories: HubMetric;
    heart_rate: HubMetric;
  };
}

interface Metric {
  key: string;
  label: string;
  unit: string;
  max: number;
  Icon: typeof Droplet;
  data: HubMetric;
  ctaRoute: string;
}

const missing: HubMetric = { value: null, status: "not_collected", source: null, observed_at: null };

export function HubFloatingMetrics({ vitals }: Props) {
  const metrics: Metric[] = [
    { key: "water", label: "ÁGUA", unit: "ml", max: 2500, Icon: Droplet, data: vitals?.water ?? missing, ctaRoute: "/9fit/foods" },
    { key: "hrv", label: "HRV", unit: "ms", max: 80, Icon: Activity, data: vitals?.hrv ?? missing, ctaRoute: "/9fit/elite-bio" },
    { key: "cal", label: "KCAL", unit: "kcal", max: 2400, Icon: Flame, data: vitals?.calories ?? missing, ctaRoute: "/9fit/train" },
    { key: "hr", label: "BPM", unit: "bpm", max: 100, Icon: Heart, data: vitals?.heart_rate ?? missing, ctaRoute: "/9fit/elite-bio" },
  ];

  return (
    <div className="px-4 -mt-6 relative z-10">
      <div className="grid grid-cols-4 gap-2">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.key} metric={metric} delay={index * 0.08} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({ metric, delay }: { metric: Metric; delay: number }) {
  const navigate = useNavigate();
  const { Icon, max, label, unit, data } = metric;
  const available = data.status === "available" && data.value !== null;
  const stale = data.status === "stale" && data.value !== null;
  const value = data.value;
  const pct = value !== null && max > 0 ? Math.min(100, Math.max(0, value / max * 100)) : 0;
  const r = 14;
  const circumference = 2 * Math.PI * r;
  const dash = circumference - pct / 100 * circumference;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }}
      onClick={() => !available && navigate(metric.ctaRoute)}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl p-3 flex flex-col items-center justify-center text-center"
      style={{ boxShadow: "var(--shadow-card)" }}
      aria-label={available ? `${label}: ${value} ${unit}` : `${label}: adicionar dado`}
    >
      <div className="relative w-9 h-9 mb-1.5">
        <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--border) / 0.15)" strokeWidth="2.5" />
          <motion.circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5"
            strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dash }} transition={{ duration: 1.2, delay: delay + 0.2, ease: "easeOut" }} />
        </svg>
        <Icon className="absolute inset-0 m-auto w-3.5 h-3.5 text-primary" />
      </div>
      <p className="text-[8px] tracking-[0.22em] text-muted-foreground font-data">{label}</p>
      <p className="text-sm font-display text-foreground leading-tight">
        {value !== null ? Math.round(value) : "—"}
        {value !== null && <span className="text-[8px] text-muted-foreground ml-0.5">{unit}</span>}
      </p>
      {stale && <span className="text-[7px] text-amber-400 mt-0.5">desatualizado</span>}
      {!available && !stale && <Plus className="w-2.5 h-2.5 text-muted-foreground mt-1" aria-hidden />}
    </motion.button>
  );
}
