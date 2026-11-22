import { useSyncScore } from "@/hooks/useSyncScore";
import {
  StudentActionCard,
  StudentBlockTitle,
  StudentDetailGroup,
} from "@/components/9fit/StudentExperience";
import { withTimeout } from "@/lib/withTimeout";
import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Calendar,
  Dumbbell,
  TrendingUp,
  CreditCard,
  LogOut,
  Brain,
  Share2,
  Settings2,
  Bell,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
const DynamicPDI = lazy(() =>
  import("@/components/9fit/DynamicPDI").then((module) => ({
    default: module.DynamicPDI,
  }))
);
import { DigitalIDCard } from "@/components/9fit/DigitalIDCard";
import {
  ATHLETE_MISSING,
  IDENTITY_COPY,
  identityNotice,
} from "@/components/9fit/identityNotice";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useEngrenagem } from "@/hooks/useEngrenagem";
import { StudentSectionHeader } from "@/components/9fit/StudentSectionHeader";
import { OnboardingsCard } from "@/components/9fit/OnboardingsCard";

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
interface WeightMeta {
  source: string;
  created_at: string;
}
const WEIGHT_SOURCE_LABEL: Record<string, string> = {
  perfil: "Perfil",
  avaliacao_guiada: "Avaliação guiada",
  atualizacao_direta: "Atualização direta",
  baseline: "Registro inicial",
};

