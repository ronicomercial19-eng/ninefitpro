import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { OSDashboard } from "@/components/9fit/OSDashboard";
import { QuickTrainModal } from "@/components/9fit/QuickTrainModal";
import { MotivationalQuoteModal } from "@/components/9fit/MotivationalQuoteModal";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useAthleteScores } from "@/hooks/useAthleteScores";
import { type CycleStatus } from "@/components/9fit/cycleStatus";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function NineFitOS() {
  const { user, profile } = useAuth();
  const { athleteId, athleteName, loading: athleteLoading } = useAthleteId();
  const { data: scores, status } = useAthleteScores(athleteId);
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>("loading");
  const [showQuickTrain, setShowQuickTrain] = useState(false);
  const [showMotivationalQuote, setShowMotivationalQuote] = useState(false);
  const name = (athleteName || profile?.full_name || user?.email?.split("@")[0] || "Atleta").split(" ")[0];

  useEffect(() => {
    const handlerTrain = () => setShowQuickTrain(true);
    const handlerQuote = () => setShowMotivationalQuote(true);
    window.addEventListener('9fit:open-quick-train', handlerTrain);
    window.addEventListener('9fit:open-motivational-quote', handlerQuote);
    return () => {
      window.removeEventListener('9fit:open-quick-train', handlerTrain);
      window.removeEventListener('9fit:open-motivational-quote', handlerQuote);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!athleteId) {
      setCycleStatus(athleteLoading ? "loading" : "unavailable");
      return;
    }
    setCycleStatus("loading");
    supabase.from("vw_fitpro_performance_overview" as any).select("plan_title").eq("athlete_id", athleteId).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setCycleStatus("unavailable");
          return;
        }
        setCycleStatus((data as { plan_title?: string | null } | null)?.plan_title ? "active" : "none");
      });
    return () => { cancelled = true; };
  }, [athleteId, athleteLoading]);
  return (
    <div className="fit-os-grid min-h-screen bg-background pb-28">
      <OSDashboard
        name={name}
        syncScore={scores?.sync.value ?? null}
        scoreStatus={athleteLoading ? "loading" : status}
        weekly={scores?.weekly ?? null}
        cycleStatus={cycleStatus}
      />
      <QuickTrainModal open={showQuickTrain} onClose={() => setShowQuickTrain(false)} />
      <MotivationalQuoteModal open={showMotivationalQuote} onClose={() => setShowMotivationalQuote(false)} />
      <BottomNavigation />
    </div>
  );
}
