import { useEffect, useState } from "react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { BookOpen, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface LibItem {
  id?: string;
  title?: string;
  name?: string;
  category?: string;
  type?: string;
  thumbnail?: string | null;
  cover?: string | null;
  url?: string | null;
  detail_url?: string | null;
}

export default function NineFitBiblioteca() {
  const { athleteId } = useAthleteId();
  const [items, setItems] = useState<LibItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          `library-full-proxy?student_external_id=${athleteId}`,
          { method: "GET" as any },
        );
        if (error) throw error;
        const list = (data as any)?.items ?? (data as any)?.data ?? [];
        setItems(Array.isArray(list) ? list : []);
      } catch (e: any) {
        toast.error("Biblioteca indisponível agora");
      } finally {
        setLoading(false);
      }
    })();
  }, [athleteId]);

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // BIBLIOTECA</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">CATÁLOGO COMPLETO</h1>
        <p className="text-xs text-muted-foreground mt-1">Conteúdos liberados para você pelo seu professor.</p>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {loading && (
          <div className="col-span-2 flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="col-span-2 glass-mission rounded-xl p-6 flex flex-col items-center text-center">
            <BookOpen className="w-6 h-6 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Sem conteúdos atribuídos ainda.</p>
          </div>
        )}
        {items.map((it, i) => {
          const title = it.title || it.name || "Sem título";
          const thumb = it.thumbnail || it.cover || null;
          const url = it.url || it.detail_url || null;
          return (
            <motion.a
              key={(it.id || title) + i}
              href={url || "#"}
              target={url ? "_blank" : undefined}
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}
              className="glass-mission rounded-xl overflow-hidden block"
            >
              <div className="aspect-video bg-white/[0.03] flex items-center justify-center">
                {thumb ? (
                  <img src={thumb} alt={title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <BookOpen className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="px-2 py-2">
                <p className="text-xs text-foreground line-clamp-2">{title}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-widest flex items-center gap-1">
                  {it.category || it.type || "conteúdo"} {url && <ExternalLink className="w-2.5 h-2.5" />}
                </p>
              </div>
            </motion.a>
          );
        })}
      </div>

      <BottomNavigation />
    </div>
  );
}
