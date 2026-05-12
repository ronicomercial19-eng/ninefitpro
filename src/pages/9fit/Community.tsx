import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { Users, Trophy, Flame, MessageCircle } from "lucide-react";

const TRIBES = [
  { name: "Hipertrofia BR", members: 1248, hot: true },
  { name: "Cardio Elite", members: 892, hot: false },
  { name: "Bio-Hackers", members: 614, hot: true },
  { name: "Powerlifters", members: 470, hot: false },
];

export default function NineFitCommunity() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // SOCIAL</p>
        <h1 className="text-massive text-3xl text-foreground mt-1">FITCOMMUNITY</h1>
        <p className="text-xs font-data text-muted-foreground uppercase tracking-widest mt-1">
          Tribos · Conexões · Ranking
        </p>
      </div>

      <button
        onClick={() => navigate("/9fit/social")}
        className="mx-4 mb-3 w-[calc(100%-2rem)] glass-mission glass-mission-active rounded-xl p-4 text-left flex items-center gap-3"
      >
        <MessageCircle className="w-6 h-6 text-primary" />
        <div className="flex-1">
          <p className="text-editorial text-base text-foreground">FEED GLOBAL</p>
          <p className="text-[10px] text-muted-foreground">Posts · likes · comentários</p>
        </div>
      </button>

      <div className="px-4 mb-3">
        <p className="text-[10px] font-data tracking-[0.3em] text-muted-foreground mb-2">TRIBOS ATIVAS</p>
        <div className="space-y-2">
          {TRIBES.map((t) => (
            <button key={t.name} className="w-full glass-mission rounded-xl p-3 flex items-center gap-3 text-left">
              <Users className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-display uppercase text-foreground">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.members} membros</p>
              </div>
              {t.hot && <Flame className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        <button onClick={() => navigate("/9fit/stats")} className="w-full glass-mission rounded-xl p-4 text-left flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-display uppercase">Ranking Global</p>
            <p className="text-[10px] text-muted-foreground">Veja sua posição no XP</p>
          </div>
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
}
