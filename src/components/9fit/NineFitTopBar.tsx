import { Bell, Menu, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useCredits } from "@/hooks/useCredits";

export function NineFitTopBar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { athleteId } = useAthleteId();
  const { remaining } = useCredits(athleteId);
  const [unread, setUnread] = useState(0);

  const refresh = async () => {
    if (!user?.id) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnread(count ?? 0);
  };

  useEffect(() => { refresh(); }, [user?.id]);

  useRealtimeTable(
    { table: "notifications", filter: user?.id ? `user_id=eq.${user.id}` : undefined, enabled: !!user?.id },
    () => refresh(),
  );

  return (
    <div className="sticky top-0 z-30 pt-safe bg-background/70 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center justify-between px-4 h-12">
        <button
          onClick={() => navigate("/9fit/profile")}
          className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-foreground hover:text-primary transition"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate("/9fit/hub")}
          className="flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary glow-neon" />
          <span className="text-[11px] font-display tracking-[0.4em] text-foreground uppercase">
            Fit OS
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/9fit/checkout?pack=recharge")}
            className={`flex items-center gap-1 px-2 h-8 rounded-full border transition ${
              remaining <= 0
                ? "border-primary text-primary glow-neon animate-pulse"
                : remaining < 20
                ? "border-primary/50 text-primary"
                : "border-white/10 text-foreground hover:text-primary"
            }`}
            aria-label="Fichas 9FIT"
            title={`${remaining} fichas disponíveis`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="text-[10px] font-data tabular-nums">{remaining}</span>
          </button>
          <button
            onClick={() => navigate("/9fit/mensagens")}
            className="relative w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-foreground hover:text-primary transition"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center glow-neon">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
