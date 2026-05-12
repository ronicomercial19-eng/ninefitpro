import { useState } from "react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { Users, Calendar, MessageSquare, Bot, Shield, Phone, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STAFF_LIST = [
  { name: "Ron Souza", role: "Master Coach", status: "online", avatar: "RS" },
  { name: "Dr. Marina", role: "Bio-Hacking", status: "online", avatar: "DM" },
  { name: "Carla Lima", role: "Nutricionista", status: "offline", avatar: "CL" },
];

export default function NineFitStaff() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"team" | "support" | "schedule">("team");

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // STAFF</p>
        <h1 className="text-massive text-3xl text-foreground mt-1">SUPPORT ELITE</h1>
        <p className="text-xs font-data text-muted-foreground uppercase tracking-widest mt-1">
          Tempo médio · 4 min
        </p>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="glass-mission rounded-full p-1 flex gap-1">
          {[
            { k: "team", l: "Equipe" },
            { k: "support", l: "Suporte" },
            { k: "schedule", l: "Agendar" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`flex-1 py-2 rounded-full text-[10px] font-display uppercase tracking-widest transition-all ${
                tab === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* RON CTA — internal route */}
      <button
        onClick={() => navigate("/9fit/ron")}
        className="mx-4 mb-4 w-[calc(100%-2rem)] glass-mission glass-mission-active rounded-xl p-4 text-left flex items-center gap-3"
      >
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-data tracking-[0.3em] text-primary/80">ASSISTENTE NEURAL</p>
          <p className="text-editorial text-base text-foreground">O RON</p>
          <p className="text-[10px] text-muted-foreground">Disponível 24/7 · memória persistente</p>
        </div>
        <ChevronRight className="w-5 h-5 text-primary" />
      </button>

      {tab === "team" && (
        <div className="px-4 space-y-2">
          {STAFF_LIST.map((s) => (
            <div key={s.name} className="glass-mission rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-xs font-display text-primary">
                {s.avatar}
              </div>
              <div className="flex-1">
                <p className="text-sm font-display uppercase text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.role}</p>
              </div>
              <span className={`text-[9px] font-data uppercase tracking-widest ${s.status === "online" ? "text-primary" : "text-muted-foreground"}`}>
                {s.status}
              </span>
              <button
                onClick={() => navigate("/9fit/mensagens")}
                className="text-primary hover:text-primary/80"
                aria-label="Mensagem"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "support" && (
        <div className="px-4 space-y-2">
          <button onClick={() => navigate("/9fit/mensagens")} className="w-full glass-mission rounded-xl p-4 text-left flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-display uppercase">Chat de Suporte</p>
              <p className="text-[10px] text-muted-foreground">Resposta em até 4 min</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer" className="w-full glass-mission rounded-xl p-4 text-left flex items-center gap-3">
            <Phone className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-display uppercase">WhatsApp Elite</p>
              <p className="text-[10px] text-muted-foreground">Atendimento humano</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </a>
          <button className="w-full glass-mission rounded-xl p-4 text-left flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-display uppercase">PrimePass · Concierge</p>
              <p className="text-[10px] text-muted-foreground">Exclusivo membros Elite</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {tab === "schedule" && (
        <div className="px-4 space-y-2">
          <button onClick={() => navigate("/9fit/aulas-creditos")} className="w-full glass-mission rounded-xl p-4 text-left flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-display uppercase">Aulas & Créditos</p>
              <p className="text-[10px] text-muted-foreground">Reservar sessão presencial</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="w-full glass-mission rounded-xl p-4 text-left flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-display uppercase">Avaliação Física</p>
              <p className="text-[10px] text-muted-foreground">Agendar com Master Coach</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}
