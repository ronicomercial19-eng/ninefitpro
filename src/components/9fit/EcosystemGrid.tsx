import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Plus, Image as ImageIcon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MODULE_IMAGES } from "@/assets/modules";

interface PhysioModule {
  id: string; key: string; name: string; description: string;
  hero_image: string | null; cta_label: string; cta_route: string | null;
  category: string; display_order: number; connector_key: string | null;
}

interface Props {
  category?: string;
  variant?: "grid" | "rail";
  showHeader?: boolean;
}

/**
 * Ecosystem Grid — Native redesign (no mocks).
 * - Reads physio_modules + api_connectors (real status)
 * - Premium dark neon: surface #0F0F0F, accent #E8571A
 * - Online pulse, Syne display, DM Mono labels
 */
export function EcosystemGrid({ category, variant = "grid", showHeader = true }: Props) {
  const [items, setItems] = useState<PhysioModule[]>([]);
  const [statusByKey, setStatusByKey] = useState<Record<string, "online" | "waiting">>({});
  const navigate = useNavigate();

  useEffect(() => {
    let q = supabase.from("physio_modules").select("*").eq("status", "active").order("display_order");
    if (category) q = q.eq("category", category);
    q.then(async ({ data }) => {
      const list = (data ?? []) as any[];
      setItems(list);

      const keys = list.map((m) => m.connector_key).filter(Boolean);
      const conns = keys.length
        ? (await supabase.from("api_connectors").select("key, status").in("key", keys)).data
        : [];

      // FIX #10 (QA Master): módulo sem connector_key não depende de API
      // externa nenhuma — é nativo do app e status='active' no banco já
      // garante isso, então é "online" por padrão. Só fica "waiting" quando
      // TEM um connector_key e esse conector não está ativo.
      const map: Record<string, "online" | "waiting"> = {};
      list.forEach((m) => {
        if (!m.connector_key) {
          map[m.key] = "online";
        } else {
          const c = (conns || []).find((x: any) => x.key === m.connector_key);
          map[m.key] = c?.status === "active" ? "online" : "waiting";
        }
      });
      setStatusByKey(map);
    });
  }, [category]);

  // Sem fallback pra items.length — o contador reflete o status real
  // de cada card, nunca um número que não bate com o grid abaixo.
  const activeCount = Object.values(statusByKey).filter((s) => s === "online").length;

  if (!items.length) return null;

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
          <button
            onClick={() => navigate("/9fit/protocols")}
            className="font-mono text-[10px] uppercase tracking-widest text-primary border-b border-primary/40 pb-0.5"
          >
            Ver todos
          </button>
        </header>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map((m) => {
          const src = MODULE_IMAGES[m.key] || m.hero_image;
          const status = statusByKey[m.key];
          const online = status === "online";
          return (
            <button
              key={m.id}
              onClick={() => m.cta_route && navigate(m.cta_route)}
              className="group relative text-left rounded-2xl overflow-hidden bg-card border border-white/[0.06] hover:border-primary/60 transition-all duration-300"
            >
              {/* glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: "radial-gradient(circle at 50% 0%, hsl(18 81% 51% / 0.18), transparent 70%)" }} />

              <div className="aspect-[4/3] bg-elevated relative overflow-hidden">
                {src ? (
                  <img
                    src={src}
                    alt={m.name}
                    loading="lazy"
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
                    {online ? "Online" : "Aguardando"}
                  </span>
                </div>
              </div>

              <div className="p-3 flex items-center justify-between gap-2">
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

      <button
        onClick={() => navigate("/9fit/protocols")}
        className="mt-1 mx-auto flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-display font-black italic text-xs uppercase tracking-widest px-5 py-2.5 shadow-[0_10px_40px_-10px_hsl(18_81%_51%/0.6)] hover:scale-[1.02] transition"
      >
        <Sparkles className="w-3.5 h-3.5" /> Explorar tudo
      </button>
    </section>
  );
}
