import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Dumbbell,
  Apple,
  HeartPulse,
  TrendingUp,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Maximize2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteScores } from "@/hooks/useAthleteScores";
import { useUserState } from "@/hooks/useUserState";
import { STATE_LABEL, STATE_COLOR } from "@/services/adaptiveState";
import {
  executeRonAction,
  RonAction,
  APP_KNOWLEDGE_GRAPH,
  getRonOperationalData
} from "@/services/ronOperationalCore";
import { toast } from "sonner";
import { RonCalendarModal } from "./RonCalendarModal";

export function RonConciergeSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarInitialData, setCalendarInitialData] = useState<any>(null);

  const { profile } = useAuth();
  const { syncScore } = useAthleteScores();
  const { state } = useUserState();
  const location = useLocation();
  const navigate = useNavigate();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    actions?: RonAction[];
    timestamp: string;
  }>>([
    {
      id: "welcome",
      role: "assistant",
      content: `Olá! Sou o **RON**, seu Concierge e Centro de Inteligência 360 no 9FIT PRO. Estou monitorando seus treinos, nutrição, recuperação e agenda em tempo real. O que posso executar, analisar ou sincronizar para você agora?`,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  // Listen to global open event
  useEffect(() => {
    const handleOpen = (e?: any) => {
      setIsOpen(true);
      if (e?.detail?.prompt) {
        handleSend(e.detail.prompt);
      }
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

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.lang = "pt-BR";
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const text = event.results[0]?.[0]?.transcript;
        if (text) {
          setInput(text);
          setTimeout(() => handleSend(text), 300);
        }
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

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
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    const message = (textToSend || input).trim();
    if (!message || isSending) return;

    setInput("");
    const userMsgId = `usr_${Date.now()}`;
    const userMessage = {
      id: userMsgId,
      role: "user" as const,
      content: message,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const athleteName = profile?.nome || profile?.email?.split("@")[0] || "Atleta";
      const operationalData = getRonOperationalData();

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          context: {
            athleteName,
            state,
            stateLabel: STATE_LABEL[state] || "Equilibrado",
            syncScore: syncScore ?? 85,
            remainingCredits: 10,
            calendarConnected: Boolean(localStorage.getItem("9fit_google_auth_token")),
            currentPage: location.pathname,
            operationalData
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com status ${response.status}`);
      }

      const data = await response.json();
      const botReply = data.content || "Entendido! Processando diretrizes.";
      const actions: RonAction[] = data.actions || [];

      setMessages((prev) => [
        ...prev,
        {
          id: `ast_${Date.now()}`,
          role: "assistant",
          content: botReply,
          actions,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);

      speak(botReply);

      // Se houver ação marcada com autoExecute (ou solicitação explícita de navegação), executa
      for (const act of actions) {
        if (act.autoExecute) {
          executeRonAction(act, {
            navigate,
            onCalendarOpen: (data) => {
              setCalendarInitialData(data);
              setCalendarModalOpen(true);
            }
          });
        }
      }
    } catch (err: any) {
      console.warn("[Ron Concierge Error]:", err);
      const fallback =
        "Estou processando as diretrizes através do motor neural do Gemini 3.8. Verifique sua conexão e tente novamente.";
      setMessages((prev) => [
        ...prev,
        {
          id: `ast_fb_${Date.now()}`,
          role: "assistant",
          content: fallback,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleActionClick = async (action: RonAction) => {
    const res = await executeRonAction(action, {
      navigate,
      onCalendarOpen: (data) => {
        setCalendarInitialData(data);
        setCalendarModalOpen(true);
      }
    });
    if (res.success && action.type === "NAVIGATE") {
      setIsOpen(false);
    }
  };

  // Quick contextual prompts based on active page
  const getContextualPrompts = () => {
    const path = location.pathname;
    if (path.includes("/train")) {
      return [
        { label: "Substituir exercício por dor", prompt: "Estou sentindo desconforto no ombro durante o supino, qual exercício substituo?" },
        { label: "Iniciar treino agora", prompt: "Inicie meu treino de hoje com acompanhamento de cadência" },
        { label: "Agendar treino no Google Calendar", prompt: "Agende meu treino de pernas amanhã às 18h no Google Calendar" }
      ];
    }
    if (path.includes("/move")) {
      return [
        { label: "Google Maps em Tempo Real", prompt: "Como o Google Maps registra minha velocidade, rua e distância no MOVE?" },
        { label: "Cadência & Ritmo Ideal", prompt: "Qual o ritmo e cadência recomendados para minha corrida hoje?" },
        { label: "Descompressão Pós-Corrida", prompt: "Quais alongamentos e hidratação devo fazer após correr?" }
      ];
    }
    if (path.includes("/diet")) {
      return [
        { label: "+500ml de Água", prompt: "Registre 500ml de água que acabei de tomar" },
        { label: "Registrar Refeição", prompt: "Comi 200g de frango grelhado e 150g de arroz no almoço, registre no meu diário" },
        { label: "Janela pré-treino", prompt: "Qual o melhor timing e alimentos para comer antes do treino de hoje?" }
      ];
    }
    if (path.includes("/recovery")) {
      return [
        { label: "Analisar HRV e Prontidão", prompt: "Analise minha prontidão de hoje e veja se devo pegar pesado ou recuperar" },
        { label: "Ativar Recuperação Ativa", prompt: "Ative o protocolo de recuperação ativa para hoje" },
        { label: "Qualidade do Sono", prompt: "Dormi apenas 5 horas hoje, como isso impacta meu treino e o que fazer?" }
      ];
    }
    return [
      { label: "Sincronizar Semana no Calendar", prompt: "Sincronize todos os treinos da minha semana na minha Google Agenda" },
      { label: "Registrar +500ml Água", prompt: "Registre 500ml de água consumida" },
      { label: "Como está meu score?", prompt: "Como está minha prontidão e score geral no 9FIT hoje?" },
      { label: "Navegar para Treinos", prompt: "Me leve para a tela de treinos" }
    ];
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="relative w-full sm:max-w-2xl h-[85vh] sm:h-[750px] bg-[#0c0d12] border border-white/10 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Top Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold tracking-wider uppercase text-white">RON CONCIERGE</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                        GEMINI 3.8
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Centro Operacional 360 · {location.pathname}
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

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/9fit/ron");
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                    title="Expandir para tela cheia"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status Ribbon */}
              <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-[11px] overflow-x-auto no-scrollbar">
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
                  <span>Prontidão: <b className="text-white">{syncScore ?? 85}%</b></span>
                  <span>·</span>
                  <button
                    onClick={() => setCalendarModalOpen(true)}
                    className="text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Calendar className="w-3 h-3" /> Google Agenda
                  </button>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground font-medium rounded-br-xs"
                          : "bg-white/5 border border-white/10 text-neutral-200 rounded-bl-xs shadow-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Render Interactive Actions if Present */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-primary">
                            Ações Operacionais Propostas:
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            {msg.actions.map((action, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleActionClick(action)}
                                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all text-left group"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="text-[11px] font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-primary shrink-0" />
                                    {action.title}
                                  </p>
                                  {action.description && (
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {action.description}
                                    </p>
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

              {/* Quick Prompts */}
              <div className="px-3 py-2 border-t border-white/5 bg-black/20 overflow-x-auto no-scrollbar flex items-center gap-1.5">
                {getContextualPrompts().map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p.prompt)}
                    className="shrink-0 text-[10px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-primary" />
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <div className="p-3 border-t border-white/10 bg-[#090a0f]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Calendar Modal Controlled by Ron */}
      <RonCalendarModal
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        initialData={calendarInitialData}
      />
    </>
  );
}
