import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { Play, Film, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface CatalogItem {
  id: string;
  external_id?: string | null;
  slug?: string | null;
  title: string;
  category?: string | null;
  level?: string | null;
  duration?: string | null;
  thumbnail?: string | null;
  video_url?: string | null;
}

function normalizePlayerUrl(item: CatalogItem) {
  if (!item.video_url) return null;
  try {
    const url = new URL(item.video_url);
    const looksGeneric = /\/programs\/?$/.test(url.pathname) || /healthflix/i.test(url.hostname);
    if (looksGeneric) {
      url.searchParams.set("content_id", item.external_id || item.id);
      if (item.slug) url.searchParams.set("slug", item.slug);
    }
    return url.toString();
  } catch {
    return item.video_url;
  }
}

export default function NineFitHealthFlix() {
  const { athleteId } = useAthleteId();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
    setLoadError(false);
      try {
        const { data, error } = await supabase.functions.invoke("healthflix-proxy?action=content", { method: "GET" as any });
        const list = (!error && (data as any)?.items) ? (data as any).items : [];
        if (list.length > 0) {
          setItems(list.map((item: any) => ({
            id: String(item.id || item.external_id || item.slug),
            external_id: item.external_id || item.externalId || null,
            slug: item.slug || null,
            title: item.title || item.name || "Conteúdo HealthFlix",
            category: item.category || null,
            level: item.level || null,
            duration: item.duration || item.duration_label || null,
            thumbnail: item.thumbnail || item.thumbnail_url || item.thumbnailUrl || null,
            video_url: item.video_url || item.player_url || item.playerUrl || item.url || null,
          })));
        } else {
          // Fallback: lê direto de library_items (aceita 'videos' e 'video')
          const { data: rows } = await supabase
            .from("library_items" as any)
            .select("id, external_id, slug, name, category, thumbnail_url, player_url, payload, type")
            .in("type", ["videos", "video", "streaming", "aula"])
            .order("synced_at", { ascending: false })
            .limit(120);
          setItems(((rows as any[]) || []).map((r) => ({
            id: r.id,
            external_id: r.external_id,
            slug: r.slug,
            title: r.name,
            category: r.category,
            thumbnail: r.thumbnail_url,
            video_url: r.payload?.video_url || r.payload?.playerUrl || r.payload?.url || r.player_url,
          })));
        }
      } catch {
        setLoadError(true);
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

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // HEALTHFLIX</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">STREAMING ELITE</h1>
        <p className="text-xs text-muted-foreground mt-1">Catálogo conectado em tempo real via API.</p>
      </div>

      <div className="px-4 mb-3">
        <p className="w-full rounded-2xl border border-primary/40 bg-primary/[0.08] py-3 text-center text-xs font-bold text-primary">CATÁLOGO HEALTHFLIX VIA API</p>
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
        {!loading && loadError && (
          <div className="col-span-2 glass-mission rounded-xl p-6 flex flex-col items-center text-center">
            <Film className="w-6 h-6 text-destructive mb-2" />
            <p className="text-xs text-muted-foreground">Não foi possível carregar o catálogo.</p>
            <button onClick={() => window.location.reload()} className="mt-3 text-xs text-primary underline">Tentar novamente</button>
          </div>
        )}
        {!loading && !loadError && items.length === 0 && (
          <div className="col-span-2 glass-mission rounded-xl p-6 flex flex-col items-center text-center">
            <Film className="w-6 h-6 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Catálogo HealthFlix indisponível no momento.</p>
          </div>
        )}
        {items.map((v, i) => (
          <motion.button
            key={v.id}
onClick={() => normalizePlayerUrl(v) ? setSelected(v) : toast.info("Este conteúdo ainda não possui player configurado.")}
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

      {selected && normalizePlayerUrl(selected) && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`Reproduzir ${selected.title}`}>
          <div className="w-full max-w-3xl rounded-2xl bg-card border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-sm font-semibold truncate">{selected.title}</p>
              <button type="button" aria-label="Fechar player" onClick={() => setSelected(null)} className="text-xs text-primary">Fechar</button>
            </div>
            <div className="aspect-video bg-black">
              <iframe title={selected.title} src={normalizePlayerUrl(selected) as string} className="w-full h-full" allowFullScreen />
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}
