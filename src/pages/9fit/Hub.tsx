import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { usePredictiveContext } from "@/hooks/usePredictiveContext";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { PersonalIDCard } from "@/components/9fit/PersonalIDCard";
import { DailyProtocol } from "@/components/9fit/DailyProtocol";
import { HubSequentialCarousel } from "@/components/9fit/HubSequentialCarousel";
import { WeeklyProgressChart } from "@/components/9fit/WeeklyProgressChart";
import { Sparkles, Crown, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function NineFitHub() {
  const { user, profile } = useAuth();
  const { athleteId, athleteName } = useAthleteId();
  const { snapshot } = usePredictiveContext();
  const navigate = useNavigate();

  const [card, setCard] = useState({ level: 1, classTier: "Diamante", syncScore: 0, streak: 0, totalXP: 0 });

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      const { data } = await supabase
        .from("athletes")
        .select("level, total_xp, xp_total, sync_score")
        .eq("id", athleteId)
        .maybeSingle();
      if (data) {
        const xp = (data as any).xp_total || (data as any).total_xp || 0;
        setCard({
          level: (data as any).level || Math.max(1, Math.floor(xp / 200) + 1),
          classTier: xp > 2000 ? "Elite" : "Diamante",
          syncScore: (data as any).sync_score || 72,
          streak: 0,
          totalXP: xp,
        });
      }
    })();
  }, [athleteId]);

  const name = (athleteName || profile?.full_name || user?.email?.split("@")[0] || "Atleta").split(" ")[0];

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // VANGUARDA</p>
        <h1 className="text-editorial text-3xl text-foreground mt-1">Hub</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Contexto: {snapshot.context.replace("-", " ")}
        </p>
      </div>

      <div className="px-4 mb-4">
        <PersonalIDCard
          name={name}
          level={card.level}
          classTier={card.classTier}
          syncScore={card.syncScore}
          streak={card.streak}
          totalXP={card.totalXP}
        />
      </div>

      {snapshot.insights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="px-4 mb-4">
          <div className="glass-mission glass-mission-active rounded-xl p-3 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-[10px] font-data tracking-[0.25em] text-primary/80 mb-1">RON INSIGHTS</p>
              {snapshot.insights.map((i) => (
                <p key={i} className="text-xs text-foreground/90">{i}</p>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div className="px-4 mb-4">
        <p className="text-[10px] font-data tracking-[0.3em] text-muted-foreground mb-2">ADERÊNCIA — 7D</p>
        <div className="glass-mission rounded-xl p-3">
          <WeeklyProgressChart athleteId={athleteId} />
        </div>
      </div>

      <div className="px-4 mb-4">
        <DailyProtocol />
      </div>

      <div className="px-4 mb-4">
        <p className="text-[10px] font-data tracking-[0.3em] text-muted-foreground mb-2">MÓDULOS</p>
        <HubSequentialCarousel />
      </div>

      {/* 9PASS CARD - dourado */}
      <div className="px-4 mb-4">
        <button
          onClick={() => navigate("/9fit/primepass")}
          className="w-full relative rounded-2xl overflow-hidden text-left group"
          style={{
            background: "linear-gradient(135deg, #3a2c0d 0%, #8c6a18 40%, #f0d78c 100%)",
            boxShadow: "0 18px 40px -12px rgba(201,168,76,0.55)",
          }}
        >
          <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_70%_30%,#fff,transparent_60%)]" />
          <div className="relative p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-black/40 border border-yellow-200/40 flex items-center justify-center">
              <Crown className="w-6 h-6 text-yellow-100" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-data tracking-[0.4em] text-yellow-100/90">9PASS</p>
              <p className="text-xl font-display uppercase text-yellow-50 tracking-tight">9PASS CARD</p>
              <p className="text-[11px] text-yellow-100/80">Acesso ao Hub Lounge Premium</p>
            </div>
            <ChevronRight className="w-5 h-5 text-yellow-50/90 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
}
