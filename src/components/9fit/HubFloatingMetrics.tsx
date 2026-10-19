import { motion } from "framer-motion";
import { Dumbbell, Utensils, Droplet, HeartPulse } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useNutritionToday } from "@/hooks/useNutritionToday";
import { VitalLogDialog } from "./VitalLogDialog";
import type { HubMetric } from "@/hooks/useAthleteScores";

// Topo do Hub = ESTADO do dia (feito/pendente). Ação (iniciar) fica na linha de CTAs.
interface Props { vitals?: { water: HubMetric; hrv: HubMetric; calories: HubMetric; heart_rate: HubMetric; }; }
interface StateCard {
  key: string;
  label: string;
  value: string;
  unit?: string;
  Icon: typeof Dumbbell;
  pct: number;
  attention: boolean;
  aria: string;
  onClick: () => void;
}

const isAvailable = (m?: HubMetric) => !!m && m.status === "available" && m.value !== null;

export function HubFloatingMetrics({ vitals }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { athleteId } = useAthleteId();
  const nutrition = useNutritionToday(athleteId);
  const [vital, setVital] = useState<"hrv" | "heart_rate" | null>(null);
  const [trainedToday, setTrainedToday] = useState(false);

  useEffect(() => {
    let active = true;
    const date = format(new Date(), "yyyy-MM-dd");
    async function refresh() {
      if (!user?.id || !athleteId) { if (active) setTrainedToday(false); return; }
      const [registry, workouts] = await Promise.all([
        supabase.from("master_registry").select("id").eq("user_id", user.id).eq("source", "fitpro_daily_checkin").contains("payload", { date, kind: "treino" }).limit(1),
        supabase.from("workout_executions").select("id").eq("athlete_id", athleteId).eq("workout_date", date).eq("status", "completed").limit(1),
      ]);
      if (!active || registry.error || workouts.error) return;
      setTrainedToday((registry.data?.length ?? 0) > 0 || (workouts.data?.length ?? 0) > 0);
    }
    void refresh();
    const events = ["9fit:sync_updated", "9fit:workout-updated"];
    events.forEach((e) => window.addEventListener(e, refresh));
    return () => { active = false; events.forEach((e) => window.removeEventListener(e, refresh)); };
  }, [user?.id, athleteId]);

  const meals = nutrition.meals.length;
  const waterGoal = Number(nutrition.goals.water) || 2500;
  const hrvOk = isAvailable(vitals?.hrv);
  const hrOk = isAvailable(vitals?.heart_rate);
  const signals = (hrvOk ? 1 : 0) + (hrOk ? 1 : 0);
  const missingVital = [
    { vital: 'hrv' as const, available: hrvOk },
    { vital: 'heart_rate' as const, available: hrOk },
  ].find((item) => !item.available)?.vital;

  const cards: StateCard[] = [
    {
      key: "treino", label: "TREINO", value: trainedToday ? "FEITO" : "PENDENTE", Icon: Dumbbell,
      pct: trainedToday ? 100 : 0, attention: !trainedToday,
      aria: `Treino de hoje: ${trainedToday ? "feito" : "pendente"}`,
      onClick: () => navigate("/9fit/train"),
    },
    {
      key: "refeicao", label: "REFEIÇÃO", value: String(meals), unit: meals === 1 ? "hoje" : "hoje", Icon: Utensils,
      pct: Math.min(100, (meals / 4) * 100), attention: meals === 0,
      aria: `Refeições registradas hoje: ${meals}`,
      onClick: () => navigate("/9fit/dieta?action=log"),
    },
    {
      key: "agua", label: "ÁGUA", value: String(nutrition.waterMl), unit: "ml", Icon: Droplet,
      pct: Math.min(100, (nutrition.waterMl / waterGoal) * 100), attention: false,
      aria: `Água hoje: ${nutrition.waterMl} ml`,
      onClick: () => navigate("/9fit/dieta?action=water#hydration"),
    },
    {
      key: "saude", label: "SAÚDE", value: `${signals}/2`, Icon: HeartPulse,
      pct: (signals / 2) * 100, attention: signals === 0,
      aria: `Sinais de saúde registrados: ${signals} de 2 (HRV e BPM)`,
      onClick: () => setVital(missingVital ?? "hrv"),
    },
  ];

  return (
    <div className="relative z-10">
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, index) => <StateTile key={card.key} card={card} delay={index * 0.08} />)}
      </div>
      <VitalLogDialog metric={vital} onClose={() => setVital(null)} />
    </div>
  );
}

function StateTile({ card, delay }: { card: StateCard; delay: number }) {
  const { Icon, label, value, unit, pct, attention, aria, onClick } = card;
  const r = 14;
  const circumference = 2 * Math.PI * r;
  const dash = circumference - (pct / 100) * circumference;
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }}
      onClick={onClick}
      aria-label={aria}
      className={`hub-card-interactive rounded-2xl border backdrop-blur-xl p-3 flex flex-col items-center justify-center text-center transition bg-white/[0.04] ${attention ? "border-primary/30" : "border-white/[0.06]"}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="relative w-9 h-9 mb-1.5">
        <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--border) / 0.15)" strokeWidth="2.5" />
          <motion.circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: dash }} transition={{ duration: 1.2, delay: delay + 0.2, ease: "easeOut" }} />
        </svg>
        <Icon className="absolute inset-0 m-auto w-3.5 h-3.5 text-primary" />
      </div>
      <p className="text-[8px] tracking-[0.22em] text-muted-foreground font-data">{label}</p>
      <p className="text-[11px] font-display text-foreground leading-tight">
        {value}
        {unit && <span className="text-[8px] text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </motion.button>
  );
}
