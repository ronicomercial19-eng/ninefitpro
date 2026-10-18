import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight,
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

// Ícone e rota padrão por módulo. Todos os ícones usam a mesma cor (laranja) — padrão Nine Pro v2.
const MODULE_META: Record<string, { icon: LucideIcon; defaultRoute: string }> = {
  staff: { icon: Users, defaultRoute: "/9fit/native-system?app=staff" },
  smarttreino: { icon: Dumbbell, defaultRoute: "/9fit/train" },
  prime_pass: { icon: Crown, defaultRoute: "/9fit/primepass" },
  primepass: { icon: Crown, defaultRoute: "/9fit/primepass" },
  biblioteca: { icon: Library, defaultRoute: "/9fit/biblioteca" },
  ron: { icon: Brain, defaultRoute: "/9fit/ron" },
  progress: { icon: TrendingUp, defaultRoute: "/9fit/progresso" },
  progresso: { icon: TrendingUp, defaultRoute: "/9fit/progresso" },
  foods: { icon: Apple, defaultRoute: "/9fit/foods" },
  store: { icon: ShoppingBag, defaultRoute: "/9fit/native-system?app=store" },
  healthflix: { icon: Film, defaultRoute: "/9fit/healthflix" },
  habitflow: { icon: CheckSquare, defaultRoute: "/9fit/habitflow" },
  zap: { icon: MessageSquare, defaultRoute: "/9fit/mensagens" },
  events: { icon: Calendar, defaultRoute: "/9fit/events" },
};

// Lista canônica de fallback (ordem do produto)
const CANONICAL_MODULES: PhysioModule[] = [
  { id: "mod-staff", key: "staff", name: "Staff", description: "Conectar com profissionais e agendar", hero_image: null, cta_label: "Acessar", cta_route: "/9fit/native-system?app=staff", category: "PERFORMANCE", display_order: 10, connector_key: "staff" },
  { id: "mod-smarttreino", key: "smarttreino", name: "SmartTreino", description: "Treinos adaptativos e prescrições sob medida", hero_image: null, cta_label: "Acessar", cta_route: "/9fit/train", category: "PERFORMANCE", display_order: 20, connector_key: null },
  { id: "mod-primepass", key: "prime_pass", name: "Prime Pass", description: "Benefícios exclusivos e acesso VIP", hero_image: null, cta_label: "Acessar", cta_route: "/9fit/primepass", category: "PREMIUM", display_order: 30, connector_key: null },
  { id: "mod-biblioteca", key: "biblioteca", name: "Biblioteca", description: "Conteúdo do professor e acervo técnico", hero_image: null, cta_label: "Acessar", cta_route: "/9fit/biblioteca", category: "PERFORMANCE", display_order: 40, connector_key: null },
  { id: "mod-ron", key: "ron", name: "RON", description: "Assistente com memória e inteligência adaptativa", hero_image: null, cta_label: "Conversar", cta_route: "/9fit/ron", category: "PERFORMANCE", display_order: 50, connector_key: "ron" },
  { id: "mod-progress", key: "progress", name: "Progress", description: "Avaliações e histórico de resultados", hero_image: null, cta_label: "Ver progresso", cta_route: "/9fit/progresso", category: "PERFORMANCE", display_order: 60, connector_key: "progress" },
  { id: "mod-foods", key: "foods", name: "Foods", description: "Minha dieta e planejamento nutricional", hero_image: null, cta_label: "Acessar", cta_route: "/9fit/foods", category: "NUTRIÇÃO", display_order: 70, connector_key: "foods_9" },
  { id: "mod-store", key: "store", name: "Store", description: "Produtos, suplementos e acessórios oficiais", hero_image: null, cta_label: "Visitar", cta_route: "/9fit/native-system?app=store", category: "COMMERCE", display_order: 80, connector_key: "store_9fit" },
  { id: "mod-healthflix", key: "healthflix", name: "HealthFlix", description: "Conteúdo de treino e educação em vídeo", hero_image: null, cta_label: "Assistir", cta_route: "/9fit/healthflix", category: "STREAMING", display_order: 90, connector_key: "healthflix" },
  { id: "mod-habitflow", key: "habitflow", name: "HabitFlow", description: "Construção de hábitos sustentáveis", hero_image: null, cta_label: "Acessar", cta_route: "/9fit/habitflow", category: "HÁBITOS", display_order: 100, connector_key: "habitflow" },
  { id: "mod-zap", key: "zap", name: "9Zap", description: "Comunicação e avisos inteligentes", hero_image: null, cta_label: "Acessar", cta_route: "/9fit/mensagens", category: "MENSAGENS", display_order: 110, connector_key: "zap_9" },
  { id: "mod-events", key: "events", name: "Events", description: "Workshops e encontros da comunidade", hero_image: null, cta_label: "Ver eventos", cta_route: "/9fit/events", category: "EVENTOS", display_order: 120, connector_key: "events" },
];

