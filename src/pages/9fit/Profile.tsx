import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Calendar, Dumbbell, Crown, TrendingUp, CreditCard,
  ChevronRight, ExternalLink, Flame, LogOut, Brain, Share2, ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { DynamicPDI } from '@/components/9fit/DynamicPDI';
import { CompleteProfileFlow } from "@/components/9fit/CompleteProfileFlow";
import { DigitalIDCard } from "@/components/9fit/DigitalIDCard";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useEngrenagem } from "@/hooks/useEngrenagem";

interface MenuItem {
  icon: any;
  label: string;
  sub: string;
  route?: string;
  action?: "ficha";
  badge?: string;
  badgeStyle?: "neon" | "outline";
}

interface AthleteBio {
  avatar_url: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
}

export default function NineFitProfile() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { totalXp, level, syncScore, streak } = useEngrenagem();
  const { athleteId, athleteName } = useAthleteId();
  const [staffOnline, setStaffOnline] = useState(0);
  // PDI: entrada no menu (como as outras áreas) que abre a ficha completa em tela cheia.
  // O app vai preenchendo a ficha sozinho pelo uso; aqui o aluno só confere e ajusta.
  const [fichaOpen, setFichaOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [bio, setBio] = useState<AthleteBio>({ avatar_url: null, age: null, height_cm: null, weight_kg: null });

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("role", ["professor", "admin"] as any);
      setStaffOnline(count || 0);
    })();
  }, []);

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      const { data } = await supabase
        .from("athletes")
        .select("avatar_url, age, height_cm:altura_cm, weight_kg:peso_kg")
        .eq("id", athleteId)
        .maybeSingle();
      if (data) setBio(data as any);
    })();
  }, [athleteId, completeOpen]); // recarrega ao fechar o wizard (aberto pelo próprio ID Card)

  const displayName = athleteName || profile?.full_name || user?.email?.split("@")[0] || "Atleta";

  // QA Fase F (16/09): "Aluno Premium" e "Próxima fatura: 12/11" eram
  // hardcoded pra TODO usuário — não existe nenhuma coluna de plano/assinatura
  // em athletes, e a tabela payments está zerada (zero pagamentos processados
  // no sistema todo até hoje). Mostrar "Premium" pra quem nunca pagou nada é
  // uma alegação falsa sobre a própria assinatura da pessoa. Enquanto não
  // existir uma fonte real de entitlement, o item fica honesto em vez de
  // inventar status.
  const items: MenuItem[] = [
    { icon: Brain, label: "PDI", sub: "Sua ficha dinâmica: o app aprende e você ajusta", action: "ficha", badge: "Auto", badgeStyle: "outline" },
    { icon: Users, label: "Staff", sub: "Treinadores e nutricionistas", route: "/9fit/staff", badge: `${staffOnline} profissionais`, badgeStyle: "neon" },
    { icon: Calendar, label: "Planejamento", sub: "Próximos treinos e refeições", route: "/9fit/planejamento" },
    { icon: Dumbbell, label: "Ajuste de Treino", sub: "Solicitar alterações", route: "/9fit/ajuste-treino", badge: "Novo", badgeStyle: "outline" },
    { icon: Crown, label: "Ron", sub: "Coach virtual e check-ins", route: "/9fit/ron" },
    { icon: TrendingUp, label: "Histórico", sub: "Relatórios e evolução", route: "/9fit/progresso" },
    { icon: Share2, label: "Compartilhar", sub: "Cards de progresso e conquistas", route: "/9fit/compartilhar" },
    { icon: CreditCard, label: "Pagamento & Plano", sub: "Gerencie sua assinatura", route: "/9fit/primepass" },
  ];

  const openItem = (it: MenuItem) => {
    if (it.action === "ficha") { setFichaOpen(true); return; }
    if (it.route) navigate(it.route);
  };

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

      {/* ID Card — decisão principal da tela: 1 barra de XP, dados físicos ou
          CTA de completar perfil já embutido, Sync/Streak como texto de apoio */}
      <section className="px-4 mt-5">
        <DigitalIDCard
          name={displayName}
          level={level}
          syncScore={syncScore}
          totalXP={totalXp}
          streak={streak}
          avatarUrl={bio.avatar_url}
          age={bio.age}
          heightCm={bio.height_cm}
          weightKg={bio.weight_kg}
        />
      </section>

      {/* Menu */}
      <div className="px-4 mt-6 space-y-3">
        {items.map((it) => (
          <button key={it.label} onClick={() => openItem(it)}
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

      {/* CTAs — "Completar perfil" saiu daqui: já está embutido no ID Card acima */}
      <div className="px-4 mt-6 space-y-3">
        <button onClick={() => navigate("/9fit/compartilhar?template=id_card")}
          className="w-full rounded-2xl border border-primary/40 bg-primary/[0.06] py-3 font-semibold flex items-center justify-center gap-2 text-primary">
          <Share2 className="w-4 h-4" /> Compartilhar meu ID Card
        </button>
        <button onClick={() => navigate("/9fit/hub")}
          className="w-full rounded-full bg-gradient-to-r from-primary to-primary/70 text-primary-foreground py-3.5 font-bold flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]">
          Explorar mais opções <ExternalLink className="w-4 h-4" />
        </button>
        <button onClick={() => navigate("/9fit/native-system")}
          className="w-full rounded-full border border-primary/50 text-primary py-3 font-semibold flex items-center justify-center gap-2">
          Cupons <ExternalLink className="w-4 h-4" />
        </button>
        <button onClick={async () => { await logout(); navigate("/9fit/login"); }}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.02] py-3 text-sm text-muted-foreground hover:text-destructive flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>

      {/* PDI em tela cheia: a ficha completa, aberta pela entrada "PDI" do menu */}
      {fichaOpen && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto pb-24" role="dialog" aria-label="Minha ficha dinâmica (PDI)">
          <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-background/95 backdrop-blur">
            <button onClick={() => setFichaOpen(false)} aria-label="Voltar"
              className="w-10 h-10 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center hover:border-primary/40 transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-bold">PDI</p>
              <h2 className="font-display text-xl leading-tight">Minha ficha dinâmica</h2>
            </div>
          </header>
          <div className="px-4 pt-4">
            <p className="text-xs text-muted-foreground mb-3">
              O app completa esta ficha sozinho conforme você treina e usa o app. Aqui você confere e ajusta o que quiser.
            </p>
            <DynamicPDI />
          </div>
        </div>
      )}

      <CompleteProfileFlow open={completeOpen} onClose={() => setCompleteOpen(false)} />
      <BottomNavigation />
    </div>
  );
}
