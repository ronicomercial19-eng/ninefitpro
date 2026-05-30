import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trackMonetizationEvent } from "@/services/monetization";
import { Crown, ArrowRight, Loader2 } from "lucide-react";

export default function NineFitOferta() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!offerId) return;
    supabase
      .from("monetization_offers")
      .select("*")
      .eq("id", offerId)
      .maybeSingle()
      .then(({ data }) => { setOffer(data); setLoading(false); });
    trackMonetizationEvent("view_paywall", offerId, "dedicated_screen");
  }, [offerId]);

  if (loading) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!offer) return <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">Oferta não encontrada</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 text-primary">
          <Crown className="w-5 h-5" />
          <span className="text-xs uppercase tracking-widest font-display">{offer.category}</span>
        </div>
        <h1 className="text-4xl font-display italic leading-tight">{offer.name}</h1>
        {offer.thumbnail_url && (
          <img src={offer.thumbnail_url} alt={offer.name} className="rounded-xl border border-border w-full" />
        )}
        <p className="text-muted-foreground">{offer.description}</p>
        <Card className="p-6 border-primary/30 bg-card">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              trackMonetizationEvent("select_plan", offerId, "dedicated_screen");
              navigate(`/9fit/checkout/${offerId}`);
            }}
          >
            Assinar agora <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      </div>
    </div>
  );
}
