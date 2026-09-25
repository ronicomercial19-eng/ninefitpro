import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { DailyProtocol } from "@/components/9fit/DailyProtocol";
import { HeroSyncSection } from "@/components/9fit/HeroSyncSection";
import { HubFloatingMetrics } from "@/components/9fit/HubFloatingMetrics";
import { WeeklyRadar3D } from "@/components/9fit/WeeklyRadar3D";
import { HubRonCard } from "@/components/9fit/HubRonCard";
import { HubSequentialCarousel } from "@/components/9fit/HubSequentialCarousel";
import { RonBubble } from "@/components/9fit/RonBubble";
import { ActivationMissionCard } from "@/components/9fit/ActivationMissionCard";
import { QuickMoodInput } from "@/components/9fit/QuickMoodInput";
import { ContextualPaywall } from "@/components/9fit/ContextualPaywall";
import { UpsellBanner } from "@/components/9fit/UpsellBanner";
import { EcosystemGrid } from "@/components/9fit/EcosystemGrid";
import { DynamicOffers } from "@/components/9fit/DynamicOffers";
import { QuickCheckIn } from "@/components/9fit/QuickCheckIn";
import { HubWeeklyCounters } from "@/components/9fit/HubWeeklyCounters";
import { CollapsibleRow } from "@/components/9fit/CollapsibleRow";
import { useUserState } from "@/hooks/useUserState";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Library, Radar as RadarIcon, Flame, Rocket, CalendarCheck, Gift } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useAthleteScores } from "@/hooks/useAthleteScores";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";
import { WeeklyRecapPrompt } from "@/components/9fit/WeeklyRecapPrompt";


