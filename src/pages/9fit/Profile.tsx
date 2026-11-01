import { withTimeout } from '@/lib/withTimeout';
import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users, Calendar, Dumbbell, TrendingUp, CreditCard,
  ChevronRight, Flame, LogOut, Brain, Share2, Settings2, Bell, Shield, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
const DynamicPDI = lazy(() => import('@/components/9fit/DynamicPDI').then(module => ({ default: module.DynamicPDI })));
import { DigitalIDCard } from "@/components/9fit/DigitalIDCard";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useEngrenagem } from "@/hooks/useEngrenagem";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  sub: string;
  route?: string;
  action?: "ficha";

}

interface AthleteBio {
  avatar_url: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
}

/** Última alteração de peso registrada (athlete_weight_history): de onde veio e quando. */
interface WeightMeta { source: string; created_at: string }
const WEIGHT_SOURCE_LABEL: Record<string, string> = {
  perfil: "Perfil",
  avaliacao_guiada: "Avaliação guiada",
  atualizacao_direta: "Atualização direta",
  baseline: "Registro inicial",
};

export default function NineFitProfile() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { totalXp, level, syncScore, streak, weightKg, loading: profileLoading, error: profileError, refresh: refreshProfile } = useEngrenagem();
  const { athleteId, athleteName, loading: identityLoading, error: identityError } = useAthleteId();
  const [search, setSearch] = useSearchParams();
  const fichaOpen = search.get("section") === "pdi";
  const setFichaOpen = (open: boolean) => { const next = new URLSearchParams(search); if (open) next.set("section", "pdi"); else next.delete("section"); setSearch(next, { replace: !open }); };
  const [bio, setBio] = useState<AthleteBio>({ avatar_url: null, age: null, height_cm: null, weight_kg: null });
  const [bioError, setBioError] = useState(false);
  const [bioLoading, setBioLoading] = useState(true);
  const [bioReload, setBioReload] = useState(0);
  const [weightMeta, setWeightMeta] = useState<WeightMeta | null>(null);

  useEffect(() => {
    if (!athleteId) { setBioLoading(identityLoading); setBioError(!identityLoading || !!identityError); setWeightMeta(null); return; }
    let cancelled = false;
    setBioLoading(true); setBioError(false); setWeightMeta(null); setBio({ avatar_url: null, age: null, height_cm: null, weight_kg: null });
    (async () => {
      try {
      const { data, error } = await withTimeout(supabase
        .from("athletes")
        .select("avatar_url, age, height_cm:altura_cm")
        .eq("id", athleteId)
        .maybeSingle());
      if (error || !data) throw error || new Error("Perfil indisponível");
      if (!cancelled) setBio({ avatar_url: data.avatar_url, age: data.age, height_cm: data.height_cm, weight_kg: null });

      const { data: hist } = await withTimeout(supabase
        .from("athlete_weight_history" as any)
        .select("source, created_at")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle());
      if (!cancelled) setWeightMeta((hist as any) ?? null);
      } catch { if (!cancelled) setBioError(true); } finally { if (!cancelled) setBioLoading(false); }
    })();
    const refresh = () => setBioReload(value => value + 1);
    window.addEventListener("9fit:profile-updated", refresh);
    return () => { cancelled = true; window.removeEventListener("9fit:profile-updated", refresh); };
  }, [athleteId, bioReload, identityLoading, identityError]);

  const displayName = athleteName || profile?.full_name || user?.email?.split("@")[0] || "Atleta";

  const sections: { title: string; items: MenuItem[] }[] = [
    { title: "Minha conta", items: [
      { icon: Brain, label: "Minha ficha", sub: "Objetivos, rotina e restrições", action: "ficha" },
      { icon: Settings2, label: "Preferências e suporte", sub: "Player, animações e ajuda", route: "/9fit/settings" },
      { icon: CreditCard, label: "Pagamento e plano", sub: "Consulte seu acesso e as condições", route: "/9fit/primepass" },
      { icon: Bell, label: "Notificações", sub: "Avisos e atualizações", route: "/9fit/notificacoes" },
      { icon: Shield, label: "Meus dados", sub: "Fontes e compartilhamento", route: "/9fit/progresso/fontes" },
    ] },
    { title: "Treino e evolução", items: [
      { icon: Calendar, label: "Planejamento", sub: "Sua programação", route: "/9fit/planejamento" },
      { icon: Dumbbell, label: "Ajuste de treino", sub: "Revise e salve a sessão", route: "/9fit/ajuste-treino" },
      { icon: TrendingUp, label: "Histórico", sub: "Suas métricas e registros", route: "/9fit/progresso" },
      { icon: Users, label: "Equipe", sub: "Encontre seu profissional", route: "/9fit/staff" },
      { icon: Share2, label: "Compartilhar conquistas", sub: "Cards dos seus registros", route: "/9fit/compartilhar" },
    ] },
  ];

  const openItem = (it: MenuItem) => {
    if (it.action === "ficha") { setFichaOpen(true); return; }
    if (it.route) navigate(it.route);
  };

  return (
    <div className="fitpro-orange min-h-screen bg-background pb-32 text-foreground">
      {/* Top bar */}
      <header className="px-4 pt-6 flex items-center gap-2 border-b border-primary/30 pb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Flame className="w-5 h-5 text-primary" />
        </div>
        <h1 className="flex-1 text-center text-2xl font-display">Perfil</h1>
        <div className="w-9 h-9" />
      </header>

      {/* ID Card — decisão principal da tela: 1 barra de XP, dados físicos ou
          CTA de completar perfil já embutido, Sync/Streak como texto de apoio */}
      <section className="px-4 mt-5">
        {profileLoading || bioLoading ? <p role="status">Carregando seu perfil…</p> : bioError ? <button onClick={() => { window.dispatchEvent(new Event("9fit:profile-updated")); }}>Não foi possível confirmar os dados do perfil. Tentar novamente</button> : profileError ? <button onClick={() => void refreshProfile()}>Não foi possível confirmar seus pontos e nível. Tentar novamente</button> : <DigitalIDCard
          name={displayName}
          level={level}
          syncScore={syncScore}
          totalXP={totalXp}
          streak={streak}
          avatarUrl={bio.avatar_url}
          age={bio.age}
          heightCm={bio.height_cm}
          weightKg={weightKg}
        />}
        {weightKg != null && weightMeta && (
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            Peso {weightKg} kg · {WEIGHT_SOURCE_LABEL[weightMeta.source] || weightMeta.source}
            {weightMeta.source !== "baseline" ? ` em ${new Date(weightMeta.created_at).toLocaleDateString("pt-BR")}` : ""}
          </p>
        )}
      </section>

      {/* Menu */}
      <div className="px-4 mt-6 space-y-3">
        {sections.map(section => <section key={section.title} className="space-y-2"><h2 className="pt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{section.title}</h2>{section.items.map((it) => (
          <button key={it.label} onClick={() => openItem(it)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex items-center gap-4 hover:border-primary/40 transition">
            <div className="w-11 h-11 rounded-lg border border-primary/30 bg-primary/[0.06] flex items-center justify-center">
              <it.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="font-display text-lg">{it.label}</p>

              </div>
              <p className="text-xs text-muted-foreground">{it.sub}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}</section>)}
      </div>

      {/* CTAs — "Completar perfil" saiu daqui: já está embutido no ID Card acima */}
      <div className="px-4 mt-6 space-y-3">
        <button onClick={async () => { await logout(); navigate("/9fit/login"); }}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.02] py-3 text-sm text-muted-foreground hover:text-destructive flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>

      <Dialog open={fichaOpen} onOpenChange={setFichaOpen}>
        <DialogContent className="fitpro-orange max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          <DialogHeader className="border-b border-border/15 pb-3"><DialogTitle>Minha ficha</DialogTitle><DialogDescription>Confira seus objetivos, preferências e restrições.</DialogDescription></DialogHeader>
          {fichaOpen && <Suspense fallback={<p role="status">Carregando sua ficha…</p>}><DynamicPDI /></Suspense>}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}
