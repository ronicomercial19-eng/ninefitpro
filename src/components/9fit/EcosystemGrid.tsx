import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Image as ImageIcon, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MODULE_IMAGES } from "@/assets/modules";

interface PhysioModule {
  id: string; key: string; name: string; description: string;
  hero_image: string | null; cta_label: string; cta_route: string | null;
  category: string; display_order: number; connector_key: string | null;
  iframe_url?: string | null;
}

interface Props {
  category?: string;
  variant?: "grid" | "rail" | "dense";
  showHeader?: boolean;
  showAll?: boolean;
}

const HIDDEN_NATIVE_KEYS = new Set(["train", "smarttreino", "smartperiodizer", "planejamento", "ajuste", "ajuste_treino", "ajuste-treino"]);

/**
 * Ecosystem Grid — Native redesign (no mocks).
 * - Reads physio_modules + api_connectors (real status)
 * - Quiet Luxury: night surface, amber performance accent and teal recovery cues
 * - Online pulse, Syne display, DM Mono labels
 *
 * variant "dense" (21/09, feedback Rony: "grid expandido pesado/cansativo"):
 * usado na tela "Todos os módulos" — troca os ~14 cards de imagem 4:3 com
 * glow por linhas compactas (miniatura pequena + nome + status), já que
 * card grande com hero_image faz sentido pra 2 destaques, não pra uma lista
 * inteira. Reserva a intensidade visual pros 2 cards de teaser na Home/Hub.
 */