export default function NineFitHub() {
  const { user, profile } = useAuth();
  const { athleteId, athleteName } = useAthleteId();
  const navigate = useNavigate();
  const { invalidate } = useUserState();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { data: liveScores, status: scoreStatus, refresh: refreshScores } = useAthleteScores(athleteId);
  useOnboardingCheck(); // Auto-ativa Prime aos 7 dias




  const [protocolCount, setProtocolCount] = useState(0);
  const [performancePlanTitle, setPerformancePlanTitle] = useState<string | null>(null);
  const [hubLoading, setHubLoading] = useState(true);
  const [hubError, setHubError] = useState<string | null>(null);
  const breakdown = {
    treino: liveScores?.dimensions.treino.value ?? null,
    nutri: liveScores?.dimensions.nutri.value ?? null,
    sono: liveScores?.dimensions.sono.value ?? null,
    mob: liveScores?.dimensions.mob.value ?? null,
    hidr: liveScores?.dimensions.hidr.value ?? null,
  };
  const weekly = liveScores?.weekly ?? null;

  const loadHubData = useCallback(async () => {
    if (!athleteId) {
      setHubLoading(false);
      setHubError("Perfil de atleta indisponível. Entre novamente para sincronizar seus dados.");
      setPerformancePlanTitle(null);
      setProtocolCount(0);
      return;
    }
    setHubLoading(true);
    setHubError(null);
    try {
      // Leituras independentes: uma view indisponível não congela a home inteira.
      const [hubResult, performanceResult, libraryResult] = await Promise.all([
        supabase.from("vw_hub_status" as any).select("*").eq("athlete_id", athleteId).maybeSingle(),
        supabase.from("vw_fitpro_performance_overview" as any).select("plan_title").eq("athlete_id", athleteId).maybeSingle(),
        supabase.from("student_library_assignments").select("id", { count: "exact", head: true }).eq("athlete_id", athleteId).is("completed_at", null),
      ]);

      setPerformancePlanTitle((performanceResult.data as any)?.plan_title || null);
      setProtocolCount(libraryResult.count || 0);
      if (hubResult.error || performanceResult.error || libraryResult.error) {
        console.warn("[Hub] algumas fontes não responderam", {
          hub: hubResult.error?.message,
          performance: performanceResult.error?.message,
          library: libraryResult.error?.message,
        });
        setHubError("Alguns sinais estão sincronizando; o restante da home continua disponível.");
      }
    } catch (e: any) {
      console.error("[Hub] loadHubData:", e);
      setHubError("Não foi possível carregar seus dados agora.");
    } finally {
      setHubLoading(false);
    }
  }, [athleteId]);

  useEffect(() => { void loadHubData(); }, [loadHubData]);

  useRealtimeTable(
    {
      table: "athletes",
      filter: athleteId ? `id=eq.${athleteId}` : undefined,
      enabled: !!athleteId,
    },
    () => loadHubData(),
  );

  // Paywall D7+ para usuários não-premium + escuta close-loop do protocolo
  useEffect(() => {
    if (!user?.id) return;
    const createdAt = new Date(user.created_at || Date.now()).getTime();
    const daysIn = (Date.now() - createdAt) / 86_400_000;
    const lastShown = Number(localStorage.getItem('9fit_paywall_hub_last') || 0);
    const cooldownOk = Date.now() - lastShown > 3 * 86_400_000;
    if (daysIn >= 7 && cooldownOk) {
      const t = setTimeout(() => {
        setPaywallOpen(true);
        localStorage.setItem('9fit_paywall_hub_last', String(Date.now()));
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [user?.id, user?.created_at]);

  useEffect(() => {
    const onComplete = () => {
      invalidate();
      void refreshScores();
    };
    window.addEventListener('9fit:protocol_completed', onComplete);
    return () => window.removeEventListener('9fit:protocol_completed', onComplete);
  }, [invalidate, refreshScores]);


  const name = (athleteName || profile?.full_name || user?.email?.split("@")[0] || "Atleta").split(" ")[0];

  return (
    <div className="min-h-screen bg-background pb-28">
      <WeeklyRecapPrompt />
      {hubLoading && (
        <p className="px-4 pt-3 text-[11px] text-muted-foreground">Carregando seus dados…</p>
      )}
      {hubError && (
        <div className="mx-4 mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-destructive">{hubError}</p>
          <button onClick={() => void loadHubData()} className="text-xs text-primary shrink-0">Tentar de novo</button>
        </div>
      )}
      {/* 1. HERO SYNC — único elemento aberto/protagonista da tela (redesign Nine Pro v2) */}
      <HeroSyncSection
        name={name}
        syncScore={liveScores?.sync.value ?? null}
        scoreStatus={scoreStatus}
        breakdown={breakdown}
        lastUpdate={liveScores?.sync.observed_at ?? undefined}
      />

      {/* 2. RON — convite ativo, mantido aberto (2º elemento com destaque da tela) */}
      <div className="px-4 mt-6">
        <HubRonCard syncScore={liveScores?.sync.value ?? null} scoreStatus={scoreStatus} name={name} />
      </div>

      {/* Tudo abaixo vira resumo de 1 linha (navegação progressiva) — nada removido,
          só peso visual reduzido. Paleta contida (21/09): laranja em tons +
          dourado/roxo só onde faz sentido (ofertas=dourado/promo, protocolo=roxo/premium). */}
      <div className="px-4 mt-4 space-y-2.5">
        <CollapsibleRow icon={<Flame className="w-4 h-4" />} accent="18 100% 59%" label={weekly ? `Treino ${weekly.treinos} · Nutri ${weekly.nutri} · Move ${weekly.minutos}min` : "Treino — · Nutri — · Move —"}>
          <HubFloatingMetrics vitals={liveScores?.vitals} />
          <div className="mt-3">
            <QuickMoodInput onLogged={invalidate} />
          </div>
        </CollapsibleRow>

        <CollapsibleRow icon={<Rocket className="w-4 h-4" />} accent="12 85% 50%" label="Sua ativação">
          <ActivationMissionCard />
          <div className="mt-3">
          <HubWeeklyCounters treinos={weekly?.treinos ?? null} nutri={weekly?.nutri ?? null} minutos={weekly?.minutos ?? null} />
          </div>
          {performancePlanTitle && <p className="text-[11px] text-muted-foreground mt-2">Plano ativo: <span className="text-foreground">{performancePlanTitle}</span></p>}
        </CollapsibleRow>

        <CollapsibleRow icon={<RadarIcon className="w-4 h-4" />} accent="30 95% 52%" label="Radar semanal · Protocolo do dia">
          <DailyProtocol />
          <div className="mt-4">
            <WeeklyRadar3D current={breakdown} />
          </div>
          <div className="mt-4">
            <UpsellBanner
              context="hub_upsell"
              storageKey="hub_after_protocol"
              variant="amber"
              headline="Desbloqueie protocolos premium e RON v9 completo"
              cta="Testar 7 dias grátis"
            />
          </div>
        </CollapsibleRow>

        {protocolCount > 0 && (
          <button
            onClick={() => navigate("/9fit/protocolo")}
            className="w-full fit-os-panel bg-card/30 p-4 flex items-center gap-3 hover:border-primary/30 transition-colors text-left"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                background: 'linear-gradient(135deg, hsl(280 70% 62% / 0.30), hsl(280 70% 62% / 0.06))',
                borderColor: 'hsl(280 70% 62% / 0.35)',
                boxShadow: '0 0 14px -4px hsl(280 70% 62% / 0.55)',
                color: 'hsl(280 70% 62%)',
              }}
            >
              <Library className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-label">SEU PROTOCOLO</p>
              <p className="text-sm font-semibold">
                {protocolCount} conteúdo{protocolCount > 1 ? "s" : ""}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        <CollapsibleRow icon={<CalendarCheck className="w-4 h-4" />} accent="20 100% 50%" label="Próxima aula · check-in">
          <QuickCheckIn />
        </CollapsibleRow>

        <CollapsibleRow icon={<Gift className="w-4 h-4" />} accent="45 95% 58%" label="Ofertas pra você">
          <DynamicOffers compact />
        </CollapsibleRow>
      </div>

      {/* 7. ECOSYSTEM MODULES (grid nativo via physio_modules) */}
      <div id="ecosystem-grid" className="px-4 mt-6">
        <EcosystemGrid />
      </div>

      {/* Carrossel sequencial legado */}
      <div className="px-4 mt-6">
        <p className="text-label mb-3">DESTAQUES</p>
        <HubSequentialCarousel />
      </div>

      <RonBubble />
      <BottomNavigation />

      <ContextualPaywall
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        context="hub_upsell"
        headline={`${name}, seu sistema está pronto para o próximo nível.`}
        subline="7 dias grátis no PRIME · cancele quando quiser"
      />

    </div>
  );
}
