import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LucideIcon, Users, Brain, Crown, ShoppingBag, TrendingUp, Dumbbell, Film, Apple, Sparkles } from "lucide-react";

interface ModuleDef {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  hue: string;
}

const MODULES: ModuleDef[] = [
  { key: "community", label: "FitCommunity", icon: Users, path: "/9fit/community", hue: "hsla(20,100%,55%,0.35)" },
  { key: "ron", label: "O Ron", icon: Brain, path: "/9fit/ron", hue: "hsla(190,100%,55%,0.35)" },
  { key: "primepass", label: "PrimePass", icon: Crown, path: "/9fit/primepass", hue: "hsla(45,100%,55%,0.35)" },
  { key: "9store", label: "9Store", icon: ShoppingBag, path: "/9fit/store", hue: "hsla(20,100%,55%,0.35)" },
  { key: "9progress", label: "9Progress", icon: TrendingUp, path: "/9fit/stats", hue: "hsla(140,80%,55%,0.30)" },
  { key: "smarttreino", label: "SmartTreino", icon: Dumbbell, path: "/9fit/train", hue: "hsla(20,100%,55%,0.35)" },
  { key: "healthflix", label: "HealthFlix", icon: Film, path: "/9fit/healthflix", hue: "hsla(0,90%,55%,0.30)" },
  { key: "9foods", label: "9Foods", icon: Apple, path: "/9fit/dieta", hue: "hsla(140,80%,55%,0.30)" },
];

export function ModuleGrid({ priorityKey, recommendedKeys }: { priorityKey?: string | null; recommendedKeys?: string[] }) {
  const navigate = useNavigate();
  const sorted = priorityKey
    ? [...MODULES].sort((a, b) => (a.key === priorityKey ? -1 : b.key === priorityKey ? 1 : 0))
    : MODULES;

  return (
    <div className="grid grid-cols-2 gap-3">
      {sorted.map((m, i) => {
        const Icon = m.icon;
        const recommended = recommendedKeys?.includes(m.key) || m.key === priorityKey;
        return (
          <motion.button
            key={m.key}
            onClick={() => navigate(m.path)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            className={`relative glass-mission rounded-xl p-4 text-left overflow-hidden ${
              recommended ? "glass-mission-active" : ""
            }`}
          >
            <div
              className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-3xl pointer-events-none"
              style={{ background: m.hue }}
            />
            <div className="relative flex flex-col gap-3">
              <Icon className="w-6 h-6 text-primary" />
              <div>
                <p className="text-editorial text-base text-foreground">{m.label}</p>
                <p className="text-[9px] font-data tracking-[0.25em] text-muted-foreground mt-1">
                  {recommended ? "RECOMENDADO" : "MÓDULO"}
                </p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
