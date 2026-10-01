import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight,
  Image as ImageIcon,
  RefreshCw,
  Users,
  Dumbbell,
  Crown,
  Library,
  Brain,
  TrendingUp,
  Apple,
  ShoppingBag,
  Film,
  CheckSquare,
  MessageSquare,
  Calendar,
  Sparkles,
  LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { MODULE_IMAGES } from "@/assets/modules";
import { useTiltCard } from "@/hooks/useTiltCard";
import { EcosystemOverlay } from "./EcosystemOverlay";
import { moduleRoute } from "@/lib/moduleRoute";

interface PhysioModule {
  id: string;
  key: string;
  name: string;
  description: string;
  hero_image: string | null;
  cta_label: string;
  cta_route: string | null;
  category: string;
  display_order: number;
  connector_key: string | null;
  iframe_url?: string | null;
}

interface Props {
  category?: string;
  variant?: "grid" | "rail" | "dense";
  showHeader?: boolean;
  showAll?: boolean;
  onModuleSelect?: (m: PhysioModule) => void;
}

// Canonical icon & color mapping for 9FIT modules matching the print
const MODULE_META: Record<
  string,
  { icon: LucideIcon; category: string; color: string; defaultRoute: string }
> = {
  staff: {
    icon: Users,
    category: "PERFORMANCE",
    color: "#FF6600",
    defaultRoute: "/9fit/native-system?app=staff",
  },
  smarttreino: {
    icon: Dumbbell,
    category: "PERFORMANCE",
    color: "#FF6600",
    defaultRoute: "/9fit/train",
  },
  prime_pass: {
    icon: Crown,
    category: "PREMIUM",
    color: "#F59E0B",
    defaultRoute: "/9fit/primepass",
  },
  primepass: {
    icon: Crown,
    category: "PREMIUM",
    color: "#F59E0B",
    defaultRoute: "/9fit/primepass",
  },
  biblioteca: {
    icon: Library,
    category: "PERFORMANCE",
    color: "#FF6600",
    defaultRoute: "/9fit/biblioteca",
  },
  ron: {
    icon: Brain,
    category: "PERFORMANCE",
    color: "#FF6600",
    defaultRoute: "/9fit/ron",
  },
  progress: {
    icon: TrendingUp,
    category: "PERFORMANCE",
    color: "#FF6600",
    defaultRoute: "/9fit/progresso",
  },
  progresso: {
    icon: TrendingUp,
    category: "PERFORMANCE",
    color: "#FF6600",
    defaultRoute: "/9fit/progresso",
  },
  foods: {
    icon: Apple,
    category: "NUTRIÇÃO",
    color: "#10B981",
    defaultRoute: "/9fit/foods",
  },
  store: {
    icon: ShoppingBag,
    category: "COMMERCE",
    color: "#FF8533",
    defaultRoute: "/9fit/native-system?app=store",
  },
  healthflix: {
    icon: Film,
    category: "STREAMING",
    color: "#EF4444",
    defaultRoute: "/9fit/healthflix",
  },
  habitflow: {
    icon: CheckSquare,
    category: "HÁBITOS",
    color: "#00E5FF",
    defaultRoute: "/9fit/habitflow",
  },
  zap: {
    icon: MessageSquare,
    category: "MENSAGENS",
    color: "#10B981",
    defaultRoute: "/9fit/mensagens",
  },
  events: {
    icon: Calendar,
    category: "EVENTOS",
    color: "#A855F7",
    defaultRoute: "/9fit/events",
  },
};

