import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { Play, Film, ExternalLink, Loader2, Maximize2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface CatalogItem {
  id: string;
  title: string;
  category?: string | null;
  level?: string | null;
  duration?: string | null;
  thumbnail?: string | null;
  video_url?: string | null;
}

export default function NineFitHealthFlix() {
  const { athleteId, athleteName } = useAthleteId();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [openingEmbed, setOpeningEmbed] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("healthflix-proxy?action=content", { method: "GET" as any });
        if (error) throw error;
        const list = (data as any)?.items || [];
        setItems(list);
      } catch (e: any) {
        toast.error("Não foi possível carregar o catálogo HealthFlix");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.category && set.add(String(i.category)));
    return Array.from(set);
  }, [items]);

  async function openFullHealthFlix(view: "library" | "home" = "library") {
    if (!athleteId) { toast.error("Aguarde carregar seu perfil"); return; }
    setOpeningEmbed(true);
    try {
      const { data, error } = await supabase.functions.invoke("healthflix-proxy?action=context", {
        body: {
          fitpro_student_id: athleteId,
          role: "student",
          view,
          name: athleteName,
        },
      });
      if (error) throw error;
      const url = (data as any)?.embed_url;
      if (!url) throw new Error("embed_url ausente");
      setEmbedUrl(url);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao abrir HealthFlix");
    } finally {
      setOpeningEmbed(false);
    }
  }

  if (embedUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <p className="text-[10px] font-data tracking-[0.4em] text-primary">HEALTHFLIX</p>
          <button onClick={() => setEmbedUrl(null)} className="text-xs text-muted-foreground hover:text-foreground">Fechar</button>
        </div>
        <iframe
          src={embedUrl}
          className="flex-1 w-full bg-black"
          sandbox="allow-scripts allow-forms allow-popups allow-same-origin allow-presentation"
          allow="autoplay; fullscreen; encrypted-media"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // HEALTHFLIX</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">STREAMING ELITE</h1>
        <p className="text-xs text-muted-foreground mt-1">Catálogo conectado em tempo real via API.</p>
      </div>

      <div className="px-4 mb-3">
        <button
          onClick={() => openFullHealthFlix("library")}
          disabled={openingEmbed}
          className="w-full rounded-2xl border border-primary/40 bg-primary/[0.08] py-3 flex items-center justify-center gap-2 font-bold text-primary disabled:opacity-50"
        >
          {openingEmbed ? <Loader2 className="w-4 h-4 animate-spin" /> : <Maximize2 className="w-4 h-4" />}
          ABRIR HEALTHFLIX COMPLETO
        </button>
      </div>

      {categories.length > 0 && (
        <div className="px-4 mb-2 flex gap-2 overflow-x-auto text-[10px] uppercase tracking-widest text-muted-foreground">
          {categories.map((c) => (
            <span key={c} className="px-2 py-1 rounded-full border border-white/10 whitespace-nowrap">{c}</span>
          ))}
        </div>
      )}

      <div className="px-4 grid grid-cols-2 gap-3">
        {loading && (
          <div className="col-span-2 flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="col-span-2 glass-mission rounded-xl p-6 flex flex-col items-center text-center">
            <Film className="w-6 h-6 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Catálogo HealthFlix indisponível no momento.</p>
          </div>
        )}
        {items.map((v, i) => (
          <motion.button
            key={v.id}
            onClick={() => openFullHealthFlix("library")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.4) }}
            className="glass-mission rounded-xl overflow-hidden text-left group"
          >
            <div className="aspect-video bg-white/[0.03] flex items-center justify-center relative">
              {v.thumbnail ? (
                <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <Film className="w-6 h-6 text-muted-foreground" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-8 h-8 text-primary" />
              </div>
              {v.duration && (
                <span className="absolute bottom-1 right-1 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded">{v.duration}</span>
              )}
            </div>
            <div className="px-2 py-2">
              <p className="text-xs text-foreground line-clamp-2">{v.title}</p>
              {v.category && <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-widest">{v.category}</p>}
            </div>
          </motion.button>
        ))}
      </div>

      <BottomNavigation />
    </div>
  );
}
