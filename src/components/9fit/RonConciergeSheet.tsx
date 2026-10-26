import { AppSupport } from './AppSupport';
import { getAccessToken, googleSignIn, initGoogleAuth } from "@/services/googleAuth";
import { requestRonChat } from "@/services/ronChat";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Calendar,
  ArrowRight,
  Maximize2,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteScores } from "@/hooks/useAthleteScores";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useCredits } from "@/hooks/useCredits";
import { useUserState } from "@/hooks/useUserState";
import { useSendZap, useZapMessages, useZapThread } from "@/hooks/use-ninezap-chat";
import { detectPain } from "@/services/pain/detectPain";
import { STATE_LABEL, STATE_COLOR, STATE_INSIGHT } from "@/services/adaptiveState";
import { executeRonAction, RonAction } from "@/services/ronOperationalCore";
import { toast } from "sonner";
import { RonCalendarModal } from "./RonCalendarModal";
import ReactMarkdown from "react-markdown";
import { normalizeRonMarkdown } from "@/lib/ronMarkdown";

/**
 * CHAT ÚNICO DO ALUNO.
 *  - Aba "RON IA": assistente (Gemini) com áudio (voz + TTS), histórico persistido em ai_chat_messages,
 *    fichas, detecção de dor e ações operacionais.
 *  - Aba "Equipe": atendimento humano / suporte (9ZAP).
 * A rota /9fit/ron abre este mesmo chat em tela cheia (antes era um 2º chat separado).
 */

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: RonAction[];
  timestamp: string;
};

