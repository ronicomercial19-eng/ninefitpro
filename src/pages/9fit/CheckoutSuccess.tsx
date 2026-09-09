import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock3, Crown, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShareableCard } from "@/components/9fit/ShareableCard";

type VerificationStatus = "checking" | "active" | "pending" | "error";

export default function NineFitCheckoutSuccess() {
  const [params] = useSearchParams();
  const offerId = params.get("offer");
  const [status, setStatus] = useState<VerificationStatus>("checking");

  const verifyEntitlement = useCallback(async () => {
    setStatus("checking");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setStatus("error");
      return;
    }

    let planId: string | null = null;
    if (offerId) {
      const { data: offer } = await supabase
        .from("monetization_offers")
        .select("plan_id")
        .eq("id", offerId)
        .maybeSingle();
      planId = offer?.plan_id ?? null;
    }

    let query = supabase
      .from("user_subscriptions" as any)
      .select("status, plan_id, activated_at")
      .eq("user_id", authData.user.id)
      .eq("status", "active");
    if (planId) query = query.eq("plan_id", planId);

    const { data, error } = await query.order("activated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) setStatus("error");
    else setStatus(data ? "active" : "pending");
  }, [offerId]);

  useEffect(() => { void verifyEntitlement(); }, [verifyEntitlement]);

  const active = status === "active";
  return <div className="min-h-screen bg-background grid place-items-center p-6">
    <div className="max-w-md w-full text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-primary/15 grid place-items-center mx-auto">
        {status === "checking" ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> :
         active ? <CheckCircle2 className="w-10 h-10 text-primary" /> :
         status === "pending" ? <Clock3 className="w-10 h-10 text-amber-400" /> :
         <TriangleAlert className="w-10 h-10 text-destructive" />}
      </div>
      <h1 className="text-3xl font-display italic">
        {status === "checking" ? "Verificando pagamento…" :
         active ? "Acesso liberado!" :
         status === "pending" ? "Pagamento em processamento" : "Não foi possível verificar"}
      </h1>
      <p className="text-muted-foreground">
        {active
          ? "Sua assinatura foi confirmada pelo servidor."
          : "O acesso será liberado somente após a confirmação segura do provedor. Nenhuma tela ou URL ativa o plano."}
      </p>

      {active && <ShareableCard contentType="id_card_upgrade" title="Eu sou 9FIT PRIME"
        subtitle="Assinatura confirmada · acesso ao ecossistema"
        stat={{ label: "Status", value: "ATIVO" }} />}

      <div className="flex flex-col gap-2">
        {active ? <Button asChild size="lg"><Link to="/9fit/prime"><Crown className="w-4 h-4 mr-2" /> Ir para Prime</Link></Button> :
          <Button size="lg" onClick={() => void verifyEntitlement()} disabled={status === "checking"}>
            <RefreshCw className="w-4 h-4 mr-2" /> Verificar novamente
          </Button>}
        <Button asChild variant="ghost"><Link to="/9fit/hub">Voltar ao Hub</Link></Button>
      </div>
      {offerId && <p className="text-[10px] font-mono text-muted-foreground">ref: {offerId}</p>}
    </div>
  </div>;
}
