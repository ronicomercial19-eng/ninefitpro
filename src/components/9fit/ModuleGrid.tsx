import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LucideIcon, Users, Brain, Crown, ShoppingBag, TrendingUp, Dumbbell, Film, Apple } from "lucide-react";

interface ModuleDef {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const MODULES: ModuleDef[] = [
  { key: "community", label: "FitCommunity", icon: Users, path: "/9fit/community" },
  { key: "ron", label: "O Ron", icon: Brain, path: "/9fit/ron" },
  { key: "primepass", label: "PrimePass", icon: Crown, path: "/9fit/primepass" },
  { key: "9store", label: "9Store", icon: ShoppingBag, path: "/9fit/store" },
  { key: "9progress", label: "9Progress", icon: TrendingUp, path: "/9fit/stats" },
  { key: "smarttreino", label: "SmartTreino", icon: Dumbbell, path: "/9fit/train" },
  { key: "healthflix", label: "HealthFlix", icon: Film, path: "/9fit/healthflix" },
  { key: "9foods", label: "9Foods", icon: Apple, path: "/9fit/dieta" },
];

export function ModuleGrid({ priorityKey, recommendedKeys }: { priorityKey?: string | null; recommendedKeys?: string[] }) {
  const navigate = useNavigate();
  const sorted = priorityKey
    ? [...MODULES].sort((a, b) => (a.key === priorityKey ? -1 : b.key === priorityKey ? 1 : 0))
    : MODULES;

  return (
    <div className="grid grid-cols-4 gap-2">
      {sorted.map((m, i) => {
        const Icon = m.icon;
        const recommended = recommendedKeys?.includes(m.key) || m.key === priorityKey;
        return (
          <motion.button
            key={m.key}
            onClick={() => navigate(m.path)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            whileTap={{ scale: 0.95 }}
            className={`relative glass-mission rounded-lg p-2 flex flex-col items-center justify-center gap-1.5 aspect-square ${
              recommended ? "ring-1 ring-primary/60" : ""
            }`}
          >
            <Icon className="w-5 h-5 text-primary" />
            <p className="text-[9px] font-display uppercase tracking-tight text-foreground text-center leading-tight">{m.label}</p>
            {recommended && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary glow-neon" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