const fmtTime = (iso?: string) =>
  new Date(iso || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const WELCOME: ChatMsg = {
  id: "welcome",
  role: "assistant",
  content:
    "Olá! Sou o **RON**, seu Concierge e Centro de Inteligência 360 no 9FIT PRO. Posso analisar seus treinos, nutrição, recuperação e agenda. O que posso fazer por você agora?",
  timestamp: fmtTime(),
};

export function RonConciergeSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"ron" | "team">("ron");
  const [input, setInput] = useState("");
  const [teamInput, setTeamInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(getAccessToken());
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);

  const { user, profile } = useAuth();
  const { athleteId } = useAthleteId();
  const { remaining, withCredit } = useCredits(athleteId);
  const { data: scoreSnapshot } = useAthleteScores(athleteId);
  const syncScore = scoreSnapshot?.sync.value;
  const { state } = useUserState();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const isRonRoute = location.pathname === "/9fit/ron";
  const visible = isOpen || isRonRoute;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sendRef = useRef<(t?: string) => void>(() => {});
  const introDoneRef = useRef(false);

  // Suporte humano (9ZAP) — só consulta quando a aba Equipe está visível
  const teamActive = visible && tab === "team";
  const zapThread = useZapThread(
    teamActive ? user?.id : undefined,
    `Atendimento — ${profile?.full_name || "Aluno"}`,
  );
  const zapMessages = useZapMessages(teamActive ? zapThread.data : undefined);
  const sendZap = useSendZap(zapThread.data, user?.id);
  const teamConnected = !!zapThread.data && !zapThread.isError && !zapMessages.isPending && !zapMessages.isError;

  // ---------- Histórico persistido ----------
  useEffect(() => {
    setMessages([WELCOME]);
    setHistoryLoaded(false);
    introDoneRef.current = false;
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("ai_chat_messages" as any)
        .select("id, role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (cancelled) return;
      if (error) console.warn("[RON] histórico indisponível", error);
      const hist = ((data as any[]) || [])
        .reverse()
        .filter((r) => r.role === "user" || r.role === "assistant")
        .map((r) => ({ id: String(r.id), role: r.role, content: r.content, timestamp: fmtTime(r.created_at) })) as ChatMsg[];
      if (hist.length > 0) setMessages(hist);
      setHistoryLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const persist = async (role: "user" | "assistant", content: string) => {
    if (!user?.id) return;
    const { error } = await supabase.from("ai_chat_messages" as any).insert({ user_id: user.id, role, content });
    if (error) console.warn("[RON] não foi possível salvar a mensagem", error);
  };

  // ---------- Entradas por URL (/9fit/ron?tab=equipe, ?auto=1&context=..., ?connect=google-calendar) ----------
  useEffect(() => {
    if (!isRonRoute) return;
    const t = params.get("tab");
    if (t === "equipe" || t === "suporte" || t === "team") setTab("team");
    if (params.get("connect") === "google-calendar") setCalendarModalOpen(true);
  }, [isRonRoute, params]);

  useEffect(() => {
    if (!isRonRoute || !historyLoaded || introDoneRef.current) return;
    if (params.get("auto") !== "1") return;
    introDoneRef.current = true;
    const ctx = params.get("context");
    const insight = STATE_INSIGHT[state]?.[0] || "";
    const topic = params.get("topic") || "";
    const intro =
      ctx === "protocol_complete"
        ? `Protocolo concluído. Modo ${STATE_LABEL[state]} detectado — ${insight} Deseja que eu agende a sessão de amanhã na sua Google Agenda?`
        : ctx === "hub_card"
        ? `Você está no modo ${STATE_LABEL[state]}. ${insight} Como posso impulsionar sua performance agora?`
        : ctx === "planning"
        ? topic
          ? `Você abriu o planejamento em "${topic.slice(0, 60)}". Quer que eu explique em detalhe ou ajuste o treino de amanhã?`
          : "Você abriu seu planejamento. Quer que eu explique alguma fase ou ajuste o treino de amanhã?"
        : "Estou aqui com o motor Gemini ativo. O que precisa agora?";
    setMessages((p) => [...p, { id: `intro_${Date.now()}`, role: "assistant", content: intro, timestamp: fmtTime() }]);
  }, [isRonRoute, historyLoaded, params, state]);

  // ---------- Eventos globais ----------
  useEffect(() => {
    const handleOpen = (e?: any) => {
      setIsOpen(true);
      const d = e?.detail;
      if (d?.tab === "team") setTab("team");
      else setTab("ron");
      if (d?.prompt) sendRef.current(d.prompt);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("9fit:open-ron-concierge", handleOpen);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("9fit:open-ron-concierge", handleOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Google Agenda
  useEffect(() => {
    const unsub = initGoogleAuth(
      (_u: any, token: string | null) => setGoogleToken(token),
      () => {},
    );
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  const handleGoogleConnect = async () => {
    try {
      const { user: gUser, accessToken } = await googleSignIn();
      setGoogleToken(accessToken);
      toast.success("Google Agenda conectada!", { description: `Autenticado como ${gUser.email}.` });
    } catch (err: any) {
      toast.error("Erro ao conectar Google Agenda", { description: err?.message || "Permissão não concedida." });
    }
  };

  // Reconhecimento de voz
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const text = event.results[0]?.[0]?.transcript;
      if (text) setTimeout(() => sendRef.current(text), 300);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, visible, tab, zapMessages.data]);

  const speak = (text: string) => {
    if (!ttsEnabled || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`[\]()]/g, " ").replace(/\s+/g, " ");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "pt-BR";
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("[TTS] Error:", e);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
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
        toast.info("Ouvindo... Fale com o RON");
      } catch {
        setIsListening(false);
      }
    }
  };

  const addAssistant = (content: string, actions?: RonAction[]) =>
    setMessages((prev) => [
      ...prev,
      { id: `ast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, role: "assistant", content, actions, timestamp: fmtTime() },
    ]);

  const handlePain = async (text: string) => {
    const pain = detectPain(text);
    if (!pain.detected || !athleteId) return null;
    const { error } = await supabase.from("pain_reports" as any).insert({
      athlete_id: athleteId,
      source: "ron_chat",
      body_region: pain.body_region,
      intensity: pain.intensity,
    } as any);
    if (error) {
      console.error("[RON] pain report failed", error);
      return "Percebi seu relato de dor, mas não consegui registrá-lo. Mantenha o treino pausado e procure acompanhamento.";
    }
    return "Registrei seu relato de dor. Mantenha a atividade pausada e abra Ajuste de Treino ou converse com seu profissional para revisar a prescrição.";
  };

  const handleSend = async (textToSend?: string) => {
    const message = (textToSend ?? input).trim();
    if (!message || isSending) return;
    setInput("");
    const history = messages.filter((m) => m.id !== "welcome").map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { id: `usr_${Date.now()}`, role: "user", content: message, timestamp: fmtTime() }]);
    setIsSending(true);
    void persist("user", message);

    try {
      const painReply = await handlePain(message);
      if (painReply) {
        addAssistant(painReply);
        void persist("assistant", painReply);
        speak(painReply);
        return;
      }

      const data = await withCredit("ron_chat", () => requestRonChat(message, history));
      if (!data) {
        addAssistant("Você precisa de fichas para enviar uma pergunta ao RON.");
        return;
      }

      let botReply = data.content || "Entendido! Processando diretrizes.";
      const actions: RonAction[] = [...(data.actions || [])];
      const asksToReduceVolume =
        /\b(reduz|reduza|diminu|diminua|menos séries|menos series|corta uma série|corte uma série)\b/i.test(message) &&
        /\b(treino|série|series|volume|prescrição)\b/i.test(message);
      if (asksToReduceVolume && athleteId && !actions.some((a) => a.type === "ADJUST_TRAINING_VOLUME")) {
        actions.push({
          type: "ADJUST_TRAINING_VOLUME",
          title: "Aplicar ajuste ao treino de hoje",
          description: "Reduzir uma série por exercício aplicável. O RON preserva sessões iniciadas ou concluídas.",
          payload: { athleteId },
        });
        botReply += "\n\nPreparei a redução de uma série por exercício aplicável no treino de hoje. Toque em **Aplicar ajuste ao treino de hoje** para confirmar; sessões em andamento ou concluídas ficam protegidas.";
      }

      addAssistant(botReply, actions);
      void persist("assistant", botReply);
      speak(botReply);

      // Mutations are proposals; execution only happens after a user click.

    } catch (err: any) {
      console.warn("[RON] erro", err);
      addAssistant(err?.message || "RON indisponível. Tente novamente em instantes.");
    } finally {
      setIsSending(false);
    }
  };
  // sempre a versão mais recente (voz e eventos globais não usam closure velha)
  sendRef.current = (t?: string) => { void handleSend(t); };

  const executingAction = useRef(false);
  const completedActions = useRef(new Set<string>());
  useEffect(()=>{completedActions.current.clear();},[user?.id]);
  const handleActionClick = async (action: RonAction) => {
    action.id ||= crypto.randomUUID();
    if(executingAction.current || completedActions.current.has(action.id)) return;
    executingAction.current=true;
    try {
    const res = await executeRonAction(action, {
      navigate,
      onCalendarOpen: () => setCalendarModalOpen(true),
    });
    if(res.success && action.id) completedActions.current.add(action.id);
    if (res?.success && action.type === "NAVIGATE") closeChat();
    } finally { executingAction.current=false; }
  };

  const closeChat = () => {
    setIsOpen(false);
    if (isRonRoute) {
      if (window.history.length > 1) navigate(-1);
      else navigate("/9fit/hub");
    }
  };

  const sendTeam = async () => {
    const text = teamInput.trim();
    if (!text || sendZap.isPending || !teamConnected) return;
    try {
      await sendZap.mutateAsync(text);
      setTeamInput("");
    } catch (e) {
      console.warn("[Equipe] envio falhou", e);
      toast.error("Não foi possível enviar a mensagem. Tente novamente.");
    }
  };

  const getContextualPrompts = () => {
    const path = location.pathname;
    if (path.includes("/train")) {
      return [
        { label: "Substituir exercício por dor", prompt: "Estou sentindo desconforto no ombro durante o supino, qual exercício substituo?" },
        { label: "Iniciar treino agora", prompt: "Inicie meu treino de hoje com acompanhamento de cadência" },
        { label: "Agendar treino no Google Calendar", prompt: "Agende meu treino de pernas amanhã às 18h no Google Calendar" },
      ];
    }
    if (path.includes("/move")) {
      return [
        { label: "Cadência & Ritmo Ideal", prompt: "Qual o ritmo e cadência recomendados para minha corrida hoje?" },
        { label: "Descompressão Pós-Corrida", prompt: "Quais alongamentos e hidratação devo fazer após correr?" },
      ];
    }
    if (path.includes("/diet")) {
      return [
        { label: "+500ml de Água", prompt: "Registre 500ml de água que acabei de tomar" },
        { label: "Registrar Refeição", prompt: "Comi 200g de frango grelhado e 150g de arroz no almoço, registre no meu diário" },
        { label: "Janela pré-treino", prompt: "Qual o melhor timing e alimentos para comer antes do treino de hoje?" },
      ];
    }
    if (path.includes("/recovery")) {
      return [
        { label: "Analisar HRV e Prontidão", prompt: "Analise minha prontidão de hoje e veja se devo pegar pesado ou recuperar" },
        { label: "Qualidade do Sono", prompt: "Dormi apenas 5 horas hoje, como isso impacta meu treino e o que fazer?" },
      ];
    }
    return [
      { label: "Sincronizar Semana no Calendar", prompt: "Sincronize todos os treinos da minha semana na minha Google Agenda" },
      { label: "Registrar +500ml Água", prompt: "Registre 500ml de água consumida" },
      { label: "Como está meu score?", prompt: "Como está minha prontidão e score geral no 9FIT hoje?" },
      { label: "Navegar para Treinos", prompt: "Me leve para a tela de treinos" },
    ];
  };

  const zapList = zapMessages.data || [];
  const isMine = (t: string) => t === "student" || t === "user";

  return (
    <>
      <AnimatePresence>
        {visible && (
          <div
            className={`fixed inset-0 z-50 flex items-end justify-end bg-black/60 backdrop-blur-sm ${
              isRonRoute ? "p-0" : "sm:items-center sm:justify-center sm:p-4"
            }`}
          >
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className={`relative w-full bg-[#0c0d12] border border-white/10 shadow-2xl flex flex-col overflow-hidden ${
                isRonRoute
                  ? "h-full rounded-none"
                  : "sm:max-w-2xl h-[85vh] sm:h-[750px] sm:rounded-2xl rounded-t-2xl"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tracking-wider uppercase text-white">RON CONCIERGE</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                        GEMINI
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Chat único · IA + Equipe
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                    title={ttsEnabled ? "Silenciar Áudio" : "Ativar Áudio"}
                  >
                    {ttsEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  {!isRonRoute && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate(tab === "team" ? "/9fit/ron?tab=equipe" : "/9fit/ron");
                      }}
                      className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                      title="Expandir para tela cheia"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={closeChat}
                    className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Abas */}
              <div className="px-4 pt-2">
                <div className="flex gap-1 rounded-full p-1 bg-white/[0.04] border border-white/10">
                  {([
                    { k: "ron", l: "RON IA", Icon: Sparkles },
                    { k: "team", l: "Equipe", Icon: Users },
                  ] as const).map(({ k, l, Icon }) => (
                    <button
                      key={k}
                      onClick={() => setTab(k)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                        tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-3 h-3" /> {l}
                    </button>
                  ))}
                </div>
              </div>

              {tab === "ron" ? (
                <>
                  {/* Status */}
                  <div className="px-4 py-2 mt-2 bg-white/[0.02] border-y border-white/5 flex items-center justify-between text-[11px] overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">Estado:</span>
                      <span
                        className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded"
                        style={{ color: STATE_COLOR[state], background: STATE_COLOR[state] + "20" }}
                      >
                        {STATE_LABEL[state]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                      <span>Prontidão: <b className="text-white">{syncScore == null ? "Sem leitura" : `${syncScore}%`}</b></span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" />{remaining}</span>
                      <span>·</span>
                      <button
                        onClick={() => (googleToken ? setCalendarModalOpen(true) : void handleGoogleConnect())}
                        className="text-primary hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Calendar className="w-3 h-3" /> {googleToken ? "Google Agenda" : "Conectar Agenda"}
                      </button>
                    </div>
                  </div>

                  {/* Mensagens */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground font-medium rounded-br-xs"
                              : "bg-white/5 border border-white/10 text-neutral-200 rounded-bl-xs shadow-md"
                          }`}
                        >
                          {msg.role === "user" ? <p className="whitespace-pre-wrap">{msg.content}</p> : (
                            <div className="break-words space-y-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-primary [&_a]:underline [&_pre]:overflow-x-auto">
                              <ReactMarkdown skipHtml components={{ a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}>{normalizeRonMarkdown(msg.content)}</ReactMarkdown>
                            </div>
                          )}
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2">
                              <p className="text-[10px] uppercase font-bold tracking-wider text-primary">Ações propostas:</p>
                              <div className="grid grid-cols-1 gap-2">
                                {msg.actions.map((action, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => void handleActionClick(action)}
                                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all text-left group"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <p className="text-[11px] font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                                        <Sparkles className="w-3 h-3 text-primary shrink-0" />
                                        {action.title}
                                      </p>
                                      {action.description && (
                                        <p className="text-[10px] text-muted-foreground truncate">{action.description}</p>
                                      )}
                                    </div>
                                    <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-muted-foreground/60 mt-1 px-1">{msg.timestamp}</span>
                      </div>
                    ))}
                    {isSending && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/5 border border-white/10 rounded-2xl p-3 max-w-[200px]">
                        <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
                        <span>RON raciocinando...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Atalhos */}
                  <div className="px-3 py-2 border-t border-white/5 bg-black/20 overflow-x-auto no-scrollbar flex items-center gap-1.5">
                    {getContextualPrompts().map((p, i) => (
                      <button
                        key={i}
                        onClick={() => void handleSend(p.prompt)}
                        className="shrink-0 text-[10px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-primary" />
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Entrada (texto + voz) */}
                  <div className="p-3 border-t border-white/10 bg-[#090a0f]">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleSend();
                      }}
                      className="flex items-center gap-2"
                    >
                      <button
                        type="button"
                        onClick={toggleMic}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isListening
                            ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10"
                        }`}
                        title={isListening ? "Parar de Ouvir" : "Falar com RON"}
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Peça para executar, agendar, criar ou analisar..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-muted-foreground focus:outline-hidden focus:border-primary/60 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || isSending}
                        className="p-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 disabled:opacity-40 transition-all"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  {/* Equipe / Suporte humano (9ZAP) */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 mt-2">
                    <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                      Fale com a equipe 9FIT · respondemos assim que possível
                    </p>
                    {zapThread.isPending && <p className="text-[11px] text-muted-foreground text-center">Conectando ao atendimento...</p>}
                    {(zapThread.isError || zapMessages.isError || sendZap.isError) && (
                      <div role="alert" className="space-y-3 text-center"><button
                        onClick={() => { void zapThread.refetch(); if (zapThread.data) void zapMessages.refetch(); }}
                        className="block mx-auto text-[11px] text-muted-foreground underline underline-offset-2"
                      >
                        Não foi possível conectar ao atendimento. Tentar novamente
                      </button><details className="text-left"><summary className="cursor-pointer text-primary underline text-sm">Abrir chamado de suporte</summary><AppSupport initialMessage={teamInput} /></details></div>
                    )}
                    {teamConnected && zapList.length === 0 && (
                      <p className="text-[11px] text-muted-foreground text-center">Nenhuma mensagem ainda. Escreva abaixo para falar com a equipe.</p>
                    )}
                    {zapList.map((m) => (
                      <div key={m.id} className={`flex flex-col ${isMine(m.sender_type) ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isMine(m.sender_type)
                              ? "bg-primary text-primary-foreground font-medium rounded-br-xs"
                              : "bg-white/5 border border-white/10 text-neutral-200 rounded-bl-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                        </div>
                        <span className="text-[9px] text-muted-foreground/60 mt-1 px-1">{fmtTime(m.created_at)}</span>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="p-3 border-t border-white/10 bg-[#090a0f]">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void sendTeam();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={teamInput}
                        onChange={(e) => setTeamInput(e.target.value)}
                        placeholder="Escreva para a equipe..."
                        disabled={!teamConnected}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-muted-foreground focus:outline-hidden focus:border-primary/60 transition-colors disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={!teamInput.trim() || sendZap.isPending || !teamConnected}
                        className="p-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:brightness-110 disabled:opacity-40 transition-all"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <RonCalendarModal
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        accessToken={googleToken}
        onOpenGoogleAuth={() => void handleGoogleConnect()}
        onEventCreated={(summary: string) => {
          const msg = `Agendado no seu Google Agenda: ${summary}.`;
          addAssistant(msg);
          speak(msg);
        }}
      />
    </>
  );
}
