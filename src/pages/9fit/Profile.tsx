import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Calendar, Dumbbell, Crown, TrendingUp, CreditCard,
  ChevronRight, ExternalLink, Flame, LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

interface MenuItem {
  icon: any;
  label: string;
  sub: string;
  route: string;
  badge?: string;
  badgeStyle?: "neon" | "outline";
}

export default function NineFitProfile() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const [staffOnline, setStaffOnline] = useState(3);
  const [nextInvoice, setNextInvoice] = useState("12/11");
  const [planTier, setPlanTier] = useState("Aluno Premium");

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("role", ["professor", "admin"] as any);
      if (count) setStaffOnline(Math.min(9, Math.max(1, Math.round(count / 3))));
    })();
  }, []);


  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Atleta";

  const items: MenuItem[] = [
    { icon: Users, label: "Staff", sub: "Treinadores e nutricionistas", route: "/9fit/staff", badge: `${staffOnline} online`, badgeStyle: "neon" },
    { icon: Calendar, label: "Planejamento", sub: "Próximos treinos e refeições", route: "/9fit/planejamento" },
    { icon: Dumbbell, label: "Ajuste de Treino", sub: "Solicitar alterações", route: "/9fit/ajuste-treino", badge: "Novo", badgeStyle: "outline" },
    { icon: Crown, label: "Ron", sub: "Coach virtual e check-ins", route: "/9fit/ron" },
    { icon: TrendingUp, label: "Histórico", sub: "Relatórios e evolução", route: "/9fit/progresso" },
    { icon: CreditCard, label: "Pagamento & Plano", sub: `Próxima fatura: ${nextInvoice}`, route: "/9fit/prime" },
  ];

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* Top bar */}
      <header className="px-4 pt-6 flex items-center gap-2 border-b border-primary/30 pb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Flame className="w-5 h-5 text-primary" />
        </div>
        <h1 className="flex-1 text-center text-2xl font-display">Configurações</h1>
        <div className="w-9 h-9" />
      </header>

      {/* Profile */}
      <section className="px-4 mt-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border-2 border-primary bg-white/5 grid place-items-center font-display text-2xl text-primary">
          {displayName[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-display text-2xl">{displayName}</p>
          <p className="text-primary font-semibold text-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {planTier}
          </p>
        </div>
      </section>

      {/* Menu */}
      <div className="px-4 mt-6 space-y-3">
        {items.map((it) => (
          <button key={it.label} onClick={() => navigate(it.route)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex items-center gap-4 hover:border-primary/40 transition">
            <div className="w-11 h-11 rounded-lg border border-primary/30 bg-primary/[0.06] flex items-center justify-center">
              <it.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="font-display text-lg">{it.label}</p>
                {it.badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    it.badgeStyle === "neon"
                      ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
                      : "border border-primary/60 text-primary"
                  }`}>
                    {it.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{it.sub}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* CTAs */}
      <div className="px-4 mt-6 space-y-3">
        <button onClick={() => navigate("/9fit/hub")}
          className="w-full rounded-full bg-gradient-to-r from-primary to-primary/70 text-primary-foreground py-3.5 font-bold flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]">
          Explorar mais opções <ExternalLink className="w-4 h-4" />
        </button>
        <button onClick={() => navigate("/app")}
          className="w-full rounded-full border border-primary/50 text-primary py-3 font-semibold">
          Abrir no Sistema Nativo<br /><span className="text-[10px] opacity-70">(iframe)</span>
        </button>
        <button onClick={async () => { await logout(); navigate("/9fit/login"); }}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.02] py-3 text-sm text-muted-foreground hover:text-destructive flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
}
