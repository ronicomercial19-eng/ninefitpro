import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { RonWaveform } from "@/components/9fit/RonWaveform";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useUserState } from "@/hooks/useUserState";
import { STATE_INSIGHT, STATE_LABEL } from "@/services/adaptiveState";
import { Send } from "lucide-react";
import { detectPain } from "@/services/pain/detectPain";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "sonner";

const RON_ACTIONS = [
  { label: "Criar treino", route: "/9fit/train?from=ron" },
  { label: "Criar planilha", route: "/9fit/planejamento?from=ron" },
  { label: "Abrir dieta", route: "/9fit/dieta?from=ron" },
  { label: "Ver progresso", route: "/9fit/progresso?from=ron" },
];

const SUGGESTIONS = [
  "Como está meu recovery?",
  "Próximo treino recomendado",
  "Análise da semana",
  "O que meu HRV indica?",
];

interface Msg {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  // FIX QA Master #5: permite anexar uma ação (CTA) à mensagem do assistente,
  // usada para o aviso de fichas insuficientes navegar direto para a recarga
  // em vez de mostrar um "Recarregue" genérico sem destino.
  action?: { label: string; route: string };
}

export default function NineFitRon() {
  const { user } = useAuth();
  const { athleteId } = useAthleteId();
  const { remaining, withCredit } = useCredits(athleteId);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state } = useUserState();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const autoCtx = params.get("context");
  const autoTriggered = params.get("auto") === "1";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load persisted history
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("ai_chat_messages" as any)
        .select("id, role, content, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(200);
      const hist = (data as any[]) || [];
      if (hist.length === 0) {
        setMessages([{ role: "assistant", content: "Eu sou o RON. Memória persistente ativa. O que vamos otimizar agora?" }]);
      } else {
        setMessages(hist);
      }

      // Auto-mensagem contextual quando vier de close-loop
      if (autoTriggered) {
        const insights = STATE_INSIGHT[state];
        const insight = insights[0];
        const intro =
          autoCtx === "protocol_complete"
            ? `Protocolo concluído. Modo ${STATE_LABEL[state]} detectado — ${insight} Quer que eu ajuste o plano de amanhã?`
            : autoCtx === "hub_card"
            ? `Você entrou em modo ${STATE_LABEL[state]}. ${insight} Por onde começamos?`
            : `Estou aqui. O que precisa agora?`;
        setMessages((p) => [...p, { role: "assistant", content: intro }]);
      }
    })();
  }, [user?.id, autoTriggered, autoCtx, state]);

  // Realtime: novas mensagens entram sozinhas
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
      return "Percebi seu relato de dor, mas não consegui registrá-lo. Não alterei seu treino. Evite continuar se houver risco e procure orientação profissional.";
    }
    if (!pain.body_region) return "Registrei seu relato de dor, mas preciso que você indique a região antes de sugerir qualquer ajuste.";

    const today = new Date().toISOString().slice(0, 10);
    const { data: adjustment, error: adjustmentError } = await supabase.rpc("ajustar_exercicio_por_dor" as any, {
      p_athlete_id: athleteId,
      p_exercise_id: null,
      p_body_region: pain.body_region,
      p_workout_date: today,
    });
    if (adjustmentError) {
      console.error("[Ron] pain adjustment failed", adjustmentError);
      return `Dor em ${pain.body_region} registrada. O ajuste não foi aplicado; mantenha o exercício pausado até nova orientação.`;
    }

    const result = adjustment as any;
    if (result?.status === "no_safe_variation") {
      const { data: regeneration, error: regenerationError } = await supabase.rpc("regenerar_dia_evitando_regiao" as any, {
        p_athlete_id: athleteId,
        p_body_region: pain.body_region,
        p_workout_date: today,
      });
      if (regenerationError || !(regeneration as any)?.success) {
        return `Dor em ${pain.body_region} registrada, mas não encontrei uma variação segura confirmada. O treino não foi alterado.`;
      }
      return `Dor em ${pain.body_region} registrada. O servidor confirmou a regeneração do treino evitando essa região.`;
    }

    if (result?.status === "applied" || result?.success === true) {
      return `Dor em ${pain.body_region} registrada. O servidor confirmou o ajuste do treino de hoje.`;
    }
    return `Dor em ${pain.body_region} registrada, mas nenhum ajuste foi confirmado. O treino permanece sem alteração.`;
  };

  const send = async () => {
    if (!input.trim() || sending || !user?.id) return;
    const userMsg = input.trim();
    setInput("");
    setSending(true);

    // optimistic
    setMessages((p) => [...p, { role: "user", content: userMsg }, { role: "assistant", content: "..." }]);
    await persist("user", userMsg);

    // Ajuste automático por dor (não gasta ficha — é motor operacional)
    const painReply = await handlePainSideEffect(userMsg);
    if (painReply) {
      setMessages((p) => {
        const out = [...p];
        out[out.length - 1] = { role: "assistant", content: painReply };
        return out;
      });
      await persist("assistant", painReply);
      setSending(false);
      return;
    }

    const result = await withCredit("ron_chat", async () => {
      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const [{ data: performance }, { data: safety }, { data: diet }] = await Promise.all([
        supabase.from("vw_fitpro_performance_overview" as any).select("*").eq("athlete_id", athleteId).maybeSingle(),
        supabase.from("vw_fitpro_safety_context" as any).select("*").eq("athlete_id", athleteId).maybeSingle(),
        supabase.from("vw_fitpro_diet_context" as any).select("*").eq("athlete_id", athleteId).maybeSingle(),
      ]);
      const { data } = await supabase.functions.invoke("ai-coach", {
        body: { mode: "chat", message: userMsg, userId: user.id, history, context: { performance, safety, diet } },
      });
      return (data as any)?.data?.content || (data as any)?.content || "Aguardando mais sinais do seu corpo.";
    });

    if (result === null) {
      // FIX QA Master #5: antes mostrava "Recarregue" sem dizer onde;
      // agora explica o saldo e a mensagem vira uma ação clicável para
      // a tela real de créditos (/9fit/aulas-creditos).
      setMessages((p) => {
        const out = [...p];
        out[out.length - 1] = {
          role: "assistant",
          content: "Suas fichas de conversa acabaram por enquanto. Toque abaixo para ver seu plano e recarregar — assim que renovar, retomamos de onde paramos.",
          action: { label: "Ver planos e recarregar", route: "/9fit/aulas-creditos" },
        };
        return out;
      });
      setSending(false);
      return;
    }

    setMessages((p) => {
      const out = [...p];
      out[out.length - 1] = { role: "assistant", content: result };
      return out;
    });
    await persist("assistant", result);
    setSending(false);
  };


  return (
    <div className="min-h-screen bg-background pb-28 flex flex-col">
      <div className="px-5 pt-8 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT · RON</p>
        <h1 className="text-display text-3xl text-foreground mt-1">Copiloto biológico</h1>
        <p className="text-xs text-muted-foreground mt-1">Observando. Aprendendo. Contextual.</p>
      </div>

      <div className="px-5 mb-4">
        <div className="relative h-32 rounded-2xl overflow-hidden flex items-center justify-center border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
          <div
            className="absolute inset-0 opacity-60"
            style={{ background: "var(--halo-primary)" }}
            aria-hidden
          />
          <RonWaveform active={sending} size={56} />
        </div>
      </div>

      <div className="flex-1 px-5 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={m.id ?? i} className="max-w-[78%]" style={{ marginLeft: m.role === "user" ? "auto" : undefined }}>
            <div
              className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/[0.04] border-l-2 border-primary/50 text-foreground"
              }`}
            >
              {m.content}
            </div>
            {m.action && (
              <button
                onClick={() => navigate(m.action!.route)}
                className="mt-2 w-full text-[12px] font-medium rounded-xl px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {m.action.label}
              </button>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="px-5 pt-2 sticky bottom-20 bg-background/80 backdrop-blur-md">
        <div className="grid grid-cols-2 gap-2 mb-2">
          {RON_ACTIONS.map((action) => (
            <button key={action.route} onClick={() => navigate(action.route)} className="rounded-xl border border-primary/25 bg-primary/[0.06] px-3 py-2 text-[11px] font-semibold text-primary hover:bg-primary/[0.12] transition-colors">
              {action.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="shrink-0 text-[11px] tracking-wide px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-full p-1.5 border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Pergunte ao RON..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none px-3"
          />
          <button
            onClick={send}
            disabled={sending}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
