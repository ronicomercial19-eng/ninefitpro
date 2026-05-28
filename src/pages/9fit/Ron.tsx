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
    <div className="min-h-screen gradient-mission pb-28 flex flex-col">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // O RON</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">NEURAL ASSISTANT</h1>
      </div>

      <div className="px-4 mb-4">
        <div className="relative h-40 glass-mission rounded-xl overflow-hidden flex items-center justify-center">
          <motion.div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/70 to-primary/20 blur-md"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <Sparkles className="absolute bottom-2 right-3 w-3.5 h-3.5 text-primary/60" />
        </div>
      </div>

      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={m.id ?? i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto glass-mission text-foreground"
            }`}
          >
            {m.content}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="px-4 pt-3 pb-2 sticky bottom-20">
        <div className="flex items-center gap-2 glass-mission rounded-full p-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Fale com o RON..."
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