export function EcosystemGrid({ category, variant = "grid", showHeader = true, showAll = false }: Props) {
  const [items, setItems] = useState<PhysioModule[]>([]);
  const [statusByKey, setStatusByKey] = useState<Record<string, "online" | "waiting" | "not_configured">>({});
  const [iframeByKey, setIframeByKey] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    let q = supabase.from("physio_modules").select("*").eq("status", "active").order("display_order");
    if (category) q = q.eq("category", category);
    q.then(async ({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setLoadError("Não foi possível carregar o ecossistema.");
        setLoading(false);
        return;
      }
      const list = (data ?? []).filter((module) => !HIDDEN_NATIVE_KEYS.has(String(module.key).toLowerCase()));
      setItems(list);
      const keys = list.map((m) => m.connector_key).filter(Boolean);
      const { data: conns } = keys.length
        ? await supabase.from("api_connectors").select("key, status, iframe_url").in("key", keys)
        : { data: [] };
      const connectorByKey = new Map((conns || []).map((c) => [c.key, c]));
      const map: Record<string, "online" | "waiting" | "not_configured"> = {};
      const iframeMap: Record<string, string | null> = {};
      list.forEach((m) => {
          if (m.connector_key) {
            const c = connectorByKey.get(m.connector_key);
            const route = m.cta_route || "";
            const hasTarget = Boolean(route || c?.iframe_url);
            const isInternal = route.startsWith("/");
            map[m.key] = !hasTarget || (!isInternal && c?.status !== "active") ? "not_configured" : "online";
            // Nunca direcionar o usuário para um iframe pendente/inativo.
            iframeMap[m.key] = c?.status === "active" ? c?.iframe_url || null : null;
          } else {
            // Módulos nativos não dependem de connector externo para estar
            // disponíveis: uma rota interna válida já representa o destino.
            map[m.key] = m.cta_route?.startsWith("/") ? "online" : "not_configured";
            iframeMap[m.key] = null;
          }
        });
      if (!cancelled) {
        setStatusByKey(map);
        setIframeByKey(iframeMap);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [category, reloadToken]);

  const activeCount = Object.values(statusByKey).filter((s) => s === "online").length;
  const visibleItems = showAll ? items : items.slice(0, 2);
  const gridClass = variant === "rail"
    ? "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1"
    : variant === "dense"
    ? "space-y-2"
    : "grid grid-cols-1 sm:grid-cols-2 gap-3";

  const fallbackRoutes: Record<string, string> = {
    store: "/9fit/native-system?app=store",
    zap: "/9fit/ron",
    events: "/9fit/staff",
    planejamento: "/9fit/planejamento",
    ajuste_treino: "/9fit/ajuste-treino",
    progress: "/9fit/progresso",
    foods: "/9fit/foods",
    healthflix: "/9fit/healthflix",
    habitflow: "/9fit/habit-flow",
    staff: "/9fit/staff",
    ron: "/9fit/ron",
  };

  if (loading) return <section className="space-y-4" aria-busy="true"><div className="h-5 w-40 bg-muted animate-pulse" /><div className={variant === "dense" ? "space-y-2" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>{[1, 2, 3].map((key) => <div key={key} className={variant === "dense" ? "h-16 bg-card border border-white/10 animate-pulse rounded-xl" : "h-48 bg-card border border-white/10 animate-pulse"} />)}</div></section>;
  if (loadError) return (
    <section className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground flex items-center justify-between gap-3">
      <span>{loadError}</span>
      <button type="button" onClick={() => setReloadToken((value) => value + 1)} className="inline-flex items-center gap-1.5 text-primary font-semibold shrink-0">
        <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
      </button>
    </section>
  );
  if (!items.length) return (
    <section className="border border-white/10 bg-card/40 p-5 text-sm text-muted-foreground">
      Nenhum módulo disponível nesta categoria.
    </section>
  );

  return (
    <section className="space-y-4">
      {showHeader && (
        <header className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Ecosystem · Native Grid</p>
            <h2 className="font-display font-black italic text-2xl tracking-tight text-foreground">Todos os módulos</h2>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
              {activeCount}/{items.length} online
            </p>
          </div>
          {items.length > 2 && !showAll && (
            <button
              onClick={() => navigate("/9fit/modules")}
              aria-label="Abrir tela com todos os módulos"
              className="font-mono text-[10px] uppercase tracking-widest text-primary border-b border-primary/40 pb-0.5"
            >
              {`Ver todos (${items.length})`}
            </button>
          )}
        </header>
      )}

      <div className={gridClass}>
        {visibleItems.map((m) => {
          // A imagem cadastrada no módulo é a fonte individual do card;
          // o asset local é somente fallback para dados legados sem imagem.
          const src = m.hero_image || MODULE_IMAGES[m.key];
          const status = statusByKey[m.key];
          const online = status === "online";
          const label = online ? "Online" : status === "not_configured" ? "Não configurado" : "Aguardando";
          const target = iframeByKey[m.key] || fallbackRoutes[m.key] || m.cta_route;
          const canOpen = Boolean(target);
          const fallbackImage = MODULE_IMAGES[m.key];
          const accessibilityLabel = canOpen ? "Abrir módulo" : "Módulo indisponível";
          const handleOpen = () => {
            if (!target) return;
            if (/^https?:\/\//i.test(target)) navigate(`/9fit/embed?url=${encodeURIComponent(target)}&title=${encodeURIComponent(m.name)}`);
            else navigate(target);
          };

          if (variant === "dense") {
            return (
              <button
                key={m.id}
                type="button"
                disabled={!canOpen}
                onClick={handleOpen}
                aria-label={`${m.name}: ${label}. ${accessibilityLabel}`}
                className="w-full fit-os-panel bg-card/30 p-3 flex items-center gap-3 text-left hover:border-primary/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-elevated relative">
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        if (fallbackImage && event.currentTarget.src !== fallbackImage) event.currentTarget.src = fallbackImage;
                        else event.currentTarget.style.display = "none";
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm text-foreground truncate">{m.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${online ? "bg-emerald-400" : "bg-amber-400/70"}`} />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground truncate">{label} · {m.category}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            );
          }

          return (
            <button
              key={m.id}
              type="button"
              disabled={!canOpen}
              onClick={handleOpen}
              aria-label={`${m.name}: ${label}. ${accessibilityLabel}`}
              className={`group fit-os-panel text-left overflow-hidden transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${variant === "rail" ? "min-w-[280px] snap-start" : ""}`}
            >
              {/* glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: "radial-gradient(circle at 50% 0%, hsl(26 56% 51% / 0.16), transparent 70%)" }} />

              <div className="aspect-[4/3] bg-elevated relative overflow-hidden">
                {src ? (
                  <img
                    src={src}
                    alt={m.name}
                    loading="lazy"
                    onError={(event) => {
                      if (fallbackImage && event.currentTarget.src !== fallbackImage) {
                        event.currentTarget.src = fallbackImage;
                      } else {
                        event.currentTarget.style.display = "none";
                      }
                    }}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card/95 via-card/40 to-transparent" />

                <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur px-2 py-0.5 border border-white/10">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-amber-400/70"}`}
                  />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/90">
                    {label}
                  </span>
                </div>
              </div>

              <div className="fit-os-grid p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-black italic text-sm leading-tight text-foreground truncate">
                    {m.name}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground truncate">
                    {m.category}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-primary opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </div>
            </button>
          );
        })}
      </div>

    </section>
  );
}

