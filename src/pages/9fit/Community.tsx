import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { EcosystemFrame } from "@/components/9fit/EcosystemFrame";
import { Users, Bot, Crown, ShoppingBag, Sparkles, BookOpen, Activity, Brain, Calendar, Tv } from "lucide-react";

const tiles = [
  {
    id: "community",
    name: "FitCommunity",
    desc: "Tribos · Social · Conexões",
    icon: Users,
    glow: "glow-context-train",
    url: "https://ninefit-community-flow.lovable.app",
  },
  {
    id: "ron",
    name: "O Ron",
    desc: "Assistente Técnico Digital",
    icon: Bot,
    glow: "glow-context-ai",
    url: "https://9ron.base44.app",
  },
  {
    id: "primepass",
    name: "PrimePass",
    desc: "Acesso Premium · Recursos Top",
    icon: Crown,
    glow: "glow-context-premium",
    url: "https://9fitcommunity.base44.app",
  },
  {
    id: "store",
    name: "9Store",
    desc: "Ecommerce Oficial",
    icon: ShoppingBag,
    glow: "",
    url: "https://ninefit.lovable.app",
  },
  {
    id: "progress",
    name: "9Progress",
    desc: "Avaliação Física",
    icon: Activity,
    glow: "",
    url: "https://nineprogresstracker.lovable.app",
  },
  {
    id: "smartreino",
    name: "SmartTreino",
    desc: "Geração de Treinos IA",
    icon: Brain,
    glow: "glow-context-ai",
    url: "https://smartreino.lovable.app",
  },
  {
    id: "periodizer",
    name: "Smart Periodizer",
    desc: "Anamnese & Periodização",
    icon: Calendar,
    glow: "",
    url: "https://treino-smart-periodizer.lovable.app",
  },
  {
    id: "healthflix",
    name: "HealthFlix",
    desc: "Streaming Saúde",
    icon: Tv,
    glow: "",
    url: "https://healthflixnine.lovable.app",
  },
  {
    id: "fitcopilot",
    name: "FitCopilot",
    desc: "Monitoramento Contínuo",
    icon: Sparkles,
    glow: "glow-context-ai",
    url: "https://fit360-copilot-health-13.lovable.app",
  },
];

export default function NineFitCommunity() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 pb-2">
        <p className="text-[10px] font-data uppercase tracking-[0.3em] text-muted-foreground">9FIT ·</p>
        <h1 className="text-3xl font-display uppercase tracking-tighter text-foreground">HUB</h1>
        <p className="text-xs text-muted-foreground mt-1">Engaja · Compartilha · Conecta</p>
      </div>

      {/* ID Card */}
      <button
        onClick={() => navigate("/9fit/profile")}
        className="mx-4 mb-6 w-[calc(100%-2rem)] glass-card rounded-lg p-5 text-left hover-magnetic glow-context-premium"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-data uppercase tracking-[0.3em] text-yellow-400">ID PESSOAL</p>
            <p className="text-2xl font-display uppercase tracking-tight text-foreground mt-1">FITPRO Member</p>
            <p className="text-xs text-muted-foreground mt-1">Toque para abrir credencial completa</p>
          </div>
          <BookOpen className="w-8 h-8 text-yellow-400" />
        </div>
      </button>

      {/* Bento Grid */}
      <div className="px-4 grid grid-cols-2 gap-3 bento-grid">
        {tiles.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setOpen({ url: t.url, title: t.name })}
            className={`glass-card rounded-lg p-4 text-left hover-magnetic transition-all ${
              i === 0 ? "col-span-2" : ""
            } ${t.glow}`}
          >
            <t.icon className="w-6 h-6 text-primary mb-3" />
            <p className="text-sm font-display uppercase tracking-tight text-foreground">{t.name}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{t.desc}</p>
          </button>
        ))}
      </div>

      {open && <EcosystemFrame url={open.url} title={open.title} onBack={() => setOpen(null)} />}
      <BottomNavigation />
    </div>
  );
}
