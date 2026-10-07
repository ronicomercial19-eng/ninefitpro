import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { Play, Film, Loader2, X, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { TrackedLibraryVideo } from "@/components/9fit/TrackedLibraryVideo";

interface CatalogItem {
  id: string;
  title: string;
  category?: string | null;
  level?: string | null;
  duration?: string | null;
  thumbnail?: string | null;
  video_url?: string | null;
  external_id?: string | null;
  slug?: string | null;
  progress_percent?: number;
  last_position_seconds?: number;
  duration_seconds?: number;
}

function normalizePlayerUrl(item: CatalogItem) {
  if (!item.video_url) return null;
  try {
    const url = new URL(item.video_url);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(url.hostname)) {
      const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1];
      return id && /^[a-zA-Z0-9_-]+$/.test(id) ? "https://www.youtube.com/embed/" + id : null;
    }
    if (["vimeo.com", "www.vimeo.com"].includes(url.hostname) && /^\/\d+$/.test(url.pathname)) return "https://player.vimeo.com/video" + url.pathname;
    if (/healthflix/i.test(url.hostname + url.pathname) && !url.searchParams.has("content_id")) {
      url.searchParams.set("content_id", item.external_id || item.id);
      if (item.slug) url.searchParams.set("slug", item.slug);
    }
    return url.toString();
  } catch {
    return null;
  }
}

export default function NineFitHealthFlix() {
  const { athleteId } = useAthleteId();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [savedProgress, setSavedProgress] = useState<Record<string, Partial<CatalogItem>>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
    setLoadError(false);
      try {
        const { data, error } = await supabase.functions.invoke("healthflix-proxy?action=content", { method: "GET" as any });
        const list = (!error && (data as any)?.items) ? (data as any).items : [];
        if (list.length > 0) {
          setItems(list);
        } else {
          // Fallback: lê direto de library_items (aceita 'videos' e 'video')
          const { data: rows, error: libraryError } = await supabase
            .from("library_items" as any)
            .select("id, external_id, slug, name, category, thumbnail_url, player_url, type")
            .in("type", ["videos", "video", "streaming", "aula"])
            .order("synced_at", { ascending: false })
            .limit(120);
          if (libraryError) throw libraryError;
          setItems(((rows as any[]) || []).map((r) => ({
            id: String(r.id || r.external_id || r.slug), title: r.name, category: r.category,
            external_id: r.external_id || null, slug: r.slug || null,
            thumbnail: r.thumbnail_url, video_url: r.player_url,
          })));
        }
      } catch (error) {
        console.error("[HealthFlix] catálogo", error);
        setLoadError(true);
        toast.error("Não foi possível carregar o catálogo HealthFlix");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!athleteId) return;
    let active = true;
    void supabase.functions.invoke(`healthflix-proxy?action=progress&fitpro_student_id=${encodeURIComponent(athleteId)}`, { method: "GET" as any })
      .then(({ data, error }) => {
        if (error || !active) return;
        const progress = Object.fromEntries(((data as any)?.progress || []).map((row: any) => [String(row.content_id), row]));
        setSavedProgress(progress);
      });
    return () => { active = false; };
  }, [athleteId]);

  useEffect(() => {
    if (!Object.keys(savedProgress).length) return;
    const mergeProgress = (item: CatalogItem) => ({ ...item, ...(savedProgress[item.external_id || item.id] || {}) });
    setItems((current) => current.map(mergeProgress));
    setSelected((current) => current ? mergeProgress(current) : current);
  }, [savedProgress]);

  useEffect(() => {
    const requestedId = searchParams.get("content");
    if (!requestedId || !items.length) return;
    const item = items.find((entry) => entry.id === requestedId || entry.external_id === requestedId || entry.slug === requestedId);
    if (item && !selected) setSelected(item);
  }, [items, searchParams, selected]);

  const trackEvent = (item: CatalogItem, eventType: "content_started" | "content_progress_updated" | "content_completed", position = 0, duration = 0) => {
    if (!athleteId) return;
    const progressPercent = eventType === "content_completed" ? 100 : duration ? Math.min(99, Math.round((position / duration) * 100)) : 0;
    setItems((current) => current.map((entry) => (entry.id === item.id ? {
      ...entry,
      progress_percent: Math.max(Number(entry.progress_percent) || 0, progressPercent),
      last_position_seconds: Math.floor(position),
      duration_seconds: Math.floor(duration),
    } : entry)));
    void supabase.functions.invoke("healthflix-proxy?action=events", { method: "POST" as any, body: {
      event_type: eventType,
      fitpro_student_id: athleteId,
      entity_type: "content",
      entity_id: item.external_id || item.id,
      payload: {
        title: item.title,
        progress_percent: progressPercent,
        last_position_seconds: Math.max(0, Math.floor(position)),
        duration_seconds: Math.max(0, Math.floor(duration)),
        watched_seconds: Math.max(0, Math.floor(position)),
      },
    } }).then(({ error }) => { if (error) console.error("[HealthFlix] progresso não salvo", error); });
  };

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
            <p className="text-xs text-muted-foreground">Nenhuma aula HealthFlix ativa encontrada para sua sessão.</p>
          </div>
        )}
        {items.map((v, i) => (
          <motion.button
            key={v.id}
            onClick={() => {
              if (!normalizePlayerUrl(v)) { toast.info("Este conteúdo ainda não possui player configurado."); return; }
              setSelected(v);
              setSearchParams((current) => { current.set("content", v.external_id || v.id); return current; }, { replace: true });
              trackEvent(v, "content_started", v.last_position_seconds || 0, v.duration_seconds || 0);
            }}
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
              {Number(v.progress_percent) > 0 && <p className="mt-1 text-[9px] text-primary">{Number(v.progress_percent) >= 100 ? "Concluído" : `Retomar · ${Math.round(Number(v.progress_percent))}% assistido`}</p>}
            </div>
          </motion.button>
        ))}
      </div>


      {selected && normalizePlayerUrl(selected) && (
        <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`Reproduzir ${selected.title}`}>
          <div className="w-full max-w-5xl h-[78dvh] rounded-3xl border border-primary/30 bg-[#0f0f0f] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-primary/20 px-4 py-3 bg-[#0f0f0f]">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-white">{selected.title}</p>
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">HealthFlix Player</p>
              </div>
              <div className="flex items-center gap-2">
                <a href={normalizePlayerUrl(selected) as string} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40" aria-label="Abrir em nova aba">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => { setSelected(null); setSearchParams((current) => { current.delete("content"); return current; }, { replace: true }); }} className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-white hover:border-primary/40" aria-label="Fechar player">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="px-4 py-2 text-xs text-muted-foreground">Se o provedor bloquear a reprodução aqui, use Abrir em nova aba.</p>
            <div className="w-full flex-1 min-h-0 bg-black">
              <TrackedLibraryVideo url={normalizePlayerUrl(selected) as string} title={selected.title}
                startSeconds={selected.last_position_seconds || 0}
                onProgress={(position, duration) => trackEvent(selected, "content_progress_updated", position, duration)}
                onComplete={(duration) => trackEvent(selected, "content_completed", duration, duration)} />
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}
