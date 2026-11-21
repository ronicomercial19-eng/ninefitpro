import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useOnboardings } from "@/hooks/useOnboardings";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { StudentSectionHeader } from "@/components/9fit/StudentSectionHeader";
import { AppActivationOnboarding } from "@/components/9fit/AppActivationOnboarding";
import { HubMissionsCard, type HubMissions } from "@/components/9fit/HubMissionsCard";
import { MeuAppOnboarding } from "@/components/9fit/MeuAppOnboarding";

type View = "ativacoes" | "onboarding";

/**
 * Perfil > Onboardings.
 *  /9fit/ativacao                    -> quem ainda não fez a ativação rápida vai para /9fit/profile?onboarding=1
 *  /9fit/ativacao?full=1             -> Ativações (missões + assistente completo, opcional)
 *  /9fit/ativacao?view=onboarding    -> Conhecer o app (vídeos guiados)
 */
export default function NineFitAtivacao() {
  const [search, setSearch] = useSearchParams();
  const view: View = search.get("view") === "onboarding" ? "onboarding" : "ativacoes";
  const full = search.get("full") === "1";
  const { athleteId } = useAthleteId();
  const onboardings = useOnboardings();
  const [missions, setMissions] = useState<HubMissions | null>(null);

  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("vw_hub_status" as any)
          .select("missao_avaliacao, missao_plano, missao_primeiro_treino, missao_3dias, missao_7dias")
          .eq("athlete_id", athleteId)
          .maybeSingle();
        if (cancelled || error || !data) return;
        const row = data as unknown as Record<string, boolean | null>;
        setMissions({
          missao_avaliacao: !!row.missao_avaliacao,
          missao_plano: !!row.missao_plano,
          missao_primeiro_treino: !!row.missao_primeiro_treino,
          missao_3dias: !!row.missao_3dias,
          missao_7dias: !!row.missao_7dias,
        });
      } catch {
        /* sem checklist: a página segue com o fluxo de ativação */
      }
    })();
    return () => { cancelled = true; };
  }, [athleteId]);

  const setView = (next: View) => {
    const params = new URLSearchParams(search);
    if (next === "onboarding") params.set("view", "onboarding");
    else params.delete("view");
    setSearch(params, { replace: true });
  };

  // Entrada sem atrito: a primeira coisa é a ativação rápida (3 respostas), não o assistente completo.
  if (!full && view === "ativacoes") {
    if (onboardings.isPending) return <p className="p-12 text-center" role="status">Carregando…</p>;
    if (onboardings.data?.current === "ativacao_rapida") return <Navigate to="/9fit/profile?onboarding=1" replace />;
  }

  return (
    <div className="fitpro-orange min-h-screen bg-background pb-28">
      <StudentSectionHeader
        kicker="9FIT // ONBOARDINGS"
        title={view === "onboarding" ? "Conhecer o app" : "Ativações"}
        description={view === "onboarding" ? "Aprenda a usar o app com vídeos guiados." : "Missões e ficha completa, no seu ritmo."}
      />

      <div className="px-4 my-4">
        <div className="glass-mission rounded-full p-1 flex gap-1" role="tablist" aria-label="Onboardings">
          {([
            { k: "ativacoes", l: "Ativações" },
            { k: "onboarding", l: "Conhecer o app" },
          ] as { k: View; l: string }[]).map((t) => (
            <button
              key={t.k}
              role="tab"
              aria-selected={view === t.k}
              onClick={() => setView(t.k)}
              className={`flex-1 py-2 rounded-full text-[10px] font-display uppercase tracking-widest transition-all ${
                view === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {view === "onboarding" ? (
        <MeuAppOnboarding />
      ) : (
        <div className="space-y-4">
          {missions && (
            <div className="px-4">
              <HubMissionsCard missions={missions} />
            </div>
          )}
          <AppActivationOnboarding />
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}