/**
 * Ecosystem Grid — padrão Nine Pro v2.
 * Header = card hero (padrão TRIBOS). Lista "Todos os módulos" = linhas calmas
 * (preto, borda neutra, ícone laranja), sem glow, para não cansar a vista.
 */
export function EcosystemGrid({ category, variant = "grid", showHeader = true, showAll = false, onModuleSelect }: Props) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [previewModuleKey, setPreviewModuleKey] = useState<string | null>(null);
  const [items, setItems] = useState<PhysioModule[]>([]);
  const [statusByKey, setStatusByKey] = useState<Record<string, "online" | "waiting" | "not_configured">>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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
        const { data } = await q;

        if (cancelled) return;

        const dbItems = (data ?? []).filter(
          (m) => !["train", "smartperiodizer", "ajuste", "ajuste-treino"].includes(String(m.key).toLowerCase())
        );

        const mergedMap = new Map<string, PhysioModule>();
        CANONICAL_MODULES.forEach((mod) => mergedMap.set(mod.key, mod));
        dbItems.forEach((mod) => mergedMap.set(mod.key, { ...mergedMap.get(mod.key), ...mod }));

        let list = Array.from(mergedMap.values());
        if (category) {
          list = list.filter((m) => m.category.toLowerCase() === category.toLowerCase());
        }
        list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        setItems(list);

        const keys = list.map((m) => m.connector_key).filter(Boolean);
        const { data: conns } = keys.length
          ? await supabase.from("api_connectors").select("key, status, iframe_url").in("key", keys)
          : { data: [] };

        const connectorByKey = new Map((conns || []).map((c) => [c.key, c]));
        const map: Record<string, "online" | "waiting" | "not_configured"> = {};

        list.forEach((m) => {
          const fallback = MODULE_META[m.key]?.defaultRoute;
          const target = m.cta_route || fallback;
          if (m.connector_key) {
            const c = connectorByKey.get(m.connector_key);
            const hasTarget = Boolean(target || c?.iframe_url);
            const isInternal = target?.startsWith("/");
            map[m.key] = !hasTarget || (!isInternal && c?.status !== "active") ? "not_configured" : "online";
          } else {
            map[m.key] = target ? "online" : "not_configured";
          }
        });

        if (!cancelled) {
          setStatusByKey(map);
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
  const gridClass =
    variant === "rail"
      ? "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1"
      : "space-y-2";

  if (loading)
    return (
      <section className="space-y-3" aria-busy="true">
        <div className="h-5 w-40 animate-pulse rounded-md bg-white/5" />
        {[1, 2, 3, 4].map((key) => (
          <div key={key} className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
        ))}
      </section>
    );

  if (loadError)
    return (
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-muted-foreground">
        <span>{loadError}</span>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 font-semibold text-primary"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
        </button>
      </section>
    );

  if (!items.length)
    return (
      <section className="rounded-2xl border border-white/10 bg-black/60 p-5 text-sm text-muted-foreground">
        Nenhum módulo disponível nesta categoria.
      </section>
    );

  return (
    <section className="space-y-4">
      {showHeader && (
        <header className="relative overflow-hidden rounded-2xl border border-primary/20 bg-black p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,hsla(20,100%,50%,0.2),transparent_60%)]" />
          <div className="relative z-10">
            <h2 className="font-display text-3xl font-black italic uppercase leading-none tracking-tighter text-white">
              Explorar ecossistema
            </h2>
            <p className="mt-2 font-data text-[11px] uppercase tracking-widest text-primary">
              {activeCount} de {items.length} módulos disponíveis
            </p>
            {items.length > 2 && !showAll && (
              <button
                onClick={() => { setPreviewModuleKey(null); setShowOverlay(true); }}
                aria-label="Abrir tela com todos os módulos"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-display text-[11px] font-black uppercase tracking-wider text-primary-foreground transition-transform active:scale-95"
              >
                Ver todos os módulos
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>
      )}

      <EcosystemOverlay open={showOverlay} initialModuleKey={previewModuleKey} onClose={() => setShowOverlay(false)} />

      {(!showHeader || showAll) && (
        <div className={gridClass}>
          {items.map((m) => {
            const Icon = MODULE_META[m.key]?.icon || Sparkles;
            const online = statusByKey[m.key] !== "not_configured";
            const open = () => {
              if (onModuleSelect) onModuleSelect(m);
              else { setPreviewModuleKey(m.key); setShowOverlay(true); }
            };
            return (
              <button
                key={m.id}
                type="button"
                onClick={open}
                aria-label={`${m.name}. ${m.description}`}
                className={`group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 text-left transition-colors hover:border-primary/40 active:scale-[0.99] ${variant === "rail" ? "min-w-[280px] snap-start" : ""}`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-black uppercase tracking-tight text-foreground">{m.name}</p>
                  <p className="truncate font-data text-[9px] uppercase tracking-widest text-muted-foreground">
                    {m.category}{online ? "" : " · em breve"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
