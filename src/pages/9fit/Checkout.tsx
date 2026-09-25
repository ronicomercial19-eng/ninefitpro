import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackMonetizationEvent } from "@/services/monetization";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function NineFitCheckout() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!offerId) return;
    supabase.from("monetization_offers").select("*").eq("id", offerId).eq("status", "active").maybeSingle()
      .then(({ data, error }) => { setOffer(data); setLoadError(Boolean(error)); });
    trackMonetizationEvent("start_trial", offerId, "dedicated_screen");
  }, [offerId]);

  if (!offer && loadError) return <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">Não foi possível carregar o checkout desta oferta.</div>;
  if (!offer) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return <div className="min-h-screen bg-background flex flex-col">
    <div className="border-b border-border p-4 flex items-center justify-between">
      <h1 className="font-display text-lg">Checkout · {offer.name}</h1>
      <span className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> 9Pay</span>
    </div>
    {offer.checkout_url?.startsWith("https://") ? (
      <div className="grid place-items-center flex-1 p-6 text-center">
        <a href={offer.checkout_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          Abrir checkout em nova janela →
        </a>
      </div>
    ) : (
      <div className="grid place-items-center flex-1 p-6 text-center text-muted-foreground">Checkout seguro ainda não configurado para esta oferta.</div>
    )}
  </div>;
}
