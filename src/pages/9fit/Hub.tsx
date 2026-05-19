import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { PersonalIDCard } from "@/components/9fit/PersonalIDCard";
import { DailyProtocol } from "@/components/9fit/DailyProtocol";
import { SyncScoreRing } from "@/components/9fit/SyncScoreRing";
import { StreakBadge } from "@/components/9fit/StreakBadge";
import { WeeklyRadar } from "@/components/9fit/WeeklyRadar";
import { HubPredictiveTip } from "@/components/9fit/HubPredictiveTip";
import { HubSequentialCarousel } from "@/components/9fit/HubSequentialCarousel";
import { useNavigate } from "react-router-dom";
import { Crown, ChevronRight, Library } from "lucide-react";

export default function NineFitHub() {
  const { user, profile } = useAuth();
  const { athleteId, athleteName } = useAthleteId();
  const navigate = useNavigate();

  const [card, setCard] = useState({ level: 1, classTier: "Diamante", syncScore: 0, streak: 0, totalXP: 0 });
  const [breakdown, setBreakdown] = useState({ treino: 0, nutri: 0, sono: 0, mob: 0, hidr: 0 });
  const [protocolCount, setProtocolCount] = useState(0);

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      const { data } = await supabase
        .from("athletes")
        .select("level, total_xp, xp_total, sync_score")
        .eq("id", athleteId)
        .maybeSingle();

      const xp = (data as any)?.xp_total || (data as any)?.total_xp || 0;
      const sync = (data as any)?.sync_score || 0;

      // Load 7d breakdown from master_registry
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
        treino: pct(cnt("workout_completed"), 4),
        nutri:  pct(cnt("nutrition_log"), 21),
        sono:   pct(cnt("sleep_log"), 7),
        mob:    pct(cnt("mobility_log"), 4),
        hidr:   pct(cnt("hydration_log"), 14),
      };
      setBreakdown(bd);

      const compositeSync = sync || Math.round(
        bd.treino * 0.25 + bd.nutri * 0.25 + bd.sono * 0.25 + bd.mob * 0.125 + bd.hidr * 0.125
      );

      setCard({
        level: (data as any)?.level || Math.max(1, Math.floor(xp / 200) + 1),
        classTier: xp > 2000 ? "Elite" : "Diamante",
        syncScore: compositeSync,
        streak: cnt("workout_completed") + cnt("daily_protocol_step") > 0 ? cnt("daily_protocol_step") : 0,
        totalXP: xp,
      });

      // Active protocols
      const { count } = await supabase
        .from("student_library_assignments")
        .select("id", { count: "exact", head: true })
        .eq("athlete_id", athleteId)
        .is("completed_at", null);
      setProtocolCount(count || 0);
    })();
  }, [athleteId, user?.id]);

  const name = (athleteName || profile?.full_name || user?.email?.split("@")[0] || "Atleta").split(" ")[0];

  const insight = card.syncScore >= 75
    ? `Sync ${card.syncScore} — consistência excelente. Mantenha o ritmo.`
    : card.syncScore >= 50
    ? `Sync ${card.syncScore}. Priorize sono e nutrição esta semana.`
    : `Sync ${card.syncScore}. Comece pelo Daily Protocol agora.`;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-label">9FIT • HUB</p>
        <h1 className="text-display text-3xl mt-1">Olá, {name}.</h1>
      </div>

      {/* 1. ID CARD */}
      <div className="px-4 mb-3">
        <PersonalIDCard
          name={name}
          level={card.level}
          classTier={card.classTier}
          syncScore={card.syncScore}
          streak={card.streak}
          totalXP={card.totalXP}
        />
      </div>

      {/* 2. DAILY PROTOCOL */}
      <div className="px-4 mb-3">
        <DailyProtocol />
      </div>

      {/* 3. SYNC SCORE RING */}
      <div className="px-4 mb-3">
        <SyncScoreRing score={card.syncScore} breakdown={breakdown} />
      </div>

      {/* 4. STREAK + RADAR */}
      <div className="px-4 mb-3 space-y-3">
        <StreakBadge streak={card.streak} />
        <WeeklyRadar current={breakdown} />
      </div>

      {/* 5. PREDICTIVE TIP */}
      <div className="px-4 mb-3">
        <HubPredictiveTip tip={insight} context="Toque para conversar com o RON" />
      </div>

      {/* 6. PROTOCOL CARD (if any active) */}
      {protocolCount > 0 && (
        <div className="px-4 mb-3">
          <button
            onClick={() => navigate("/9fit/protocolo")}
            className="w-full surface-card p-4 flex items-center gap-3 hover:border-primary/30 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-label">SEU PROTOCOLO</p>
              <p className="text-sm font-semibold">{protocolCount} conteúdo{protocolCount > 1 ? "s" : ""} ativo{protocolCount > 1 ? "s" : ""}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* 7. MODULES */}
      <div className="px-4 mb-3">
        <p className="text-label mb-2">MÓDULOS</p>
        <HubSequentialCarousel />
      </div>

      {/* 9PASS */}
      <div className="px-4 mb-4">
        <button
          onClick={() => navigate("/9fit/primepass")}
          className="w-full surface-card p-4 flex items-center gap-3 hover:border-primary/30 transition-colors text-left"
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

      <BottomNavigation />
    </div>
  );
}
