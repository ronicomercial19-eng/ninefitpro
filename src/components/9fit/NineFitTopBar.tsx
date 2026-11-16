import { Bell, UserRound, Coins, Crown, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useCredits } from "@/hooks/useCredits";
import { loadPrimeSnapshot, type PrimeSnapshot } from "@/integrations/primeSystem";

export function NineFitTopBar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { athleteId } = useAthleteId();
  const { remaining, loading: creditsLoading, error: creditsError, refresh: refreshCredits } = useCredits(athleteId);
  const creditsUnavailable = !athleteId || creditsError;
  const [unread, setUnread] = useState(0);
  const [showCredits, setShowCredits] = useState(false);
  const [snapshot, setSnapshot] = useState<PrimeSnapshot | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) { setUnread(0); return; }
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setUnread(count ?? 0);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    let active = true;
    if (user?.id && athleteId) {
      void loadPrimeSnapshot(user.id, athleteId).then((value) => { if (active) setSnapshot(value); });
    } else setSnapshot(null);
    return () => { active = false; };
  }, [user?.id, athleteId]);

  useRealtimeTable(
    { table: "notifications", filter: user?.id ? `user_id=eq.${user.id}` : undefined, enabled: !!user?.id },
    () => refresh(),
  );

  return (
    <div className="sticky top-0 z-30 pt-safe bg-background border-b border-white/5">
      <div className="flex items-center justify-between px-4 h-12">
        <button
          onClick={() => navigate("/9fit/profile")}
          className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-foreground hover:text-primary transition"
          aria-label="Abrir perfil"
        >
          <UserRound className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate("/9fit/os")}
          className="flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary glow-neon" />
          <span className="text-[11px] font-display tracking-[0.4em] text-foreground uppercase">
            Fit OS
          </span>
          {snapshot?.entitlement === "active" && <Crown className="w-3 h-3 text-primary ml-1" />}
        </button>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Abrir RON IA" onClick={() => window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge'))} className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-primary"><MessageSquare className="h-4 w-4" /></button>
          <button
            onClick={() => setShowCredits((value) => !value)}
            className={`flex items-center gap-1 px-2 h-8 rounded-full border transition ${
              !creditsLoading && !creditsUnavailable && remaining <= 0
                ? "border-primary text-primary glow-neon animate-pulse"
                : !creditsLoading && !creditsUnavailable && remaining < 20
                ? "border-primary/50 text-primary"
                : "border-white/10 text-foreground hover:text-primary"
            }`}
            aria-label={creditsLoading ? "Consultando fichas 9FIT" : creditsUnavailable ? "Saldo de fichas indisponível" : `Fichas 9FIT: ${remaining} disponíveis`}
            aria-expanded={showCredits}
            title={creditsLoading ? "Consultando fichas" : creditsUnavailable ? "Não foi possível consultar as fichas" : `${remaining} fichas disponíveis`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="text-[10px] font-data tabular-nums">{creditsLoading ? "…" : creditsUnavailable ? "?" : remaining}</span>
          </button>
          <button
            onClick={() => navigate("/9fit/notificacoes")}
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
      {showCredits && (
        <div className="absolute right-3 top-12 z-50 w-64 rounded-2xl border border-white/10 bg-card p-4 shadow-xl" role="dialog" aria-label="Saldo de fichas">
          <p className="text-sm font-semibold">Fichas 9FIT</p>
          <p className="mt-1 text-sm text-muted-foreground">{creditsLoading ? "Consultando saldo…" : creditsUnavailable ? "Não foi possível consultar seu saldo." : `${remaining} disponíveis para recursos de IA.`}</p>
          {athleteId && creditsError && <button onClick={() => void refreshCredits()} className="mt-2 text-sm font-semibold text-primary underline">Tentar novamente</button>}
          <p className="mt-2 text-xs text-muted-foreground">A compra de fichas ainda não está disponível no aplicativo.</p>
          <button onClick={() => { setShowCredits(false); navigate('/9fit/native-system?app=staff'); }} className="mt-3 text-sm font-semibold text-primary underline">Consultar equipe</button>
          <button onClick={() => setShowCredits(false)} className="ml-4 text-sm text-muted-foreground">Fechar</button>
        </div>
      )}
    </div>
  );
}
