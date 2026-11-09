import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { trackMonetizationEvent } from "@/services/monetization";
import { Crown, ArrowRight, Loader2 } from "lucide-react";
import { BillingCard, BillingShell } from '@/components/9fit/BillingShell';

import { CHECKOUT_READY } from "@/config/commercialOffer";

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
    <BillingShell step="plan" title={offer.name} eyebrow="9FIT · OFERTA" backTo="/9fit/planos" backLabel="Voltar aos planos">
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-primary">
          <Crown className="w-5 h-5" />
          <span className="text-xs uppercase tracking-widest font-display">{offer.category || 'Prime'}</span>
        </div>
        {offer.thumbnail_url && (
          <img src={offer.thumbnail_url} alt={offer.name} className="max-h-72 w-full rounded-2xl border border-white/10 object-cover" />
        )}
        <BillingCard className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{offer.description || 'Acesso ao ecossistema 9FIT PRO com uma experiência organizada para sua evolução.'}</p>
          <div className="flex items-center gap-2 border-t border-white/[0.08] pt-4 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" /> Pagamento e condições serão confirmados no próximo passo.</div>
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              trackMonetizationEvent("select_plan", offerId, "dedicated_screen");
              navigate(CHECKOUT_READY ? `/9fit/checkout/${offerId}` : "/9fit/planos");
            }}
          >
            {CHECKOUT_READY ? "Ver condições de contratação" : "Consultar disponibilidade"} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </BillingCard>
      </div>
    </BillingShell>
  );
}
