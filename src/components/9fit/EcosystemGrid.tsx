import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MODULE_IMAGES } from "@/assets/modules";

interface PhysioModule {
  id: string; key: string; name: string; description: string;
  hero_image: string | null; cta_label: string; cta_route: string | null;
  category: string; display_order: number; connector_key: string | null;
}

export function EcosystemGrid({ category }: { category?: string }) {
  const [items, setItems] = useState<PhysioModule[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let q = supabase.from("physio_modules").select("*").eq("status","active").order("display_order");
    if (category) q = q.eq("category", category);
    q.then(({ data }) => setItems((data ?? []) as any));
  }, [category]);

  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-xl font-display italic">Meu Ecossistema</h2>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Grid Nativo</span>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((m) => {
          const src = MODULE_IMAGES[m.key] || m.hero_image;
          return (
            <Card key={m.id} className="bg-card border-border hover:border-primary/40 transition-colors overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="aspect-video rounded-md bg-muted overflow-hidden grid place-items-center">
                  {src ? (
                    <img src={src} alt={m.name} loading="lazy" width={768} height={512} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-base">{m.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full"
                  onClick={() => m.cta_route && navigate(m.cta_route)}>
                  {m.cta_label} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
