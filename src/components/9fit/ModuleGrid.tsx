import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LucideIcon, Users, Brain, Crown, ShoppingBag, TrendingUp, Dumbbell, Film, Apple } from "lucide-react";

interface ModuleDef {
  key: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  path: string;
  group: "SOCIAL" | "ELITE" | "PERFORMANCE" | "WELLNESS";
}

const MODULES: ModuleDef[] = [
  { key: "community",   label: "FitCommunity", sub: "Tribos & Feed",   icon: Users,       path: "/9fit/community",  group: "SOCIAL" },
  { key: "ron",         label: "O Ron",        sub: "Neural Coach",    icon: Brain,       path: "/9fit/ron",        group: "SOCIAL" },
  { key: "primepass",   label: "PrimePass",    sub: "Elite Access",    icon: Crown,       path: "/9fit/primepass",  group: "ELITE" },
  { key: "9store",      label: "9Store",       sub: "Performance Shop",icon: ShoppingBag, path: "/9fit/store",      group: "ELITE" },
  { key: "9progress",   label: "9Progress",    sub: "Stats & Forecast",icon: TrendingUp,  path: "/9fit/stats",      group: "PERFORMANCE" },
  { key: "smarttreino", label: "SmartTreino",  sub: "Periodização IA", icon: Dumbbell,    path: "/9fit/train",      group: "PERFORMANCE" },
  { key: "healthflix",  label: "HealthFlix",   sub: "Streaming Fit",   icon: Film,        path: "/9fit/healthflix", group: "WELLNESS" },
  { key: "9foods",      label: "9Foods",       sub: "Nutri-Log",       icon: Apple,       path: "/9fit/dieta",      group: "WELLNESS" },
];

const GROUPS: { key: ModuleDef["group"]; label: string }[] = [
  { key: "SOCIAL",      label: "Social & Neural" },
  { key: "ELITE",       label: "Elite & Marketplace" },
  { key: "PERFORMANCE", label: "Performance" },
  { key: "WELLNESS",    label: "Wellness" },
];

export function ModuleGrid({ priorityKey, recommendedKeys }: { priorityKey?: string | null; recommendedKeys?: string[] }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const items = MODULES.filter((m) => m.group === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key}>
            <p className="text-[9px] font-data tracking-[0.35em] text-muted-foreground/70 mb-1.5 px-0.5">
              {g.label.toUpperCase()}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((m, i) => {
                const Icon = m.icon;
                const recommended = recommendedKeys?.includes(m.key) || m.key === priorityKey;
                return (
                  <motion.button
                    key={m.key}
                    onClick={() => navigate(m.path)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    whileTap={{ scale: 0.97 }}
                    className={`group relative glass-mission rounded-xl p-3 flex items-center gap-3 text-left overflow-hidden ${
                      recommended ? "ring-1 ring-primary/60 " : ""
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      recommended ? "bg-primary/20" : "bg-white/5 group-hover:bg-primary/15"
                    }`}>
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-display uppercase tracking-tight text-foreground truncate leading-tight">
                        {m.label}
                      </p>
                      <p className="text-[9px] font-data tracking-wider text-muted-foreground truncate uppercase mt-0.5">
                        {m.sub}
                      </p>
                    </div>
                    {recommended && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary glow-neon" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