export default function NineFitProfile() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const {
    totalXp,
    level,
    streak,
    weightKg,
    loading: profileLoading,
    error: profileError,
    refresh: refreshProfile,
  } = useEngrenagem();
  const {
    athleteId,
    athleteName,
    loading: identityLoading,
    error: identityError,
    retry: retryIdentity,
  } = useAthleteId();
  const profileSync = useSyncScore(athleteId);
  const [search, setSearch] = useSearchParams();
  const fichaOpen = search.get("section") === "pdi";
  const setFichaOpen = (open: boolean) => {
    const next = new URLSearchParams(search);
    if (open) next.set("section", "pdi");
    else next.delete("section");
    setSearch(next, { replace: !open });
  };
  const [bio, setBio] = useState<AthleteBio>({
    avatar_url: null,
    age: null,
    height_cm: null,
    weight_kg: null,
  });
  const [bioError, setBioError] = useState(false);
  const [bioLoading, setBioLoading] = useState(true);
  const [bioReload, setBioReload] = useState(0);
  const [weightMeta, setWeightMeta] = useState<WeightMeta | null>(null);

  useEffect(() => {
    if (!athleteId) {
      setBioLoading(identityLoading);
      setBioError(
        !identityLoading && !!identityError && identityError !== ATHLETE_MISSING
      );
      setWeightMeta(null);
      return;
    }
    let cancelled = false;
    setBioLoading(true);
    setBioError(false);
    setWeightMeta(null);
    setBio({ avatar_url: null, age: null, height_cm: null, weight_kg: null });
    (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("athletes")
            .select("avatar_url, age, height_cm:altura_cm")
            .eq("id", athleteId)
            .maybeSingle()
        );
        if (error || !data) throw error || new Error("Perfil indisponível");
        if (!cancelled)
          setBio({
            avatar_url: data.avatar_url,
            age: data.age,
            height_cm: data.height_cm,
            weight_kg: null,
          });

        const { data: hist } = await withTimeout(
          supabase
            .from("athlete_weight_history" as any)
            .select("source, created_at")
            .eq("athlete_id", athleteId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        );
        if (!cancelled) setWeightMeta((hist as any) ?? null);
      } catch {
        if (!cancelled) setBioError(true);
      } finally {
        if (!cancelled) setBioLoading(false);
      }
    })();
    const refresh = () => setBioReload((value) => value + 1);
    window.addEventListener("9fit:profile-updated", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("9fit:profile-updated", refresh);
    };
  }, [athleteId, bioReload, identityLoading, identityError]);

  const displayName =
    athleteName || profile?.full_name || user?.email?.split("@")[0] || "Atleta";
  const fichaNotice = identityNotice(identityLoading, athleteId, identityError);

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Conta e preferências",
      items: [
        {
          icon: Settings2,
          label: "Preferências e suporte",
          sub: "Player, animações e ajuda",
          route: "/9fit/settings",
        },
        {
          icon: CreditCard,
          label: "Pagamento e plano",
          sub: "Consulte seu acesso e as condições",
          route: "/9fit/planos",
        },
        {
          icon: Bell,
          label: "Notificações",
          sub: "Avisos e atualizações",
          route: "/9fit/notificacoes",
        },
        {
          icon: Shield,
          label: "Meus dados",
          sub: "Fontes e compartilhamento",
          route: "/9fit/progresso/fontes",
        },
      ],
    },
    {
      title: "Treino e evolução",
      items: [
        {
          icon: Calendar,
          label: "Planejamento",
          sub: "Sua programação",
          route: "/9fit/planejamento",
        },
        {
          icon: Dumbbell,
          label: "Ajuste de treino",
          sub: "Revise e salve a sessão",
          route: "/9fit/ajuste-treino",
        },
        {
          icon: TrendingUp,
          label: "Histórico",
          sub: "Suas métricas e registros",
          route: "/9fit/progresso",
        },
        {
          icon: Users,
          label: "Equipe",
          sub: "Encontre seu profissional",
          route: "/9fit/staff",
        },
        {
          icon: Share2,
          label: "Compartilhar conquistas",
          sub: "Cards dos seus registros",
          route: "/9fit/compartilhar",
        },
      ],
    },
  ];

  const openItem = (it: MenuItem) => {
    if (it.action === "ficha") {
      setFichaOpen(true);
      return;
    }
    if (it.route) navigate(it.route);
  };

  return (
    <div className="fitpro-orange min-h-screen bg-background pb-32 text-foreground">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <StudentSectionHeader
          kicker="9FIT / PERFIL"
          title="O plano começa por você."
          description="Mantenha seus dados e preferências alinhados à sua rotina."
        />

        {/* Identidade e contexto; pontos ficam em uma camada secundária. */}
        <section className="px-4 mt-5">
          {fichaNotice === "unlinked" && (
            <p className="rounded-xl border border-border p-4 text-sm">
              {IDENTITY_COPY.unlinked}
            </p>
          )}
          {fichaNotice === "unread" && (
            <button
              onClick={() => void retryIdentity()}
              className="w-full rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-left text-sm"
            >
              {IDENTITY_COPY.unread} Tentar novamente
            </button>
          )}
          {fichaNotice === "ready" && (
            <>
              {bioError && (
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new Event("9fit:profile-updated"))
                  }
                  className="mb-3 min-h-11 rounded-xl border border-amber-400/30 px-3 text-left text-xs text-amber-200"
                >
                  Não foi possível confirmar os dados físicos. Tentar novamente
                </button>
              )}
              {profileError && (
                <button
                  type="button"
                  onClick={() => void refreshProfile()}
                  className="mb-3 min-h-11 rounded-xl border border-amber-400/30 px-3 text-left text-xs text-amber-200"
                >
                  Pontos e nível não confirmados. Tentar novamente
                </button>
              )}
              {(profileLoading || bioLoading) && (
                <p role="status" className="mb-3 text-xs text-muted-foreground">
                  Atualizando seu perfil…
                </p>
              )}
              <DigitalIDCard
                name={displayName}
                level={level}
                syncScore={
                  profileSync.status === "available" ? profileSync.value : null
                }
                totalXP={totalXp}
                streak={streak}
                statsKnown={!profileLoading && !profileError}
                bioRead={
                  bioLoading ? "loading" : bioError ? "unavailable" : "ready"
                }
                weightRead={
                  profileLoading
                    ? "loading"
                    : profileError
                    ? "unavailable"
                    : "ready"
                }
                avatarUrl={bioError || bioLoading ? null : bio.avatar_url}
                age={bioError || bioLoading ? null : bio.age}
                heightCm={bioError || bioLoading ? null : bio.height_cm}
                weightKg={profileLoading || profileError ? null : weightKg}
              />
            </>
          )}
          {!profileLoading &&
            !profileError &&
            weightKg != null &&
            weightMeta && (
              <p className="mt-2 px-1 text-[11px] text-muted-foreground">
                Peso {weightKg} kg ·{" "}
                {WEIGHT_SOURCE_LABEL[weightMeta.source] || weightMeta.source}
                {weightMeta.source !== "baseline"
                  ? ` em ${new Date(weightMeta.created_at).toLocaleDateString(
                      "pt-BR"
                    )}`
                  : ""}
              </p>
            )}
        </section>

        {fichaNotice === "ready" && (
          <section className="mt-6 px-4">
            <StudentBlockTitle
              number="01"
              title="O que orienta seu plano"
              description="Objetivo, tempo disponível e restrições precisam continuar fazendo sentido para você."
            />
            <StudentActionCard
              icon={Brain}
              title="Revisar minha ficha"
              description="Confira objetivos e preferências. Use a revisão para informar o que mudou na sua rotina."
              onClick={() => setFichaOpen(true)}
            />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Atualizar a ficha informa seu contexto. Confira no Treino se uma
              mudança foi aplicada à sessão; restrições pedem revisão com seu
              profissional.
            </p>
          </section>
        )}
        {fichaNotice === "ready" && (
          <div className="mt-6 px-4">
            <StudentDetailGroup
              title="Seus primeiros passos no app"
              description="Retome sua apresentação, ativação ou as missões de uso."
            >
              <OnboardingsCard />
            </StudentDetailGroup>
          </div>
        )}

        {/* Menu */}
        <div className="px-4 mt-6 space-y-3">
          {sections.map((section, index) => (
            <section key={section.title} className="pt-4">
              <StudentBlockTitle
                number={`0${index + 2}`}
                title={section.title}
                description={
                  index === 0
                    ? "Acesso, privacidade e preferências sob seu controle."
                    : "Encontre sua programação, seus registros e sua equipe."
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {section.items.map((it) => (
                  <StudentActionCard
                    key={it.label}
                    icon={it.icon}
                    title={it.label}
                    description={it.sub}
                    to={it.route}
                    onClick={() => openItem(it)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTAs — "Completar perfil" saiu daqui: já está embutido no ID Card acima */}
        <div className="px-4 mt-6 space-y-3">
          <button
            onClick={async () => {
              await logout();
              navigate("/9fit/login");
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.02] py-3 text-sm text-muted-foreground hover:text-destructive flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>

        <Dialog open={fichaOpen} onOpenChange={setFichaOpen}>
          <DialogContent className="fitpro-orange max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-2xl">
            <DialogHeader className="border-b border-border/15 pb-3">
              <DialogTitle>Minha ficha</DialogTitle>
              <DialogDescription>
                Confira seus objetivos, preferências e restrições.
              </DialogDescription>
            </DialogHeader>
            {fichaOpen && (
              <Suspense fallback={<p role="status">Carregando sua ficha…</p>}>
                <DynamicPDI />
              </Suspense>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <BottomNavigation />
    </div>
  );
}
