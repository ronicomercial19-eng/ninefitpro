import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Crown, ArrowRight } from "lucide-react";

type Offer = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  checkout_url: string | null;
  iframe_url: string | null;
  priority: number;
};

export function DynamicOffers({ category, max = 3, compact = false }: { category?: string; max?: number; compact?: boolean }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let q = supabase
      .from("monetization_offers")
      .select("id,name,description,category,thumbnail_url,checkout_url,iframe_url,priority")
      .eq("status", "active")
      .order("priority", { ascending: false })
      .limit(max);
    if (category) q = q.eq("category", category);
    q.then(({ data }) => setOffers((data ?? []) as any));
  }, [category, max]);

  if (!offers.length) return null;

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-label flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-primary" />
          OFERTAS PRIME
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">9Pay · Seguro</span>
      </header>
      <div className={compact ? "flex gap-3 overflow-x-auto scrollbar-hide pb-2" : "grid gap-3"}>
        {offers.map((o) => (
          <button
            key={o.id}
            onClick={() => navigate(`/9fit/oferta/${o.id}`)}
            className={`text-left surface-card hover-magnetic p-4 border border-primary/20 hover:border-primary/50 transition-colors ${
              compact ? "min-w-[260px]" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {o.thumbnail_url ? (
                <img src={o.thumbnail_url} alt={o.name} loading="lazy" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-primary/15 grid place-items-center">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] tracking-widest uppercase text-primary">{o.category}</p>
                {/* FIX #24 (QA Master): título em 1 linha cortava nomes
                    como "CONSULTORIA DE PERFOM..." — line-clamp-2 dá
                    espaço pra nomes longos sem truncar tão agressivo. */}
                <p className="font-display text-base leading-tight line-clamp-2">{o.name}</p>
                {o.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{o.description}</p>}
              </div>
              <ArrowRight className="w-4 h-4 text-primary shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
