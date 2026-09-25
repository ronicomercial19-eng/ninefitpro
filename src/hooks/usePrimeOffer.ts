import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PrimeOffer = {
  id: string;
  name: string;
  description: string | null;
  checkout_url: string | null;
  slug: string | null;
  category: string;
  metadata: any;
};

type Status = "loading" | "ready" | "empty" | "error";

/**
 * Oferta de upgrade ativa vinda de monetization_offers.
 * Substitui links de checkout fixos (Stripe test) espalhados pelas telas.
 * Prioriza a categoria pedida e cai para qualquer oferta ativa.
 */
export function usePrimeOffer(category: string = "prime") {
  const [offer, setOffer] = useState<PrimeOffer | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let alive = true;

    const select = "id,name,description,checkout_url,slug,category,metadata";

    (async () => {
      setStatus("loading");
      try {
        const { data, error } = await supabase
          .from("monetization_offers")
          .select(select)
          .eq("status", "active")
          .eq("category", category)
          .order("priority", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        let found = data as PrimeOffer | null;

        if (!found) {
          const fallback = await supabase
            .from("monetization_offers")
            .select(select)
            .eq("status", "active")
            .order("priority", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (fallback.error) throw fallback.error;
          found = fallback.data as PrimeOffer | null;
        }

        if (!alive) return;
        setOffer(found);
        setStatus(found ? "ready" : "empty");
      } catch (e) {
        console.error("[usePrimeOffer]", e);
        if (!alive) return;
        setOffer(null);
        setStatus("error");
      }
    })();

    return () => {
      alive = false;
    };
  }, [category]);

  // Rota interna de oferta quando não há URL de checkout cadastrada.
  const href = offer ? offer.checkout_url || `/9fit/oferta/${offer.id}` : null;
  const isExternal = !!href && /^https?:\/\//i.test(href);

  return { offer, href, isExternal, status };
}
