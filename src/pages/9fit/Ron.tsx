import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { RonWaveform } from "@/components/9fit/RonWaveform";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { Send } from "lucide-react";

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
}

export default function NineFitRon() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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
    })();
  }, [user?.id]);

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

  const send = async () => {
    if (!input.trim() || sending || !user?.id) return;
    const userMsg = input.trim();
    setInput("");
    setSending(true);

    // optimistic
    setMessages((p) => [...p, { role: "user", content: userMsg }, { role: "assistant", content: "..." }]);
    await persist("user", userMsg);

    try {
      // contexto: últimas 20 mensagens
      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const { data } = await supabase.functions.invoke("ai-coach", {
        body: { mode: "chat", message: userMsg, userId: user.id, history },
      });
      const content =
        (data as any)?.data?.content ||
        (data as any)?.content ||
        "Sinal instável. Tente novamente.";
      setMessages((p) => {
        const out = [...p];
        out[out.length - 1] = { role: "assistant", content };
        return out;
      });
      await persist("assistant", content);
    } catch {
      setMessages((p) => {
        const out = [...p];
        out[out.length - 1] = { role: "assistant", content: "Falha temporária no núcleo neural." };
        return out;
      });
    } finally {
      setSending(false);
    }
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
          <div
            key={m.id ?? i}
            className={`max-w-[78%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto bg-white/[0.04] border-l-2 border-primary/50 text-foreground"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="px-5 pt-2 sticky bottom-20 bg-background/80 backdrop-blur-md">
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
