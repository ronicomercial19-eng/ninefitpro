import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { DailyProtocol } from "@/components/9fit/DailyProtocol";
import { PersonalIDCard } from "@/components/9fit/PersonalIDCard";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { Activity, Calendar, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NineFitOS() {
  const { user, profile } = useAuth();
  const { athleteName } = useAthleteId();
  const navigate = useNavigate();
  const name = (athleteName || profile?.full_name || user?.email?.split("@")[0] || "Atleta").split(" ")[0];

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // OS</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">DASHBOARD PESSOAL</h1>
      </div>

      <div className="px-4 mb-4">
        <PersonalIDCard name={name} level={1} classTier="Diamante" syncScore={72} streak={0} totalXP={0} />
      </div>

      <div className="px-4 mb-4">
        <DailyProtocol />
      </div>

      <div className="px-4 grid grid-cols-3 gap-3">
        <Tile icon={Activity} label="Saúde" onClick={() => navigate("/9fit/stats")} />
        <Tile icon={Calendar} label="Agenda" onClick={() => navigate("/9fit/aulas-creditos")} />
        <Tile icon={Target} label="Metas" onClick={() => navigate("/9fit/profile")} />
      </div>

      <BottomNavigation />
    </div>
  );
}

function Tile({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="glass-mission rounded-xl p-4 flex flex-col items-center gap-2">
      <Icon className="w-5 h-5 text-primary" />
      <span className="text-[10px] font-data tracking-widest text-foreground uppercase">{label}</span>
    </button>
  );
}
