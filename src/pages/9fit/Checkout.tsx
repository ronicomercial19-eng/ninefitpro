import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackMonetizationEvent } from "@/services/monetization";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function NineFitCheckout() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [offer, setOffer] = useState<any>(null);

  useEffect(() => {
    if (!offerId) return;
    supabase.from("monetization_offers").select("*").eq("id", offerId).maybeSingle()
      .then(({ data }) => setOffer(data));
    trackMonetizationEvent("start_trial", offerId, "dedicated_screen");
  }, [offerId]);

  const checkoutOrigin = useMemo(() => {
    try {
      return offer?.iframe_url ? new URL(offer.iframe_url).origin : null;
    } catch {
      return null;
    }
  }, [offer?.iframe_url]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = event.data;
      if (!message || typeof message !== "object") return;
      if (!checkoutOrigin || event.origin !== checkoutOrigin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (message.type !== "9pay:paid" && message.event !== "payment_succeeded") return;

      // Browser events are navigation hints only. Entitlement must already have
      // been activated by a signed provider webhook on the server.
      trackMonetizationEvent("payment_returned", offerId, "dedicated_screen", {
        source: "trusted_iframe_navigation",
      });
      toast.info("Pagamento recebido. Verificando liberação segura…");
      navigate(`/9fit/checkout/success?offer=${encodeURIComponent(offerId ?? "")}`);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [checkoutOrigin, offerId, navigate]);

  if (!offer) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return <div className="min-h-screen bg-background flex flex-col">
    <div className="border-b border-border p-4 flex items-center justify-between">
      <h1 className="font-display text-lg">Checkout · {offer.name}</h1>
      <span className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> 9Pay</span>
    </div>
    {offer.iframe_url && checkoutOrigin ? (
      <iframe ref={iframeRef} src={offer.iframe_url} title="Checkout 9Pay"
        className="flex-1 w-full border-0" allow="payment *" />
    ) : offer.checkout_url ? (
      <div className="grid place-items-center flex-1 p-6 text-center">
        <a href={offer.checkout_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          Abrir checkout em nova janela →
        </a>
      </div>
    ) : (
      <div className="grid place-items-center flex-1 text-muted-foreground">Checkout não configurado</div>
    )}
  </div>;
}
