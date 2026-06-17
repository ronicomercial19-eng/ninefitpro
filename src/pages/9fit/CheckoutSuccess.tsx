import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { ShareableCard } from "@/components/9fit/ShareableCard";

/**
 * Pós-checkout (Stripe test). Solução temporária: marca usuário como Prime
 * por 30 dias e libera id_card_tier = gold, permitindo iniciar vendas.
 */
export default function NineFitCheckoutSuccess() {
  const [params] = useSearchParams();
  const offerId = params.get("offer");
  const { athleteId } = useAthleteId();
  const [activating, setActivating] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const expires = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
          await supabase.from("user_plans" as any).upsert({
            user_id: user.id,
            plan_type: "prime",
            status: "active",
            expires_at: expires,
            metadata: { source: "stripe_test", offer: offerId },
          } as any, { onConflict: "user_id" } as any);
        }
        if (athleteId) {
          // Atualizar tier do ID card
          const { data: ath } = await supabase.from("athletes").select("metadata").eq("id", athleteId).maybeSingle();
          const meta = ((ath as any)?.metadata || {}) as Record<string, any>;
          await supabase.from("athletes").update({
            metadata: { ...meta, id_card_tier: "gold", prime_active: true } as any,
          } as any).eq("id", athleteId);
        }
      } catch (e) {
        console.error("[CheckoutSuccess] activation:", e);
      } finally {
        setActivating(false);
      }
    })();
  }, [athleteId, offerId]);

  return (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/15 grid place-items-center mx-auto">
          {activating ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> : <CheckCircle2 className="w-10 h-10 text-primary" />}
        </div>
        <h1 className="text-3xl font-display italic">{activating ? "Ativando seu acesso..." : "Acesso liberado!"}</h1>
        <p className="text-muted-foreground">
          {activating ? "Confirmando pagamento e liberando módulos premium." : "Sua assinatura foi ativada. Você agora é Prime · ID Card Gold."}
        </p>

        {!activating && (
          <ShareableCard
            contentType="id_card_upgrade"
            title="Eu sou 9FIT PRIME"
            subtitle="ID Card Gold ativado · acesso completo ao ecossistema"
            stat={{ label: "Status", value: "GOLD" }}
          />
        )}

        <div className="flex flex-col gap-2">
          <Button asChild size="lg" disabled={activating}>
            <Link to="/9fit/prime"><Crown className="w-4 h-4 mr-2" /> Ir para Prime</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/9fit/hub">Voltar ao Hub</Link>
          </Button>
        </div>
        {offerId && <p className="text-[10px] font-mono text-muted-foreground">ref: {offerId}</p>}
      </div>
    </div>
  );
}
