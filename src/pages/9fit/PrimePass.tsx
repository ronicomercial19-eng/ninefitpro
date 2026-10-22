import { usePrimeState } from "@/hooks/usePrimeState";
import { AssinaturaStatus } from "@/components/9fit/AssinaturaStatus";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { motion } from "framer-motion";
import { Crown, Zap, Star } from "lucide-react";
import { COMMERCIAL_PLANS, OFFER_BENEFITS, OFFER_SCOPE, CHECKOUT_READY, SUPPORT_EMAIL } from "@/config/commercialOffer";
import { AppSupport } from "@/components/9fit/AppSupport";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const PLANS = COMMERCIAL_PLANS;

export default function NineFitPrimePass() {
  const { user } = useAuth();
  const {data:prime,isLoading,error,refetch}=usePrimeState();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <div className="px-4 pt-6 pb-6 border-b border-white/10">
        <h1 className="text-3xl font-display font-black italic tracking-tight">Seu treino organizado. Sua evolução registrada.</h1>
        <p className="text-sm text-muted-foreground mt-2">9FIT PRO: um produto digital, com os mesmos benefícios no mensal e no anual.</p>
      </div>

      <div className="px-4 mt-6 space-y-6"><AssinaturaStatus /><section className="rounded-xl border border-white/10 p-4 space-y-2"><h2 className="font-bold">Sua performance</h2>{isLoading ? <p>Carregando…</p> : error ? <button onClick={()=>void refetch()}>Não foi possível atualizar. Tentar novamente</button> : <><p>SYNC: {prime?.syncScore == null ? "Sem medição" : `${prime.syncScore}%`}</p><p>Protocolo: {prime?.activeProtocol || "Sem protocolo ativo"}</p><p>Próximo treino: {prime?.nextWorkout || "Sem prescrição futura"}</p><p>Recuperação: {prime?.recovery == null ? "Sem leitura recente" : `${prime.recovery}%`}</p></>}</section>
        <p className="text-sm text-muted-foreground">{prime?.entitlement === "active" || prime?.entitlement === "trial" ? "Você já tem acesso. Consulte as condições de alteração antes de contratar outro plano." : "Ofertas disponíveis. O acesso só é confirmado após o registro da contratação."} Valores, renovação e cobrança são confirmados pelo provedor de pagamento; o aplicativo não informa uma próxima cobrança sem esse registro.</p>
        {!CHECKOUT_READY && <p role="status" className="rounded-xl border border-primary/30 p-4 text-sm">Contratação online em configuração. Não faça pagamentos para liberar acesso sem confirmação da equipe. Os valores abaixo são a proposta comercial; fale com a NINE FIT para confirmar disponibilidade e condições.</p>}
        {PLANS.map((plan) => (
          <motion.div key={plan.id} className="glass-mission rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-display font-black">{plan.name}</h2>
                <p className="text-lg font-black text-primary mt-1">{plan.price}{plan.period}</p>
              </div>
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">Mesmos recursos digitais em ambos os períodos.</p>
            <ul className="space-y-2 mb-6">
              {OFFER_BENEFITS.map((adv, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                  <Star className="w-3 h-3 text-primary" /> {adv}
                </li>
              ))}
            </ul>
            <a
              href={CHECKOUT_READY ? plan.link : `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Interesse em ' + plan.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-primary text-primary-foreground font-black py-4 rounded-xl hover:opacity-90 transition-all"
            >
              {CHECKOUT_READY ? "Ver condições de contratação" : "Falar com a NINE FIT sobre este plano"}
            </a>
          </motion.div>
        ))}
      </div>

      <section className="m-4 rounded-xl border border-border p-4 space-y-3"><h2 className="font-bold">O que está incluído — e o que é contratado à parte</h2><p className="text-sm text-muted-foreground">{OFFER_SCOPE}</p><p className="text-sm text-muted-foreground">Autoavaliações e estimativas são identificadas. Não prometemos resultados físicos nem substituímos acompanhamento profissional.</p><Link to="/9fit/staff" className="text-primary underline">Conhecer profissionais via Staff</Link></section>
      <div className="px-4"><AppSupport /></div>
      <BottomNavigation />
    </div>
  );
}
