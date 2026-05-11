import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string; }

export default function NineFitRon() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Eu sou o RON. Memória persistente ativa. O que vamos otimizar agora?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // load memory
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("ron_memory" as any).select("value").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => {
        const mem = (data as any[]) || [];
        if (mem.length) {
          setMessages((p) => [
            { role: "assistant", content: `Memória carregada: ${mem.length} registros. Bem-vindo de volta.` },
            ...p,
          ]);
        }
      });
  }, [user?.id]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((p) => [...p, { role: "user", content: userMsg }, { role: "assistant", content: "..." }]);
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: { mode: "chat", message: userMsg, userId: user?.id },
      });
      const content = (data as any)?.data?.content || (data as any)?.content || "Sinal instável. Tente novamente.";
      setMessages((p) => {
        const out = [...p];
        out[out.length - 1] = { role: "assistant", content };
        return out;
      });
      if (user?.id) {
        await supabase.from("ron_memory" as any).insert({
          user_id: user.id,
          key: "chat_exchange",
          value: { q: userMsg, a: content },
          confidence: 0.6,
        });
      }
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

      {/* Orb */}
      <div className="px-4 mb-4">
        <div className="relative h-40 glass-mission rounded-xl overflow-hidden flex items-center justify-center">
          <motion.div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/70 to-primary/20 blur-md"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary"
              animate={{
                x: [Math.cos((i * 120) * Math.PI / 180) * 60, Math.cos(((i * 120) + 360) * Math.PI / 180) * 60],
                y: [Math.sin((i * 120) * Math.PI / 180) * 60, Math.sin(((i * 120) + 360) * Math.PI / 180) * 60],
              }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: "linear" }}
            />
          ))}
          <Sparkles className="absolute bottom-2 right-3 w-3.5 h-3.5 text-primary/60" />
        </div>
      </div>

      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
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
