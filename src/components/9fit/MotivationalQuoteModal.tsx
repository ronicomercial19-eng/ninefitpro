import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function MotivationalQuoteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [quote, setQuote] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      generateQuote();
    }
  }, [open]);

  const generateQuote = async () => {
    setLoading(true);
    try {
      // Usar a mesma API de chat do Ron ou um endpoint específico
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Gere uma frase motivacional curta e poderosa, com tom da NINE FIT PRO, para um atleta focado em alta performance. A frase deve estar pronta para ser compartilhada em stories.",
          context: { currentPage: "OSDashboard" }
        }),
      });
      const data = await response.json();
      setQuote(data.content || "A consistência supera a intensidade. Mantenha o foco, Atleta.");
    } catch (e) {
      setQuote("A consistência supera a intensidade. Mantenha o foco, Atleta.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "NINE FIT PRO",
          text: quote,
        });
      } catch (e) {
        console.error("Erro ao compartilhar", e);
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl border border-primary/30 bg-gradient-to-b from-[#1a1c22] to-[#0d0e11] p-6 shadow-2xl text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <Sparkles className="w-12 h-12 text-primary mx-auto mb-6" />
            {loading ? (
              <p className="text-neutral-400">Gerando inspiração...</p>
            ) : (
              <p className="font-display text-2xl text-white mb-8 leading-tight">"{quote}"</p>
            )}
            <button
              onClick={handleShare}
              className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" /> Compartilhar NINE
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
