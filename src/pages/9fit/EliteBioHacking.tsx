import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Brain, Droplet, HeartPulse, Moon, Pill, Wind, Zap } from "lucide-react";
import { motion } from "framer-motion";

const PROTOCOLS = [
  { icon: Moon,       title: "Sono Profundo",     desc: "Otimização REM + temperatura", color: "from-indigo-500/30" },
  { icon: HeartPulse, title: "HRV Training",      desc: "Coerência cardíaca · 5min/dia", color: "from-rose-500/30" },
  { icon: Wind,       title: "Respiração 4-7-8",  desc: "Sistema parassimpático",        color: "from-sky-500/30" },
  { icon: Droplet,    title: "Hidratação Hidro",  desc: "Eletrólitos + minerais",        color: "from-cyan-500/30" },
  { icon: Pill,       title: "Stack Cognitivo",   desc: "Suplementação focada",          color: "from-emerald-500/30" },
  { icon: Brain,      title: "Neurofeedback",     desc: "Foco profundo · 25min",         color: "from-violet-500/30" },
  { icon: Zap,        title: "Crioterapia",       desc: "Banho gelado · 3 min",          color: "from-blue-500/30" },
  { icon: Activity,   title: "Mobilidade Elite",  desc: "Rotina diária · 10min",         color: "from-amber-500/30" },
];

export default function EliteBioHackingPage() {
  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT ELITE</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">Bio-Hacking</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Protocolos avançados de performance e longevidade.
        </p>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {PROTOCOLS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className={`bg-gradient-to-br ${p.color} to-transparent border-primary/20`}>
              <CardContent className="p-4">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center mb-2">
                  <p.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-display uppercase text-foreground">{p.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="px-4 mt-6">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] font-data tracking-widest text-primary/80">EM BREVE</p>
            <p className="text-sm font-display uppercase mt-1">Integração com Wearables · HRV · Sono</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Dados sincronizados em tempo real para protocolos adaptativos.
            </p>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}
