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

  useEffect(() => {
    if (!offerId) return;
    supabase.from("monetization_offers").select("*").eq("id", offerId).maybeSingle()
      .then(({ data }) => setOffer(data));
    trackMonetizationEvent("start_trial", offerId, "dedicated_screen");
  }, [offerId]);

  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "9pay:paid" || msg.event === "payment_succeeded") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && offer?.plan_id) {
          await supabase.from("user_subscriptions" as any).upsert({
            user_id: user.id,
            plan_id: offer.plan_id,
            status: "active",
            activated_at: new Date().toISOString(),
          });
        }
        trackMonetizationEvent("convert", offerId, "dedicated_screen", { source: "iframe_postmessage" });
        window.dispatchEvent(new CustomEvent("9fit:offer_converted", { detail: { offerId } }));
        toast.success("Pagamento confirmado!");
        navigate(`/9fit/checkout/success?offer=${offerId}`);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [offer, offerId, navigate]);

  if (!offer) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border p-4 flex items-center justify-between">
        <h1 className="font-display text-lg">Checkout · {offer.name}</h1>
        <span className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> 9Pay</span>
      </div>
      {offer.iframe_url ? (
        <iframe
          src={offer.iframe_url}
          title="Checkout 9Pay"
          className="flex-1 w-full border-0"
          allow="payment *"
        />
      ) : offer.checkout_url ? (
        <div className="grid place-items-center flex-1 p-6 text-center">
          <a href={offer.checkout_url} target="_blank" rel="noreferrer" className="text-primary underline">
            Abrir checkout em nova janela →
          </a>
        </div>
      ) : (
        <div className="grid place-items-center flex-1 text-muted-foreground">Checkout não configurado</div>
      )}
    </div>
  );
}
