import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { RonWaveform } from "@/components/9fit/RonWaveform";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useUserState } from "@/hooks/useUserState";
import { STATE_INSIGHT, STATE_LABEL, STATE_COLOR } from "@/services/adaptiveState";
import {
  Send,
  Calendar,
  CalendarDays,
  CalendarPlus,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Brain,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  Zap,
} from "lucide-react";
import { detectPain } from "@/services/pain/detectPain";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "sonner";
import { useSendZap, useZapMessages, useZapThread } from "@/hooks/use-ninezap-chat";
import {
  initGoogleAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
} from "@/services/googleAuth";
import { RonCalendarModal } from "@/components/9fit/RonCalendarModal";
import {
  executeRonAction,
  RonAction,
  getRonOperationalData,
} from "@/services/ronOperationalCore";

const RON_ACTIONS = [
  { label: "📅 Agendar Treino", actionKey: "calendar_schedule" },
  { label: "⚡ Sincronizar Semana", actionKey: "calendar_sync" },
  { label: "💧 +500ml de Água", actionKey: "log_water" },
  { label: "🏋️ Iniciar Treino", route: "/9fit/train?from=ron" },
  { label: "🥗 Registrar Refeição", route: "/9fit/diet?from=ron" },
  { label: "📈 Ver Progresso", route: "/9fit/progresso?from=ron" },
];

const SUGGESTIONS = [
  "Agendar meu treino no Google Calendar",
  "Como está meu recovery hoje?",
  "Sincronizar treinos da semana na minha agenda",
  "O que meu HRV e fadiga indicam?",
  "Próximo treino recomendado para meu estado",
  "Registrar 500ml de água consumida",
  "Estou sentindo desconforto no ombro, adaptar treino",
];

const RON_CREDIT_PATTERNS = [
  /\b(cri(ar|e)|mont(ar|e)|ger(ar|e)|prescrev(a|er)|planej(ar|e))\b.*\b(treino|planilha|dieta|plano|protocolo)\b/i,
  /\b(treino|planilha|dieta|plano|protocolo)\b.*\b(cri(ar|e)|mont(ar|e)|ger(ar|e)|personaliz(ar|e)|ajust(ar|e))\b/i,
  /\b(analis(ar|e)|relat[oó]rio|avalia[cç][aã]o completa|interpreta[rç])\b.*\b(meu|minha|dados|semana|progresso|corpo|performance)\b/i,
  /\b(pdf|export(ar|e)|prescri[cç][aã]o|periodiza[cç][aã]o completa)\b/i,
];

function ronRequestNeedsCredit(message: string) {
  return RON_CREDIT_PATTERNS.some((pattern) => pattern.test(message));
}

interface Msg {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  action?: { label: string; route?: string; onTrigger?: string };
  actions?: RonAction[];
  calendarAction?: {
    summary: string;
    date?: string;
    time?: string;
  };
}

