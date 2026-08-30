import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Calendar, Dumbbell, Crown, TrendingUp, CreditCard,
  ChevronRight, ExternalLink, Flame, LogOut, Brain, UserCheck, BellRing, BellOff, Share, MessageCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import { supabase } from "@/integrations/supabase/client";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { PDIWizard } from "@/components/9fit/PDIWizard";
import { CompleteProfileFlow } from "@/components/9fit/CompleteProfileFlow";
import { NotificationBell } from "@/components/9fit/NotificationBell";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface MenuItem {
  icon: any;
  label: string;
  sub: string;
  route: string;
  badge?: string;
  badgeStyle?: "neon" | "outline";
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export default function NineFitProfile() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { athleteId } = useAthleteId();
  const [staffOnline, setStaffOnline] = useState(3);
  const [planTier, setPlanTier] = useState("Aluno Premium");
  const [pdiOpen, setPdiOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const { supported: pushSupported, subscribed: pushSubscribed, loading: pushLoading, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // FIX (Rony, 30/08): fichas diárias do RON visíveis no perfil — antes
  // não existia lugar nenhum no app pra ver o saldo.
  const [credits, setCredits] = useState<{ remaining: number; total: number; resetAt: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("role", ["professor", "admin"] as any);
      if (count) setStaffOnline(Math.min(9, Math.max(1, Math.round(count / 3))));
    })();
  }, []);

  useEffect(() => {
    if (!athleteId) return;
    supabase
      .from("athlete_credits" as any)
      .select("credits_remaining, credits_total, reset_at")
      .eq("athlete_id", athleteId)
      .maybeSingle()
      .then(({ data }) => {
        const d: any = data;
        if (d) setCredits({ remaining: d.credits_remaining, total: d.credits_total, resetAt: d.reset_at });
      });
  }, [athleteId]);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Atleta";

  // FIX #37 (QA Master): "Configurações" era uma lista única misturando
  // produto/serviço (Staff, Planejamento, Ajuste de Treino, Ron) com
  // conta de verdade (Histórico, Pagamento). Separado em duas seções
  // com propósito claro.
  const ecosystemItems: MenuItem[] = [
    { icon: Users, label: "Staff", sub: "Treinadores e nutricionistas", route: "/9fit/staff", badge: `${staffOnline} online`, badgeStyle: "neon" },
    { icon: Calendar, label: "Planejamento", sub: "Próximos treinos e refeições", route: "/9fit/planejamento" },
    { icon: Dumbbell, label: "Ajuste de Treino", sub: "Solicitar alterações", route: "/9fit/ajuste-treino", badge: "Novo", badgeStyle: "outline" },
    { icon: Crown, label: "RON", sub: "Coach virtual e check-ins", route: "/9fit/ron" },
  ];

  const accountItems: MenuItem[] = [
    { icon: TrendingUp, label: "Histórico", sub: "Relatórios e evolução", route: "/9fit/progresso" },
    { icon: CreditCard, label: "Pagamento & Plano", sub: "Ver histórico e planos", route: "/9fit/billing" },
  ];

  const handlePushClick = () => {
    // iOS Safari só expõe a API de Push quando o app está instalado (modo standalone).
    // Fora disso, o navegador simplesmente não suporta — orientamos a instalar primeiro.
    if (isIOS() && !isStandalone()) {
      setShowIOSInstructions(true);
      return;
    }
    if (!pushSupported) {
      setShowIOSInstructions(true);
      return;
    }
    pushSubscribed ? unsubscribePush() : subscribePush();
  };

  const renderItem = (it: MenuItem) => (
    <button key={it.label} onClick={() => navigate(it.route)}
      className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex items-center gap-4 hover:border-primary/40 transition">
      <div className="w-11 h-11 rounded-lg border border-primary/30 bg-primary/[0.06] flex items-center justify-center">
        <it.icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="font-display text-lg">{it.label}</p>
          {it.badge && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              it.badgeStyle === "neon"
                ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
                : "border border-primary/60 text-primary"
            }`}>
              {it.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{it.sub}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* Top bar */}
      <header className="px-4 pt-6 flex items-center gap-2 border-b border-primary/30 pb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Flame className="w-5 h-5 text-primary" />
        </div>
        <h1 className="flex-1 text-center text-2xl font-display">Configurações</h1>
        <NotificationBell />
      </header>

      {/* Profile */}
      <section className="px-4 mt-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full border-2 border-primary bg-white/5 grid place-items-center font-display text-2xl text-primary">
          {displayName[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-display text-2xl">{displayName}</p>
          <p className="text-primary font-semibold text-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {planTier}
          </p>
        </div>
      </section>

      {/* Fichas diárias do RON */}
      {credits && (
        <section className="px-4 mt-4">
          <button
            onClick={() => navigate("/9fit/ron")}
            className="w-full rounded-2xl border border-primary/30 bg-primary/[0.05] p-4 flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-lg border border-primary/30 bg-primary/[0.08] flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-display text-lg">
                {credits.remaining}/{credits.total} fichas do RON hoje
              </p>
              <p className="text-xs text-muted-foreground">
                {credits.resetAt
                  ? `Renovam ${new Date(credits.resetAt).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                  : "Não cumulativas · renovam todo dia"}
              </p>
            </div>
            <div className="w-14 h-1.5 rounded-full bg-white/10 overflow-hidden shrink-0">
              <div
                className="h-full bg-primary"
                style={{ width: `${credits.total > 0 ? (credits.remaining / credits.total) * 100 : 0}%` }}
              />
            </div>
          </button>
        </section>
      )}

      {/* CONTA — notificações + histórico + pagamento */}
      <div className="px-4 mt-6">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 px-1">Conta</p>
        <div className="space-y-3">
          <button
            onClick={handlePushClick}
            disabled={pushLoading}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex items-center gap-4 hover:border-primary/40 transition disabled:opacity-50"
          >
            <div className="w-11 h-11 rounded-lg border border-primary/30 bg-primary/[0.06] flex items-center justify-center">
              {pushSubscribed ? <BellRing className="w-5 h-5 text-primary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 text-left">
              <p className="font-display text-lg">
                {pushSubscribed ? "Notificações push ativas" : "Ativar notificações push"}
              </p>
              <p className="text-xs text-muted-foreground">
                {pushSubscribed
                  ? "Toque para desativar neste dispositivo"
                  : isIOS() && !isStandalone()
                  ? "No iPhone: instale o app na tela de início primeiro"
                  : "Receba avisos de treino e agenda no celular"}
              </p>
            </div>
          </button>

          {showIOSInstructions && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs text-muted-foreground space-y-2">
              <p className="text-foreground font-medium flex items-center gap-2">
                <Share className="w-4 h-4 text-primary" /> Pra ativar notificações no iPhone:
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Toque no ícone de compartilhar do Safari (o quadrado com a seta pra cima)</li>
                <li>Toque em "Adicionar à Tela de Início"</li>
                <li>Abra o 9FIT pelo ícone na tela de início (não pelo Safari)</li>
                <li>Volte aqui e toque em "Ativar notificações push"</li>
              </ol>
              <button onClick={() => setShowIOSInstructions(false)} className="text-primary underline">
                Entendi
              </button>
            </div>
          )}

          {accountItems.map(renderItem)}
        </div>
      </div>

      {/* ECOSSISTEMA — atalhos de produto/serviço, não são "configuração" */}
      <div className="px-4 mt-6">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 px-1">Ecossistema</p>
        <div className="space-y-3">
          {ecosystemItems.map(renderItem)}
        </div>
      </div>

      {/* PERFIL — completar cadastro / calibração de IA */}
      <div className="px-4 mt-6">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 px-1">Perfil</p>
        <div className="space-y-3">
          <button onClick={() => setCompleteOpen(true)}
            className="w-full rounded-2xl border border-primary/40 bg-primary/[0.06] py-3 font-semibold flex items-center justify-center gap-2 text-primary">
            <UserCheck className="w-4 h-4" /> Completar perfil (5 etapas)
          </button>
          <button onClick={() => setPdiOpen(true)}
            className="w-full rounded-2xl border border-primary/40 bg-primary/[0.06] py-3 font-semibold flex items-center justify-center gap-2 text-primary">
            <Brain className="w-4 h-4" /> Calibrar IA (PDI)
          </button>
        </div>
      </div>

      {/* Ações gerais */}
      <div className="px-4 mt-6 space-y-3">
        <button onClick={() => navigate("/9fit/hub")}
          className="w-full rounded-full bg-gradient-to-r from-primary to-primary/70 text-primary-foreground py-3.5 font-bold flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]">
          Explorar mais opções <ExternalLink className="w-4 h-4" />
        </button>
        <button onClick={() => navigate("/9fit/native-system")}
          className="w-full rounded-full border border-primary/50 text-primary py-3 font-semibold flex items-center justify-center gap-2">
          Abrir Sistema Nativo <ExternalLink className="w-4 h-4" />
        </button>
        <button onClick={async () => { await logout(); navigate("/9fit/login"); }}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.02] py-3 text-sm text-muted-foreground hover:text-destructive flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>

      <PDIWizard open={pdiOpen} onClose={() => setPdiOpen(false)} />
      <CompleteProfileFlow open={completeOpen} onClose={() => setCompleteOpen(false)} />
      <BottomNavigation />
    </div>
  );
}
