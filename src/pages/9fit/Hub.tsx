import { useEffect, useState } from "react";
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
import { HubMissionsCard, type HubMissions } from "@/components/9fit/HubMissionsCard";
import { HubWeeklyCounters } from "@/components/9fit/HubWeeklyCounters";
import { useUserState } from "@/hooks/useUserState";
import { useNavigate } from "react-router-dom";
import { Crown, ChevronRight, Library } from "lucide-react";


export default function NineFitHub() {
  const { user, profile } = useAuth();
  const { athleteId, athleteName } = useAthleteId();
  const navigate = useNavigate();
  const { invalidate } = useUserState();
  const [paywallOpen, setPaywallOpen] = useState(false);




  const [card, setCard] = useState({ level: 1, classTier: "Diamante", syncScore: 0, streak: 0, totalXP: 0 });
  const [breakdown, setBreakdown] = useState({ treino: 0, nutri: 0, sono: 0, mob: 0, hidr: 0 });
  const [protocolCount, setProtocolCount] = useState(0);
  const [weekly, setWeekly] = useState({ treinos: 0, nutri: 0, minutos: 0 });
  const [missions, setMissions] = useState<HubMissions | null>(null);

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      // PROMPT 1 — dados reais via vw_hub_status
      const { data: hub } = await supabase
        .from("vw_hub_status" as any)
        .select("*")
        .eq("athlete_id", athleteId)
        .maybeSingle();
      const h: any = hub || {};

      setWeekly({
        treinos: h.treinos_semana || 0,
        nutri:   h.nutri_semana   || 0,
        minutos: h.minutos_semana || 0,
      });
      setMissions({
        missao_avaliacao:       !!h.missao_avaliacao,
        missao_plano:           !!h.missao_plano,
        missao_primeiro_treino: !!h.missao_primeiro_treino,
        missao_3dias:           !!h.missao_3dias,
        missao_7dias:           !!h.missao_7dias,
      });

      // 7d breakdown (radar) — composto via master_registry
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: reg } = await supabase
        .from("master_registry" as any)
        .select("event_type")
        .eq("user_id", user?.id)
        .gte("created_at", since);
      const events = (reg as any[]) || [];
      const cnt = (k: string) => events.filter(e => e.event_type === k).length;
      const pct = (n: number, max: number) => Math.min(100, (n / max) * 100);
      const bd = {
        treino: pct(h.treinos_semana || cnt("workout_completed"), 4),
        nutri:  pct(h.nutri_semana   || cnt("nutrition_log"), 21),
        sono:   pct(cnt("sleep_log"), 7),
        mob:    pct(cnt("mobility_log"), 4),
        hidr:   pct(cnt("hydration_log"), 14),
      };
      setBreakdown(bd);

      const xp = h.total_xp || 0;
      setCard({
        level: h.level || 1,
        classTier: xp > 2000 ? "Elite" : "Diamante",
        syncScore: h.sync_score ?? 0,
        streak: cnt("daily_protocol_step"),
        totalXP: xp,
      });

      const { count } = await supabase
        .from("student_library_assignments")
        .select("id", { count: "exact", head: true })
        .eq("athlete_id", athleteId)
        .is("completed_at", null);
      setProtocolCount(count || 0);
    })();
  }, [athleteId, user?.id]);

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
    const onComplete = () => invalidate();
    window.addEventListener('9fit:protocol_completed', onComplete);
    return () => window.removeEventListener('9fit:protocol_completed', onComplete);
  }, [invalidate]);


  const name = (athleteName || profile?.full_name || user?.email?.split("@")[0] || "Atleta").split(" ")[0];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* 1. HERO SYNC — full bleed B&W + halo */}
      <HeroSyncSection
        name={name}
        syncScore={card.syncScore}
        breakdown={breakdown}
        lastUpdate="agora"
      />

      {/* 2. FLOATING METRICS — glass sensors */}
      <HubFloatingMetrics />

      {/* 2.5 QUICK MOOD INPUT — fecha core loop */}
      <QuickMoodInput onLogged={invalidate} />

      {/* 3. RON & PRESENÇA — card inteligente substitui tip simples */}
      <div className="px-4 mt-8">
        <HubRonCard syncScore={card.syncScore} name={name} />
      </div>

      {/* 3.5 ATIVAÇÃO 14d + Missões reais (vw_hub_status) */}
      <div className="px-4 mt-6 space-y-3">
        <ActivationMissionCard />
        <HubWeeklyCounters treinos={weekly.treinos} nutri={weekly.nutri} minutos={weekly.minutos} />
        <HubMissionsCard missions={missions} />
      </div>


      {/* 4. DAILY PROTOCOL — premium fisiológico */}
      <div className="px-4 mt-8">
        <DailyProtocol />
      </div>

      {/* 4.5 UPSELL — após protocolo (mais alta intenção) */}
      <div className="px-4 mt-6">
        <UpsellBanner
          context="hub_upsell"
          storageKey="hub_after_protocol"
          variant="amber"
          headline="Desbloqueie protocolos premium e RON v9 completo"
          cta="Testar 7 dias grátis"
        />
      </div>



      {/* 5. RADAR 5D 3D */}
      <div className="px-4 mt-8">
        <WeeklyRadar3D current={breakdown} />
      </div>

      {/* 6. PROTOCOL ACTIVE */}
      {protocolCount > 0 && (
        <div className="px-4 mt-6">
          <button
            onClick={() => navigate("/9fit/protocolo")}
            className="w-full rounded-2xl p-4 flex items-center gap-3 border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl hover:border-primary/30 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-label">SEU PROTOCOLO</p>
              <p className="text-sm font-semibold">
                {protocolCount} conteúdo{protocolCount > 1 ? "s" : ""} ativo
                {protocolCount > 1 ? "s" : ""}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Check-in da próxima aula → fluxo Staff */}
      <div className="px-4 mt-6">
        <QuickCheckIn />
      </div>

      {/* Ofertas dinâmicas */}
      <div className="px-4 mt-6">
        <DynamicOffers compact />
      </div>

      {/* 7. ECOSYSTEM MODULES (grid nativo via physio_modules) */}
      <div className="px-4 mt-8">
        <EcosystemGrid />
      </div>

      {/* Carrossel sequencial legado */}
      <div className="px-4 mt-6">
        <p className="text-label mb-3">DESTAQUES</p>
        <HubSequentialCarousel />
      </div>

      {/* 8. 9PASS */}
      <div className="px-4 mt-6">
        <button
          onClick={() => navigate("/9fit/primepass")}
          className="w-full rounded-2xl p-4 flex items-center gap-3 border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl hover:border-primary/30 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-label">9PASS</p>
            <p className="text-sm font-semibold">Acesso ao Hub Lounge Premium</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
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
