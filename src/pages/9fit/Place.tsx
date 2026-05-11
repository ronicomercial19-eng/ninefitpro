import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { logPredictiveEvent } from "@/services/predictiveEngine";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface Tool { name: string; url: string; tag: string; }

const CATEGORIES: { title: string; items: Tool[] }[] = [
  {
    title: "Core Operacional",
    items: [
      { name: "SmartTreino", url: "https://smartreino.lovable.app", tag: "treino" },
      { name: "SmartPeriodizer", url: "https://treino-smart-periodizer.lovable.app", tag: "periodização" },
      { name: "FitCopilot", url: "https://fit360-copilot-health-13.lovable.app", tag: "monitoramento" },
    ],
  },
  {
    title: "Performance B2C",
    items: [
      { name: "9Nutrition", url: "https://9nutrition.base44.app", tag: "nutrição" },
      { name: "Postura Pro", url: "https://postura-pro-analyzer.lovable.app", tag: "análise" },
      { name: "NineFit Premium", url: "https://ninefitnine.lovable.app", tag: "premium" },
    ],
  },
  {
    title: "Marketplace",
    items: [{ name: "9Store", url: "https://ninefit.lovable.app", tag: "ecommerce" }],
  },
];

export default function NineFitPlace() {
  const { user } = useAuth();

  const open = async (t: Tool) => {
    if (user?.id) await logPredictiveEvent(user.id, "module_open", { module: t.name }, "place");
    window.open(t.url, "_blank", "noopener");
  };

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // PERFORMANCE MARKETPLACE</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">LAUNCHER</h1>
      </div>

      {CATEGORIES.map((c) => (
        <div key={c.title} className="px-4 mb-6">
          <p className="text-[10px] font-data tracking-[0.3em] text-muted-foreground mb-2">{c.title.toUpperCase()}</p>
          <div className="space-y-2">
            {c.items.map((t, i) => (
              <motion.button
                key={t.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => open(t)}
                className="w-full glass-mission rounded-xl p-3 flex items-center justify-between"
              >
                <div className="text-left">
                  <p className="text-editorial text-base text-foreground">{t.name}</p>
                  <p className="text-[9px] font-data tracking-widest text-muted-foreground uppercase">{t.tag}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-primary" />
              </motion.button>
            ))}
          </div>
        </div>
      ))}

      <BottomNavigation />
    </div>
  );
}
