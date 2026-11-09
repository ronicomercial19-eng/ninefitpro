import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, Crown, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShareableCard } from "@/components/9fit/ShareableCard";

import { confirmedAccess } from "@/lib/customerEntry";
import { BillingCard, BillingShell } from '@/components/9fit/BillingShell';

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
      const { data: offer, error: offerError } = await supabase
        .from("monetization_offers")
        .select("plan_id")
        .eq("id", offerId)
        .maybeSingle();
      if (offerError || !offer?.plan_id) { setStatus("error"); return; }
      planId = offer.plan_id;
    }

    let query = supabase
      .from("user_subscriptions" as any)
      .select("status, plan_id, activated_at, expires_at")
      .eq("user_id", authData.user.id)
      .in("status", ["active", "trialing"]);
    if (planId) query = query.eq("plan_id", planId);

    const { data, error } = await query.order("activated_at", { ascending: false });
    if (error) setStatus("error");
    else setStatus((data || []).some(row => confirmedAccess(row as any)) ? "active" : "pending");
  }, [offerId]);

  useEffect(() => { void verifyEntitlement(); }, [verifyEntitlement]);

  const active = status === "active";
  return <BillingShell step="confirmation" title={status === "checking" ? "Verificando pagamento" : active ? "Acesso liberado" : status === "pending" ? "Pagamento em processamento" : "Não foi possível verificar"} backTo="/9fit/planos" backLabel="Voltar aos planos">
    <div className="space-y-4">
      <BillingCard className="space-y-5 text-center">
      <div className={`mx-auto grid h-20 w-20 place-items-center rounded-3xl border ${active ? 'border-primary/30 bg-primary/15' : status === 'pending' ? 'border-amber-400/30 bg-amber-400/10' : 'border-white/10 bg-white/[0.04]'}`}>
        {status === "checking" ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> :
         active ? <CheckCircle2 className="w-10 h-10 text-primary" /> :
         status === "pending" ? <Clock3 className="w-10 h-10 text-amber-400" /> :
         <TriangleAlert className="w-10 h-10 text-destructive" />}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {active
          ? "Sua assinatura foi confirmada pelo servidor."
          : "O acesso será liberado somente após a confirmação segura do provedor. Nenhuma tela ou URL ativa o plano."}
      </p>

      {active && <ShareableCard contentType="id_card_upgrade" title="Eu sou 9FIT PRIME"
        subtitle="Assinatura confirmada · acesso ao ecossistema"
        stat={{ label: "Status", value: "ATIVO" }} />}

      <div className="flex flex-col gap-3">
        {active ? <Link className="inline-flex items-center justify-center rounded-xl bg-primary p-4 font-semibold text-primary-foreground" to="/9fit/prime"><Crown className="mr-2 h-4 w-4" /> Ir para Prime <span className="ml-2" aria-hidden>→</span></Link> :
          <button className="inline-flex items-center justify-center rounded-xl bg-primary p-4 font-semibold text-primary-foreground disabled:opacity-50" onClick={() => void verifyEntitlement()} disabled={status === "checking"}>
            <RefreshCw className="mr-2 h-4 w-4" /> Verificar novamente
          </button>}
        <Link className="rounded-xl border border-white/10 p-3 text-sm text-muted-foreground" to="/9fit/hub">Voltar ao Hub</Link>
      </div>
      {offerId && <p className="text-[10px] font-mono text-muted-foreground">ref: {offerId}</p>}
      </BillingCard>
    </div>
  </BillingShell>;
}
