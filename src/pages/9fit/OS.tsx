import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { OSDashboard } from "@/components/9fit/OSDashboard";
import { QuickTrainModal } from "@/components/9fit/QuickTrainModal";
import { MotivationalQuoteModal } from "@/components/9fit/MotivationalQuoteModal";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useAthleteScores } from "@/hooks/useAthleteScores";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function NineFitOS() {
  const { user, profile } = useAuth();
  const { athleteId, athleteName } = useAthleteId();
  const { data: scores, status } = useAthleteScores(athleteId);
  const [hasPlan, setHasPlan] = useState(false);
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
    if (!athleteId) return;
    supabase.from("vw_fitpro_performance_overview" as any).select("plan_title").eq("athlete_id", athleteId).maybeSingle()
      .then(({ data }) => setHasPlan(Boolean((data as any)?.plan_title)));
  }, [athleteId]);
  return (
    <div className="fit-os-grid min-h-screen bg-background pb-28">
      <OSDashboard
        name={name}
        syncScore={scores?.sync.value ?? null}
        scoreStatus={status}
        weekly={scores?.weekly ?? { treinos: 0, nutri: 0, minutos: 0 }}
        hasPlan={hasPlan}
      />
      <QuickTrainModal open={showQuickTrain} onClose={() => setShowQuickTrain(false)} />
      <MotivationalQuoteModal open={showMotivationalQuote} onClose={() => setShowMotivationalQuote(false)} />
      <BottomNavigation />
    </div>
  );
}
