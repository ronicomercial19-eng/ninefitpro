import { useState } from "react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { EcosystemFrame } from "@/components/9fit/EcosystemFrame";
import { Bot, Users, Calendar, MessageSquare } from "lucide-react";

const RON_URL = "https://9ron.base44.app";

export default function NineFitStaff() {
  const [openRon, setOpenRon] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 pb-4">
        <p className="text-[10px] font-data uppercase tracking-[0.3em] text-muted-foreground">9FIT ·</p>
        <h1 className="text-3xl font-display uppercase tracking-tighter text-foreground">STAFF</h1>
        <p className="text-xs text-muted-foreground mt-1">Assistente · Profissionais · Suporte</p>
      </div>

      {/* O Ron — destaque */}
      <button
        onClick={() => setOpenRon(true)}
        className="mx-4 mb-4 w-[calc(100%-2rem)] glass-card rounded-lg p-6 text-left hover-magnetic glow-context-ai"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-data uppercase tracking-[0.3em] text-cyan-400">O DIFERENCIAL SUPREMO</p>
            <h2 className="text-2xl font-display italic uppercase tracking-tight text-foreground mt-1">
              O Ron
            </h2>
            <p className="text-xs text-muted-foreground mt-2">
              Assistente técnico digital · acesso direto autenticado
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-cyan-500/20 flex items-center justify-center glow-context-ai">
            <Bot className="w-7 h-7 text-cyan-400" />
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 text-xs font-display uppercase tracking-widest text-cyan-400">
          Conversar com o Ron →
        </div>
      </button>

      {/* Quick actions */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        <button className="glass-card rounded-lg p-4 text-left hover-magnetic">
          <Users className="w-6 h-6 text-primary mb-2" />
          <p className="text-sm font-display uppercase">Profissionais</p>
          <p className="text-[10px] text-muted-foreground mt-1">Coaches conectados</p>
        </button>
        <button className="glass-card rounded-lg p-4 text-left hover-magnetic">
          <Calendar className="w-6 h-6 text-primary mb-2" />
          <p className="text-sm font-display uppercase">Agendar</p>
          <p className="text-[10px] text-muted-foreground mt-1">Sessão presencial</p>
        </button>
        <button className="glass-card rounded-lg p-4 text-left hover-magnetic col-span-2">
          <MessageSquare className="w-6 h-6 text-primary mb-2" />
          <p className="text-sm font-display uppercase">Suporte Humano</p>
          <p className="text-[10px] text-muted-foreground mt-1">Atendimento direto da 9FIT</p>
        </button>
      </div>

      {openRon && <EcosystemFrame url={RON_URL} title="O Ron" onBack={() => setOpenRon(false)} />}
      <BottomNavigation />
    </div>
  );
}
