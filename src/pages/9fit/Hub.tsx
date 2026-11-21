import { useSyncScore } from "@/hooks/useSyncScore";
import { HubQuickRecords } from "@/components/9fit/HubQuickRecords";

import { withTimeout } from '@/lib/withTimeout';
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { SyncScoreDiagnosisModal } from "@/components/9fit/SyncScoreDiagnosisModal";
import { HeroSyncSection } from "@/components/9fit/HeroSyncSection";
import { HubRonCard } from "@/components/9fit/HubRonCard";
import { HubSequentialCarousel } from "@/components/9fit/HubSequentialCarousel";
import { FitOSConsoleDock } from "@/components/9fit/FitOSConsoleDock";
import { useUserState } from "@/hooks/useUserState";
import { Link, useNavigate } from "react-router-dom";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useAthleteScores } from "@/hooks/useAthleteScores";
import { useOnboardingCheck } from "@/hooks/useOnboardingCheck";
import { WeeklyRecapPrompt } from "@/components/9fit/WeeklyRecapPrompt";
import { type CycleStatus } from "@/components/9fit/cycleStatus";
import { hubFactLabel } from "@/components/9fit/hubWeeklyBrief";
import { IDENTITY_COPY, identityNotice } from "@/components/9fit/identityNotice";

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
  const { athleteId, athleteName, loading: athleteLoading, error: identityError, retry: retryIdentity } = useAthleteId();
  const navigate = useNavigate();
  const { invalidate } = useUserState();
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const { data: liveScores, refresh: refreshScores } = useAthleteScores(athleteId);
  const {routine,status:scoreStatus,context:syncContext,refresh:refreshSync}=useSyncScore(athleteId);
  useOnboardingCheck(); // Auto-ativa Prime aos 7 dias

  const [protocolCount, setProtocolCount] = useState(0);
  const [libraryStatus, setLibraryStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [performancePlanTitle, setPerformancePlanTitle] = useState<string | null>(null);
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>("loading");
  const [hubLoading, setHubLoading] = useState(true);
  const hubRequest = useRef(0);
  const [hubError, setHubError] = useState<string | null>(null);

  const breakdown = {
    treino: liveScores?.dimensions.treino.value ?? null,
    nutri: liveScores?.dimensions.nutri.value ?? null,
    sono: liveScores?.dimensions.sono.value ?? null,
    mob: liveScores?.dimensions.mob.value ?? null,
    hidr: liveScores?.dimensions.hidr.value ?? null,
  };
  const weekly = liveScores?.weekly ?? null;
  const scoresKnown = liveScores != null;

  // A checklist de ativação saiu do Hub: agora vive em Perfil > Meu app > Ativações
  // (src/pages/9fit/Ativacao.tsx), que carrega vw_hub_status por conta própria.
  const loadHubData = async () => {
    const request = ++hubRequest.current;
    if (!athleteId) {
      setHubLoading(athleteLoading);
      setPerformancePlanTitle(null);
      setCycleStatus(athleteLoading ? "loading" : "unavailable");
      setProtocolCount(0);
      setLibraryStatus(athleteLoading ? "loading" : "unavailable");
      return;
    }
    setHubLoading(true);
    setHubError(null);
    try {
      const [performanceResult, libraryResult] = await withTimeout(Promise.all([
        supabase.from("vw_fitpro_performance_overview" as any).select("plan_title").eq("athlete_id", athleteId).maybeSingle(),
        supabase.from("student_library_assignments").select("id", { count: "exact", head: true }).eq("athlete_id", athleteId).is("completed_at", null),
      ]));
      if (request !== hubRequest.current) return;

      if (!performanceResult.error) {
        const title = (performanceResult.data as { plan_title?: string | null } | null)?.plan_title || null;
        setPerformancePlanTitle(title);
        setCycleStatus(title ? "active" : "none");
      } else {
        setPerformancePlanTitle(null);
        setCycleStatus("unavailable");
      }
      if (!libraryResult.error) {
        setProtocolCount(libraryResult.count || 0);
        setLibraryStatus("ready");
      } else {
        setProtocolCount(0);
        setLibraryStatus("unavailable");
      }

      const failed = [performanceResult.error, libraryResult.error].filter(Boolean);
      if (failed.length === 2) setHubError("Não foi possível carregar seus dados agora.");
      else if (failed.length) setHubError("Alguns sinais estão sincronizando.");
    } catch {
      if (request === hubRequest.current) {
        setHubError("Não foi possível carregar seus dados agora.");
        setPerformancePlanTitle(null);
        setCycleStatus("unavailable");
        setProtocolCount(0);
        setLibraryStatus("unavailable");
      }
    } finally {
      if (request === hubRequest.current) setHubLoading(false);
    }
  };

  useEffect(() => { void loadHubData(); return () => { ++hubRequest.current; }; }, [athleteId, user?.id, athleteLoading]);

  useRealtimeTable(
    {
      table: "athletes",
      filter: athleteId ? `id=eq.${athleteId}` : undefined,
      enabled: !!athleteId,
    },
    () => loadHubData(),
  );

  useEffect(() => {
    const onComplete = () => {
      invalidate();
      void refreshScores();
      void loadHubData();
    };
    window.addEventListener('9fit:protocol_completed', onComplete);
    window.addEventListener('9fit:sync_updated', onComplete);
    return () => {
      window.removeEventListener('9fit:protocol_completed', onComplete);
      window.removeEventListener('9fit:sync_updated', onComplete);
    };
  }, [invalidate, refreshScores]);

  const name = (athleteName || profile?.full_name || user?.email?.split("@")[0] || "Atleta").split(" ")[0];
  const fichaNotice = identityNotice(athleteLoading, athleteId, identityError);
  const weightLabel = hubFactLabel(
    scoresKnown,
    athleteLoading ? "loading" : scoreStatus,
    liveScores?.weight.value == null ? null : `${liveScores.weight.value} kg`,
    "Não registrado",
  );
  const streakLabel = hubFactLabel(
    scoresKnown,
    athleteLoading ? "loading" : scoreStatus,
    scoresKnown ? `${liveScores?.streak ?? 0} dias` : null,
    "0 dias",
  );
  const engagementLabel = hubFactLabel(
    scoresKnown,
    athleteLoading ? "loading" : scoreStatus,
    liveScores?.engagement.value == null ? null : `${liveScores.engagement.value}/100`,
    "Sem leitura",
  );

  return (
    <div className="min-h-screen bg-background pb-28">
      <WeeklyRecapPrompt />
      {fichaNotice === "unlinked" && <p className="mx-4 mt-3 rounded-xl border border-border p-4 text-sm">{IDENTITY_COPY.unlinked}</p>}
      {fichaNotice === "unread" && (
        <div className="mx-4 mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-destructive">{IDENTITY_COPY.unread}</p>
          <button onClick={() => void retryIdentity()} className="text-xs text-primary shrink-0">Tentar de novo</button>
        </div>
      )}
      {hubLoading && (
        <p className="px-4 pt-3 text-[11px] text-muted-foreground">Carregando seus dados…</p>
      )}
      {hubError && (
        <div className="mx-4 mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-destructive">{hubError}</p>
          <button onClick={() => void loadHubData()} className="text-xs text-primary shrink-0">Tentar de novo</button>
        </div>
      )}

      <motion.div
        variants={hubStaggerContainer}
        initial="hidden"
        animate="visible"
        className="w-full space-y-6 px-4 md:px-6"
      >
        <header className="flex items-center justify-between pt-4"><h1 className="text-2xl font-bold">Hub</h1><Link to="/9fit/modules" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-primary-foreground">Ver módulos</Link></header>
        <motion.div variants={hubStaggerItem} className="relative">
          <HeroSyncSection
            name={name}
            syncScore={routine.value}
            scoreStatus={scoreStatus}
            breakdown={breakdown}
            routinePillars
            onDiagnosis={() => setShowDiagnosis(true)}
            lastUpdate={syncContext?.generated_at}
            onRefresh={() => { void refreshSync(); void refreshScores(); }}
          />
        </motion.div>

        {athleteId && user?.id && <HubQuickRecords key={athleteId} athleteId={athleteId} userId={user.id} />}
        <SyncScoreDiagnosisModal
           context={syncContext}
           open={showDiagnosis}
           onClose={() => setShowDiagnosis(false)}
           score={routine.value}
           routine={routine}
           status={scoreStatus}
           breakdown={breakdown}
        />

        <motion.div variants={hubStaggerItem}>
          <HubRonCard syncScore={routine.value} scoreStatus={scoreStatus} name={name} />
        </motion.div>
        <div className="flex flex-wrap gap-3 rounded-2xl border border-primary/20 p-3 text-xs text-muted-foreground" aria-label="Resumo do perfil e da rotina">
          <span>Peso: {weightLabel}</span>
          <span>Sequência de calibração: {streakLabel}</span>
          <span>Engajamento: {engagementLabel}</span>
        </div>

        <motion.div variants={hubStaggerItem}>
          <FitOSConsoleDock
            weekly={weekly}
            scoreStatus={athleteLoading ? "loading" : scoreStatus}
            liveScoresVitals={liveScores?.vitals}
            invalidateUserState={invalidate}
            performancePlanTitle={performancePlanTitle}
            cycleStatus={cycleStatus}
            libraryStatus={libraryStatus}
            breakdown={breakdown}
            protocolCount={protocolCount}
          />
        </motion.div>

        {/* Explorar ecossistema: os 2 cards de destaque (Staff e SmartTreino) saíram do grid.
            Fica só a entrada para a tela de módulos. */}
        <motion.div variants={hubStaggerItem} id="ecosystem-grid">
          <button
            type="button"
            onClick={() => navigate("/9fit/modules")}
            aria-label="Abrir tela com todos os módulos"
            className="w-full rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/20 to-black p-5 text-left flex items-center justify-between gap-3"
          >
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">Explorar ecossistema</h2>
              <p className="font-mono text-[11px] text-primary mt-2">VER TODOS OS MÓDULOS</p>
            </div>
            <ChevronRight className="w-5 h-5 text-primary shrink-0" />
          </button>
        </motion.div>

        <motion.div variants={hubStaggerItem}>
          <p className="text-label mb-3">DESTAQUES</p>
          <HubSequentialCarousel />
        </motion.div>
      </motion.div>

      <BottomNavigation />

    </div>
  );
}
