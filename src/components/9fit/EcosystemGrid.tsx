import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Plus, Image as ImageIcon } from "lucide-react";
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

export function EcosystemGrid({ category, variant = "grid", showHeader = true }: Props) {
  const [items, setItems] = useState<PhysioModule[]>([]);
  const [statusByKey, setStatusByKey] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    let q = supabase.from("physio_modules").select("*").eq("status", "active").order("display_order");
    if (category) q = q.eq("category", category);
    q.then(async ({ data }) => {
      const list = (data ?? []) as any[];
      setItems(list);

      // Status real via api_connectors (CONECTADO/AGUARDANDO)
      const keys = list.map(m => m.connector_key).filter(Boolean);
      if (keys.length) {
        const { data: conns } = await supabase
          .from("api_connectors").select("key, status").in("key", keys);
        const map: Record<string, string> = {};
        list.forEach((m) => {
          if (m.connector_key) {
            const c = (conns || []).find((x: any) => x.key === m.connector_key);
            map[m.key] = c?.status === "active" ? "● Online" : "○ Aguardando";
          } else if (m.key === "staff") map[m.key] = "● Online";
        });
        setStatusByKey(map);
      }
    });
  }, [category]);

  const activeCount = Object.values(statusByKey).filter(s => s.startsWith("●")).length || items.length;

  if (!items.length) return null;

  return (
    <section className="space-y-3">
      {showHeader && (
        <header className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl tracking-tight">Ecosystem</h2>
            <p className="text-[11px] text-primary">All modules • {items.length} active</p>
          </div>
          <button onClick={() => navigate('/9fit/protocols')} className="text-xs text-primary font-semibold">View all</button>
        </header>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map((m) => {
          const src = MODULE_IMAGES[m.key] || m.hero_image;
          const status = statusByKey[m.key];
          return (
            <button
              key={m.id}
              onClick={() => m.cta_route && navigate(m.cta_route)}
              className="text-left rounded-2xl overflow-hidden border-t-2 border-primary bg-card/40 hover:bg-card/70 transition group"
            >
              <div className="aspect-[4/3] bg-muted relative">
                {src ? (
                  <img src={src} alt={m.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-display text-base truncate">{m.name}</p>
                  {status && <p className="text-[10px] text-primary">{status}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-primary opacity-70 group-hover:opacity-100" />
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => navigate('/9fit/protocols')}
        className="mt-2 mx-auto flex items-center gap-2 rounded-full bg-white text-black text-sm font-semibold px-4 py-2 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.4)]"
      >
        <Plus className="w-4 h-4" /> Add module
      </button>
    </section>
  );
}
