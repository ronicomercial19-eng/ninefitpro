import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { SyncScoreDiagnosisModal } from "@/components/9fit/SyncScoreDiagnosisModal";
import { HeroSyncSection } from "@/components/9fit/HeroSyncSection";
import { HubRonCard } from "@/components/9fit/HubRonCard";
import { HubSequentialCarousel } from "@/components/9fit/HubSequentialCarousel";
import { ContextualPaywall } from "@/components/9fit/ContextualPaywall";
import { EcosystemGrid } from "@/components/9fit/EcosystemGrid";
import { FitOSConsoleDock } from "@/components/9fit/FitOSConsoleDock";
import { useUserState } from "@/hooks/useUserState";
import { useNavigate } from "react-router-dom";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useAthleteScores } from "@/hooks/useAthleteScores";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";
import { WeeklyRecapPrompt } from "@/components/9fit/WeeklyRecapPrompt";
import { ShareableCard } from "@/components/9fit/ShareableCard";
import { Info } from "lucide-react";
import { usePushNotifications, useBluetoothRequest } from "@/hooks/useDeviceCapabilities";

const hubStaggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05,
    },
  },
};

const hubStaggerItem = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 18,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 280,
      damping: 24,
      mass: 0.85,
    },
  },
};

export default function NineFitHub() {
  const { user, profile } = useAuth();
  const { athleteId, athleteName } = useAthleteId();
  const navigate = useNavigate();
  const { invalidate } = useUserState();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
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
  const weekly = liveScores?.weekly ?? { treinos: 0, nutri: 0, minutos: 0 };

  const loadHubData = async () => {
    if (!athleteId) return;
    setHubLoading(true);
    setHubError(null);
    try {
      const [hubResult, performanceResult, libraryResult] = await Promise.all([
        supabase.from("vw_hub_status" as any).select("*").eq("athlete_id", athleteId).maybeSingle(),
        supabase.from("vw_fitpro_performance_overview" as any).select("plan_title").eq("athlete_id", athleteId).maybeSingle(),
        supabase.from("student_library_assignments").select("id", { count: "exact", head: true }).eq("athlete_id", athleteId).is("completed_at", null),
      ]);

      setPerformancePlanTitle((performanceResult.data as any)?.plan_title || null);
      setProtocolCount(libraryResult.count || 0);
      if (hubResult.error || performanceResult.error || libraryResult.error) {
        setHubError("Alguns sinais estão sincronizando.");
      }
    } catch (e: any) {
      setHubError("Não foi possível carregar seus dados agora.");
    } finally {
      setHubLoading(false);
    }
  };

  useEffect(() => { loadHubData(); }, [athleteId, user?.id]);

  useRealtimeTable(
    {
      table: "athletes",
      filter: athleteId ? `id=eq.${athleteId}` : undefined,
      enabled: !!athleteId,
    },
    () => loadHubData(),
  );

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
  
  const { permission, requestPermission } = usePushNotifications();
  const { requestDevice } = useBluetoothRequest();

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

      {/* Device Capabilities Prompt */}
      <div className="px-4 md:px-6 flex gap-2 my-4">
        {permission !== 'granted' && (
          <button onClick={requestPermission} className="text-xs bg-primary/10 text-primary p-2 rounded">Enable Push</button>
        )}
        <button onClick={requestDevice} className="text-xs bg-primary/10 text-primary p-2 rounded">Scan Bluetooth</button>
      </div>

      <motion.div
        variants={hubStaggerContainer}
        initial="hidden"
        animate="visible"
        className="w-full space-y-6 px-4 md:px-6"
      >
        <motion.div variants={hubStaggerItem} className="relative">
          <HeroSyncSection
            name={name}
            syncScore={liveScores?.sync.value ?? null}
            scoreStatus={scoreStatus}
            breakdown={breakdown}
            lastUpdate={liveScores?.sync.observed_at ?? undefined}
            onRefresh={() => void refreshScores()}
          />
          <button 
            onClick={() => setShowDiagnosis(true)}
            className="absolute top-4 right-4 p-2 bg-background/50 rounded-full backdrop-blur"
            title="Diagnóstico de Sincronia"
          >
             <Info className="w-4 h-4 text-primary" />
          </button>
        </motion.div>

        <SyncScoreDiagnosisModal 
           open={showDiagnosis} 
           onClose={() => setShowDiagnosis(false)}
           score={liveScores?.sync.value ?? null}
           status={scoreStatus}
           breakdown={breakdown}
        />

        <motion.div variants={hubStaggerItem}>
          <HubRonCard syncScore={liveScores?.sync.value ?? null} scoreStatus={scoreStatus} name={name} />
        </motion.div>

        <motion.div variants={hubStaggerItem}>
          <FitOSConsoleDock
            weekly={weekly}
            liveScoresVitals={liveScores?.vitals}
            invalidateUserState={invalidate}
            performancePlanTitle={performancePlanTitle}
            breakdown={breakdown}
            protocolCount={protocolCount}
          />
        </motion.div>

        <motion.div variants={hubStaggerItem} id="ecosystem-grid">
          <EcosystemGrid />
        </motion.div>

        <motion.div variants={hubStaggerItem}>
          <p className="text-label mb-3">DESTAQUES</p>
          <HubSequentialCarousel />
        </motion.div>
      </motion.div>

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