export default function NineFitRon() {
  const { user } = useAuth();
  const { athleteId } = useAthleteId();
  const { remaining, withCredit } = useCredits(athleteId);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state } = useUserState();

  // 9ZAP legacy thread support
  const zapThread = useZapThread(user?.id, `Atendimento — ${user?.user_metadata?.full_name || "Aluno"}`);
  const zapMessages = useZapMessages(zapThread.data);
  const sendZap = useSendZap(zapThread.data, user?.id);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Google Calendar Auth states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(getAccessToken());
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);

  // Voice Interaction states (Web Speech API)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);

  const autoCtx = params.get("context");
  const autoTriggered = params.get("auto") === "1";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize Google Auth state listener
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        // Not authenticated
      }
    );
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "pt-BR";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
          // Small delay then trigger send for seamless voice chat
          setTimeout(() => {
            handleSend(transcript);
          }, 300);
        }
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.warn("[Voice Recognition] Error:", err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Text to speech helper
  const speakText = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      // Clean markdown tags for natural speech
      const cleanText = text.replace(/[*_#`[\]()]/g, " ").replace(/\s+/g, " ");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "pt-BR";
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("[TTS] Error:", e);
    }
  };

  const toggleVoiceListen = () => {
    if (!speechSupported || !recognitionRef.current) {
      toast.info("Reconhecimento de voz não suportado neste navegador.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info("Escutando... Fale seu pedido ao RON.");
      } catch (err) {
        console.error("Mic start failed", err);
        setIsListening(false);
      }
    }
  };

  // Connect Google Calendar
  const handleGoogleConnect = async () => {
    try {
      const { user, accessToken } = await googleSignIn();
      setGoogleUser(user);
      setGoogleToken(accessToken);
      toast.success("Google Agenda conectada!", {
        description: `Autenticado como ${user.email}. Seus treinos agora podem ser sincronizados.`,
      });

      // System greeting from Ron about Google Calendar
      const greeting = `Sua Google Agenda foi conectada com sucesso (${user.email})! Agora posso sincronizar seus treinos e organizar seus horários diretamente no seu calendário. O que deseja agendar?`;
      setMessages((prev) => [...prev, { role: "assistant", content: greeting }]);
      speakText(greeting);
    } catch (err: any) {
      console.error("[Google Connect Error]:", err);
      toast.error("Erro ao conectar Google Agenda", {
        description: err.message || "Permissão não concedida.",
      });
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setGoogleToken(null);
      toast.info("Conta Google desconectada.");
    } catch (err: any) {
      console.error("[Google Disconnect Error]:", err);
    }
  };

  // Load persisted history
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("ai_chat_messages" as any)
        .select("id, role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(100);
      const hist = (data as any[]) || [];
      if (hist.length === 0) {
        setMessages([
          {
            role: "assistant",
            content:
              "Olá! Eu sou o RON, o Neural Coach do 9FIT PRO potenciado pelo Gemini 3.8. Estou pronto para otimizar sua periodização, monitorar sua recuperação e gerenciar seus treinos no Google Agenda. O que faremos hoje?",
          },
        ]);
      } else {
        setMessages(hist);
      }

      if (autoTriggered) {
        const insights = STATE_INSIGHT[state];
        const insight = insights[0];
        const intro =
          autoCtx === "protocol_complete"
            ? `Protocolo concluído. Modo ${STATE_LABEL[state]} detectado — ${insight} Deseja que eu agende a sessão de amanhã na sua Google Agenda?`
            : autoCtx === "hub_card"
            ? `Você está no modo ${STATE_LABEL[state]}. ${insight} Como posso impulsionar sua performance agora?`
            : `Estou aqui com o motor Gemini ativo. O que precisa agora?`;
        setMessages((p) => [...p, { role: "assistant", content: intro }]);
      }
    })();
  }, [user?.id, autoTriggered, autoCtx, state]);

  // Realtime: novas mensagens entram automaticamente
  useRealtimeTable(
    {
      table: "ai_chat_messages",
      event: "INSERT",
      filter: user?.id ? `user_id=eq.${user.id}` : undefined,
      enabled: !!user?.id,
    },
    (payload) => {
      const row = payload.new as Msg;
      setMessages((p) => (p.some((m) => m.id === row.id) ? p : [...p, row]));
    },
  );

  const persist = async (role: Msg["role"], content: string) => {
    if (!user?.id) return null;
    const { data } = await supabase
      .from("ai_chat_messages" as any)
      .insert({ user_id: user.id, role, content })
      .select("id, role, content, created_at")
      .single();
    return data as any;
  };

  const handlePainSideEffect = async (userMsg: string) => {
    const pain = detectPain(userMsg);
    if (!pain.detected || !athleteId) return null;

    const { error: reportError } = await supabase.from("pain_reports" as any).insert({
      athlete_id: athleteId,
      source: "ron_chat",
      body_region: pain.body_region,
      intensity: pain.intensity,
    } as any);
    if (reportError) {
      console.error("[Ron] pain report failed", reportError);
      return "Percebi seu relato de dor, mas não consegui registrá-lo no banco. Mantenha o treino pausado e procure acompanhamento.";
    }
    if (!pain.body_region)
      return "Registrei seu relato de dor. Indique a região exata para que eu possa sugerir variações biomecânicas adequadas.";

    const today = new Date().toISOString().slice(0, 10);
    const { data: adjustment } = await supabase.rpc("ajustar_exercicio_por_dor" as any, {
      p_athlete_id: athleteId,
      p_exercise_id: null,
      p_body_region: pain.body_region,
      p_workout_date: today,
    });

    const result = adjustment as any;
    if (result?.status === "no_safe_variation") {
      return `Dor em ${pain.body_region} registrada. Recomendo repouso ou treino de grupos musculares antagonistas hoje.`;
    }
    return `Dor em ${pain.body_region} registrada. Apliquei uma modulação protetora para o seu treino de hoje.`;
  };

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend ?? input).trim();
    if (!text || sending || !user?.id) return;
    setInput("");
    setSending(true);

    // Optimistic UI update
    setMessages((p) => [...p, { role: "user", content: text }, { role: "assistant", content: "RON está pensando..." }]);
    await persist("user", text);

    // 1. Pain side effect check
    const painReply = await handlePainSideEffect(text);
    if (painReply) {
      setMessages((p) => {
        const out = [...p];
        out[out.length - 1] = { role: "assistant", content: painReply };
        return out;
      });
      await persist("assistant", painReply);
      speakText(painReply);
      setSending(false);
      return;
    }

    // 2. Direct intent for Google Calendar
    const lower = text.toLowerCase();
    const isCalendarQuery =
      lower.includes("agenda") ||
      lower.includes("calendar") ||
      lower.includes("agendar") ||
      lower.includes("sincronizar semana") ||
      lower.includes("marcar treino");

    // 3. Call server-side Gemini Bot endpoint
    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          context: {
            athleteName: user?.user_metadata?.full_name || "Atleta",
            state,
            stateLabel: STATE_LABEL[state],
            remainingCredits: remaining,
            calendarConnected: Boolean(googleToken),
            currentPage: "/9fit/ron",
            operationalData: getRonOperationalData(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Falha no Gemini Bot (${response.status})`);
      }

      const data = await response.json();
      const replyContent = data.content;
      const returnedActions: RonAction[] = data.actions || [];

      // Attach action CTA if relevant to calendar
      let calendarAction: Msg["action"] | undefined = undefined;
      if (isCalendarQuery) {
        calendarAction = {
          label: googleToken ? "📅 Abrir Google Agenda & Sincronizar" : "🔗 Conectar ao Google Agenda",
          onTrigger: "open_calendar",
        };
      }

      setMessages((p) => {
        const out = [...p];
        out[out.length - 1] = {
          role: "assistant",
          content: replyContent,
          action: calendarAction,
          actions: returnedActions,
        };
        return out;
      });

      await persist("assistant", replyContent);
      speakText(replyContent);
    } catch (err: any) {
      console.warn("[Gemini API Fallback]:", err);
      const fallbackMsg =
        "Estou processando as diretrizes através do motor neural do Gemini 3.8 Flash. Verifique sua conexão e tente novamente em instantes.";
      setMessages((p) => {
        const out = [...p];
        out[out.length - 1] = { role: "assistant", content: fallbackMsg };
        return out;
      });
    } finally {
      setSending(false);
    }
  };

  const handleActionClick = (action: { label: string; route?: string; onTrigger?: string; actionKey?: string }) => {
    if (action.actionKey === "log_water") {
      executeRonAction({ type: "LOG_WATER", title: "+500ml de Água", payload: { amountMl: 500 } });
      return;
    }
    if (action.actionKey === "calendar_sync") {
      executeRonAction({ type: "SYNC_WEEK_CALENDAR", title: "Sincronizar Semana" });
      return;
    }
    if (action.actionKey === "calendar_schedule" || action.onTrigger === "open_calendar" || action.label.includes("Google Agenda")) {
      if (!googleToken) {
        handleGoogleConnect();
      } else {
        setCalendarModalOpen(true);
      }
      return;
    }
    if (action.route) {
      navigate(action.route);
    }
  };

  return (
    <div className="fit-os-grid min-h-screen bg-background pb-28 flex flex-col">
      {/* Top Header */}
      <div className="px-5 pt-8 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="fit-os-label">9FIT // NEURAL ENGINE</p>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                <Sparkles className="w-2.5 h-2.5" /> GEMINI 3.8 FLASH
              </span>
            </div>
            <h1 className="text-display text-3xl text-foreground mt-1 flex items-center gap-2">
              RON <Brain className="w-6 h-6 text-primary animate-pulse" />
            </h1>
            <p className="text-xs text-primary mt-0.5">Assistente biométrico & Agendamento inteligente</p>
          </div>

          {/* Quick Voice / TTS controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? "Voz do RON ativada (clique para mutar)" : "Voz do RON mutada (clique para ativar)"}
              className={`p-2.5 rounded-full border transition-all ${
                ttsEnabled
                  ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_rgba(255,102,0,0.3)]"
                  : "bg-white/[0.04] border-white/10 text-neutral-400 hover:text-white"
              }`}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Google Calendar Status Pill / Bar */}
        <div className="mt-3 p-2.5 rounded-2xl border border-white/10 bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-xl flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">Google Agenda</span>
                {googleToken ? (
                  <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sincronizada
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-400">Não conectada</span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 truncate">
                {googleUser ? googleUser.email : "Conecte para agendar treinos"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {googleToken ? (
              <>
                <button
                  type="button"
                  onClick={() => setCalendarModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Agendar
                </button>
                <button
                  type="button"
                  onClick={handleGoogleDisconnect}
                  title="Desconectar Google Agenda"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleGoogleConnect}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white text-neutral-900 hover:bg-neutral-100 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer font-sans"
              >
                Conectar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Waveform / Visualizer */}
      <div className="px-5 mb-4">
        <div className="fit-os-panel relative h-28 overflow-hidden flex items-center justify-center bg-card/70 backdrop-blur-xl rounded-2xl border border-white/10">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${STATE_COLOR[state] || '#FF6600'}33, transparent 70%)`,
            }}
          />
          <RonWaveform active={sending || isListening} size={50} />
          {isListening && (
            <div className="absolute bottom-2 px-3 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[10px] text-red-300 font-mono flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> RON está ouvindo...
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 px-5 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={m.id ?? i} className="max-w-[85%]" style={{ marginLeft: m.role === "user" ? "auto" : undefined }}>
            <div
              className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-md ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-white/[0.04] border-l-2 border-primary/60 text-foreground backdrop-blur-md rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>

            {/* In-chat Action CTA */}
            {m.action && (
              <button
                onClick={() => handleActionClick(m.action!)}
                className="mt-2 w-full text-xs font-semibold rounded-xl px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
              >
                {m.action.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Structured Operational Actions from RON Brain */}
            {m.actions && m.actions.length > 0 && (
              <div className="mt-2 space-y-2">
                {m.actions.map((act, actIdx) => (
                  <button
                    key={actIdx}
                    onClick={() =>
                      executeRonAction(act, {
                        navigate,
                        onCalendarOpen: () => setCalendarModalOpen(true),
                      })
                    }
                    className="w-full text-left p-2.5 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all flex items-center justify-between group cursor-pointer shadow-sm"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-primary shrink-0" />
                        {act.title}
                      </p>
                      {act.description && (
                        <p className="text-[10px] text-muted-foreground truncate">{act.description}</p>
                      )}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Deck & Sticky Bottom Controls */}
      <div className="px-5 pt-2 sticky bottom-20 bg-background/90 backdrop-blur-xl border-t border-white/5">
        {/* Quick Actions Row */}
        <div className="mb-2 grid grid-cols-2 gap-2">
          {RON_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                if (action.actionKey === "calendar_schedule") {
                  if (!googleToken) handleGoogleConnect();
                  else setCalendarModalOpen(true);
                } else if (action.actionKey === "calendar_sync") {
                  if (!googleToken) handleGoogleConnect();
                  else {
                    handleSend("Sincronize minha semana de treinos com o Google Agenda");
                  }
                } else if (action.route) {
                  navigate(action.route);
                }
              }}
              className="rounded-xl border border-primary/25 bg-primary/[0.07] px-3 py-2 text-[11px] font-semibold text-primary hover:bg-primary/[0.14] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Suggestion Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setInput(s);
                handleSend(s);
              }}
              className="shrink-0 text-[11px] tracking-wide px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 text-primary/80" />
              {s}
            </button>
          ))}
        </div>

        {/* Input Bar with Voice Recognition */}
        <div className="flex items-center gap-2 rounded-full p-1.5 border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-xl">
          <button
            type="button"
            onClick={toggleVoiceListen}
            title={isListening ? "Parar gravação" : "Falar com o RON (Microfone)"}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
              isListening
                ? "bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                : "bg-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isListening ? "Ouvindo sua voz..." : "Converse com o RON ou peça para agendar..."}
            className="flex-1 bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none px-2"
          />

          <button
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0 shadow-md shadow-primary/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-1 px-3 text-[10px] text-muted-foreground">
          <span>Powered by Gemini 3.8 Flash Neural Engine</span>
          <span className="flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-primary" /> Fichas: {remaining}
          </span>
        </div>
      </div>

      {/* Google Calendar Scheduling Modal */}
      <RonCalendarModal
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        accessToken={googleToken}
        onOpenGoogleAuth={handleGoogleConnect}
        onEventCreated={(summary) => {
          const msg = `Agendado no seu Google Agenda: ${summary}. Deseja que eu programe lembretes complementares de aquecimento?`;
          setMessages((p) => [...p, { role: "assistant", content: msg }]);
          speakText(msg);
        }}
      />

      <BottomNavigation />
    </div>
  );
}
