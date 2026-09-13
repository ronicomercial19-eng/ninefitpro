import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { OSDashboard } from "@/components/9fit/OSDashboard";
import { RonBubble } from "@/components/9fit/RonBubble";
import { HubCommandDeck } from "@/components/9fit/HubCommandDeck";
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
  const name = (athleteName || profile?.full_name || user?.email?.split("@")[0] || "Atleta").split(" ")[0];
  useEffect(() => {
    if (!athleteId) return;
    supabase.from("vw_fitpro_performance_overview" as any).select("plan_title").eq("athlete_id", athleteId).maybeSingle()
      .then(({ data }) => setHasPlan(Boolean((data as any)?.plan_title)));
  }, [athleteId]);
  return (
    <div className="fit-os-grid min-h-screen bg-background pb-28">
      <HubCommandDeck name={name} syncScore={scores?.sync.value ?? null} scoreStatus={status} weekly={scores?.weekly ?? { treinos: 0, nutri: 0, minutos: 0 }} hasPlan={hasPlan} />
      <OSDashboard />
      <RonBubble />
      <BottomNavigation />
    </div>
  );
}