// Default canonical fallback list matching print order
const CANONICAL_MODULES: PhysioModule[] = [
  {
    id: "mod-staff",
    key: "staff",
    name: "Staff",
    description: "Conectar com profissionais e agendar",
    hero_image: null,
    cta_label: "Acessar",
    cta_route: "/9fit/native-system?app=staff",
    category: "PERFORMANCE",
    display_order: 10,
    connector_key: "staff",
  },
  {
    id: "mod-smarttreino",
    key: "smarttreino",
    name: "SmartTreino",
    description: "Treinos adaptativos e prescrições sob medida",
    hero_image: null,
    cta_label: "Acessar",
    cta_route: "/9fit/train",
    category: "PERFORMANCE",
    display_order: 20,
    connector_key: null,
  },
  {
    id: "mod-primepass",
    key: "prime_pass",
    name: "Prime Pass",
    description: "Benefícios exclusivos e acesso VIP",
    hero_image: null,
    cta_label: "Acessar",
    cta_route: "/9fit/primepass",
    category: "PREMIUM",
    display_order: 30,
    connector_key: null,
  },
  {
    id: "mod-biblioteca",
    key: "biblioteca",
    name: "Biblioteca",
    description: "Conteúdo do professor e acervo técnico",
    hero_image: null,
    cta_label: "Acessar",
    cta_route: "/9fit/biblioteca",
    category: "PERFORMANCE",
    display_order: 40,
    connector_key: null,
  },
  {
    id: "mod-ron",
    key: "ron",
    name: "RON",
    description: "Assistente com memória e inteligência adaptativa",
    hero_image: null,
    cta_label: "Conversar",
    cta_route: "/9fit/ron",
    category: "PERFORMANCE",
    display_order: 50,
    connector_key: "ron",
  },
  {
    id: "mod-progress",
    key: "progress",
    name: "Progress",
    description: "Avaliações e histórico de resultados",
    hero_image: null,
    cta_label: "Ver progresso",
    cta_route: "/9fit/progresso",
    category: "PERFORMANCE",
    display_order: 60,
    connector_key: "progress",
  },
  {
    id: "mod-foods",
    key: "foods",
    name: "Foods",
    description: "Minha dieta e planejamento nutricional",
    hero_image: null,
    cta_label: "Acessar",
    cta_route: "/9fit/foods",
    category: "NUTRIÇÃO",
    display_order: 70,
    connector_key: "foods_9",
  },
  {
    id: "mod-store",
    key: "store",
    name: "Store",
    description: "Produtos, suplementos e acessórios oficiais",
    hero_image: null,
    cta_label: "Visitar",
    cta_route: "/9fit/native-system?app=store",
    category: "COMMERCE",
    display_order: 80,
    connector_key: "store_9fit",
  },
  {
    id: "mod-healthflix",
    key: "healthflix",
    name: "HealthFlix",
    description: "Conteúdo de treino e educação em vídeo",
    hero_image: null,
    cta_label: "Assistir",
    cta_route: "/9fit/healthflix",
    category: "STREAMING",
    display_order: 90,
    connector_key: "healthflix",
  },
  {
    id: "mod-habitflow",
    key: "habitflow",
    name: "HabitFlow",
    description: "Construção de hábitos sustentáveis",
    hero_image: null,
    cta_label: "Acessar",
    cta_route: "/9fit/habitflow",
    category: "HÁBITOS",
    display_order: 100,
    connector_key: "habitflow",
  },
  {
    id: "mod-zap",
    key: "zap",
    name: "9Zap",
    description: "Comunicação e avisos inteligentes",
    hero_image: null,
    cta_label: "Acessar",
    cta_route: "/9fit/mensagens",
    category: "MENSAGENS",
    display_order: 110,
    connector_key: "zap_9",
  },
  {
    id: "mod-events",
    key: "events",
    name: "Events",
    description: "Workshops e encontros da comunidade",
    hero_image: null,
    cta_label: "Ver eventos",
    cta_route: "/9fit/events",
    category: "EVENTOS",
    display_order: 120,
    connector_key: "events",
  },
];

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
export function EcosystemGrid({ category, variant = "grid", showHeader = true, showAll = false, onModuleSelect }: Props) {
  const [showOverlay, setShowOverlay] = useState(false);
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

    async function loadModules() {
      try {
        let q = supabase
          .from("physio_modules")
          .select("*")
          .eq("status", "active")
          .order("display_order");

        if (category) q = q.eq("category", category);
        const { data, error } = await q;

        if (cancelled) return;

        // Merge fetched data with CANONICAL_MODULES to guarantee full coverage
        const dbItems = (data ?? []).filter(
          (m) => !["train", "smartperiodizer", "ajuste", "ajuste-treino"].includes(String(m.key).toLowerCase())
        );

        const mergedMap = new Map<string, PhysioModule>();
        // Add canonical items first as base
        CANONICAL_MODULES.forEach((mod) => mergedMap.set(mod.key, mod));
        // Overwrite or append with live DB data
        dbItems.forEach((mod) => mergedMap.set(mod.key, { ...mergedMap.get(mod.key), ...mod }));

        let list = Array.from(mergedMap.values());
        if (category) {
          list = list.filter((m) => m.category.toLowerCase() === category.toLowerCase());
        }
        // Sort by display order
        list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        setItems(list);

        const keys = list.map((m) => m.connector_key).filter(Boolean);
        const { data: conns } = keys.length
          ? await supabase.from("api_connectors").select("key, status, iframe_url").in("key", keys)
          : { data: [] };

        const connectorByKey = new Map((conns || []).map((c) => [c.key, c]));
        const map: Record<string, "online" | "waiting" | "not_configured"> = {};
        const iframeMap: Record<string, string | null> = {};

        list.forEach((m) => {
          const fallback = MODULE_META[m.key]?.defaultRoute;
          const target = m.cta_route || fallback;
          if (m.connector_key) {
            const c = connectorByKey.get(m.connector_key);
            const hasTarget = Boolean(target || c?.iframe_url);
            const isInternal = target?.startsWith("/");
            map[m.key] = !hasTarget || (!isInternal && c?.status !== "active") ? "not_configured" : "online";
            iframeMap[m.key] = c?.status === "active" ? c?.iframe_url || null : null;
          } else {
            map[m.key] = target ? "online" : "not_configured";
            iframeMap[m.key] = null;
          }
        });

        if (!cancelled) {
          setStatusByKey(map);
          setIframeByKey(iframeMap);
          setLoading(false);
        }
      } catch (err) {
        console.error("[EcosystemGrid] Load error:", err);
        if (!cancelled) {
          setItems(CANONICAL_MODULES);
          const fallbackStatus: Record<string, "online"> = {};
          CANONICAL_MODULES.forEach((m) => { fallbackStatus[m.key] = "online"; });
          setStatusByKey(fallbackStatus);
          setLoading(false);
        }
      }
    }

    void loadModules();
    return () => {
      cancelled = true;
    };
  }, [category, reloadToken]);

  const activeCount = Object.values(statusByKey).filter((s) => s === "online").length;
  const visibleItems = showAll ? items : items;
  const gridClass =
    variant === "rail"
      ? "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1"
      : variant === "dense"
      ? "space-y-2.5"
      : "grid grid-cols-1 sm:grid-cols-2 gap-3";

  const fallbackRoutes: Record<string, string> = {
    staff: "/9fit/native-system?app=staff",
    smarttreino: "/9fit/train",
    prime_pass: "/9fit/primepass",
    primepass: "/9fit/primepass",
    biblioteca: "/9fit/biblioteca",
    ron: "/9fit/ron",
    progress: "/9fit/progresso",
    progresso: "/9fit/progresso",
    store: "/9fit/native-system?app=store",
    zap: "/9fit/mensagens",
    events: "/9fit/events",
    planejamento: "/9fit/planejamento",
    ajuste_treino: "/9fit/ajuste-treino",
    foods: "/9fit/foods",
    healthflix: "/9fit/healthflix",
    habitflow: "/9fit/habitflow",
  };

  if (loading)
    return (
      <section className="space-y-4" aria-busy="true">
        <div className="h-5 w-40 bg-muted/40 animate-pulse rounded-md" />
        <div className={variant === "dense" ? "space-y-2.5" : "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
          {[1, 2, 3, 4].map((key) => (
            <div
              key={key}
              className={
                variant === "dense"
                  ? "h-20 bg-card/40 border border-white/[0.06] animate-pulse rounded-2xl"
                  : "h-48 bg-card/40 border border-white/[0.06] animate-pulse rounded-2xl"
              }
            />
          ))}
        </div>
      </section>
    );

  if (loadError)
    return (
      <section className="border border-destructive/30 bg-destructive/5 p-4 rounded-2xl text-sm text-muted-foreground flex items-center justify-between gap-3">
        <span>{loadError}</span>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="inline-flex items-center gap-1.5 text-primary font-semibold shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
      </section>
    );

  if (!items.length)
    return (
      <section className="border border-white/10 bg-card/40 p-5 rounded-2xl text-sm text-muted-foreground">
        Nenhum módulo disponível nesta categoria.
      </section>
    );

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.04,
      },
    },
  };

  const floatingCardVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 16,
      scale: 0.97,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 280,
        damping: 24,
        mass: 0.8,
      },
    },
  };

  return (
    <section className="space-y-4">
      {showHeader && (
        <header className="p-6 mb-6 bg-gradient-to-r from-primary/20 to-black rounded-3xl border border-primary/20 shadow-2xl">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
            EXPLORAR ECOSSISTEMA
          </h2>
          <p className="font-mono text-[11px] text-primary mt-2">
            {activeCount} DE {items.length} MÓDULOS DISPONÍVEIS
          </p>
          {items.length > 2 && !showAll && (
            <button
              onClick={() => setShowOverlay(true)}
              aria-label="Abrir tela com todos os módulos"
              className="mt-4 flex items-center gap-2 bg-primary text-black px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors"
            >
              Ver todos os módulos
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </header>
      )}

      <EcosystemOverlay open={showOverlay} onClose={() => setShowOverlay(false)} />

      <div className={gridClass}>{visibleItems.map((m, index) => {
        const route = moduleRoute(m) || fallbackRoutes[m.key];
        return <button key={m.id} type="button" disabled={!route} onClick={() => { if (onModuleSelect) onModuleSelect(m); else if (route) navigate(route); }} className="rounded-2xl border border-white/10 bg-card p-4 text-left disabled:opacity-50"><strong>{m.name}</strong><p className="text-xs text-muted-foreground mt-1">{m.description}</p><span className="text-xs text-primary">{route ? (m.cta_label || "Acessar") : "Em configuração"}</span></button>;
      })}</div>
    </section>
  );
}

interface CardItemProps {
  m: PhysioModule;
  src: string | undefined | null;
  online: boolean;
  label: string;
  canOpen: boolean;
  fallbackImage: string | undefined;
  accessibilityLabel: string;
  variant: "grid" | "rail" | "dense";
  index?: number;
  onOpen: () => void;
}

function EcosystemModuleCard({
  m,
  src,
  online,
  label,
  canOpen,
  fallbackImage,
  accessibilityLabel,
  variant,
  index = 0,
  onOpen,
}: CardItemProps) {
  const meta = MODULE_META[m.key] || {
    icon: Sparkles,
    category: m.category || "PERFORMANCE",
    color: "#FF6600",
    defaultRoute: "/9fit/hub",
  };
  const IconComponent = meta.icon;
  const isFeatured = index === 1 || m.key === "smarttreino"; // SmartTreino has top ember highlight as in IMG_0114.png

  const haloColor = online ? "rgba(255, 102, 0, 0.25)" : "rgba(255, 102, 0, 0.15)";
  const tiltRef = useTiltCard<HTMLButtonElement>({
    maxTilt: variant === "dense" ? 3.5 : 5,
    scale: variant === "dense" ? 1.012 : 1.02,
    haloColor,
    haloSize: variant === "dense" ? "260px" : "320px",
    disabled: !canOpen,
  });

  if (variant === "dense") {
    return (
      <button
        ref={tiltRef}
        type="button"
        disabled={!canOpen}
        onClick={onOpen}
        aria-label={`${m.name}: ${label}. ${accessibilityLabel}`}
        className="group w-full hub-card-interactive rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#14151b] to-[#0a0a0d] p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left shadow-lg shadow-black/50 hover:border-[#FF6600]/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer relative overflow-hidden"
      >
        {/* Top warm radial halo (semelhante ao print IMG_0114 no card SmartTreino e no hover) */}
        <div
          className={`absolute inset-x-0 top-0 h-full pointer-events-none transition-opacity duration-300 bg-[radial-gradient(ellipse_at_top,rgba(255,102,0,0.18),transparent_70%)] ${
            isFeatured ? "opacity-80" : "opacity-0 group-hover:opacity-100"
          }`}
        />

        {/* Lado Esquerdo: Squircle com Ícone/Imagem + Textos */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1 relative z-10">
          {/* Squircle tátil 9FIT */}
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-b from-[#1e1510] to-[#0f0b09] border border-[#ff6600]/30 flex items-center justify-center shrink-0 relative overflow-hidden group-hover:border-[#ff6600]/60 transition-colors shadow-inner">
            {src ? (
              <img
                src={src}
                alt=""
                loading="lazy"
                onError={(event) => {
                  if (fallbackImage && event.currentTarget.src !== fallbackImage) {
                    event.currentTarget.src = fallbackImage;
                  } else {
                    event.currentTarget.style.display = "none";
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
              />
            ) : null}

            {/* Ícone de vetor dinâmico vibrante (fallback visual ou protagonista) */}
            <div
              className={`w-full h-full flex items-center justify-center ${
                src ? "absolute inset-0 bg-black/45 backdrop-blur-[1px]" : ""
              }`}
            >
              <IconComponent
                className="w-6 h-6 transition-transform duration-300 group-hover:scale-110"
                style={{ color: meta.color }}
              />
            </div>
          </div>

          {/* Nome e Categoria em tipografia oficial do print */}
          <div className="min-w-0 flex-1">
            <p className="font-display font-black text-sm sm:text-base text-white group-hover:text-primary transition-colors tracking-tight truncate">
              {m.name}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-neutral-400 group-hover:text-neutral-300 truncate mt-0.5 font-semibold">
              {meta.category || m.category || "PERFORMANCE"}
            </p>
          </div>
        </div>

        {/* Lado Direito: Chevron Right com micro-container sutil */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/[0.06] bg-white/[0.02] group-hover:border-primary/40 group-hover:bg-primary/10 transition-all shrink-0 relative z-10">
          <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </button>
    );
  }

  // Variant "grid" ou "rail"
  return (
    <button
      ref={tiltRef}
      type="button"
      disabled={!canOpen}
      onClick={onOpen}
      aria-label={`${m.name}: ${label}. ${accessibilityLabel}`}
      className={`group w-full hub-card-interactive rounded-2xl text-left overflow-hidden border border-white/[0.08] hover:border-primary/50 bg-gradient-to-b from-[#14151b] to-[#0a0a0d] shadow-xl shadow-black/60 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
        variant === "rail" ? "min-w-[280px] snap-start" : ""
      }`}
    >
      <div className="aspect-[16/10] bg-[#0c0d12] relative overflow-hidden">
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
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : null}

        {/* Fallback artístico caso não haja imagem de banner */}
        <div
          className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-[#181514] to-[#0b0a09] ${
            src ? "hidden" : "flex"
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-[#ff6600]/10 border border-[#ff6600]/30 flex items-center justify-center shadow-lg shadow-[#ff6600]/10">
            <IconComponent className="w-8 h-8 text-[#FF6600]" />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0a0a0d] via-[#0a0a0d]/60 to-transparent" />
      </div>

      <div className="p-4 flex items-center justify-between gap-3 relative z-10">
        <div className="min-w-0">
          <p className="font-display font-black text-sm leading-tight text-white group-hover:text-primary transition-colors truncate">
            {m.name}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-400 truncate mt-0.5 font-semibold">
            {meta.category || m.category}
          </p>
        </div>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 bg-white/[0.03] group-hover:border-primary/50 group-hover:bg-primary/10 transition-all shrink-0">
          <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </button>
  );
}

