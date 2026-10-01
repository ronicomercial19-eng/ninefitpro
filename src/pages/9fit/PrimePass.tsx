import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { motion } from "framer-motion";
import { Crown, Zap, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const PLANS = [
  {
    id: "basic",
    name: "Assinatura Básica",
    price: "R$ 97,00/mês",
    description: "Acesso fundamental ao ecossistema 9FIT.",
    advantages: ["Protocolos de treino base", "Acompanhamento nutricional", "Acesso ao Hub", "Suporte comunidade"],
    link: "https://invoice.infinitepay.io/plans/ronynapoleao/kvfp4S0k42"
  },
  {
    id: "annual",
    name: "Assinatura Anual FULL",
    price: "R$ 997,00/ano",
    description: "Experiência completa com IA e ferramentas de elite.",
    advantages: ["Tudo da Básica", "IA PDI Calibrada", "Concierge 1:1", "Bio-Scan & Analytics 4D", "Suporte prioritário", "Acesso antecipado a novos módulos"],
    link: "https://invoice.infinitepay.io/plans/ronynapoleao/TatHaBMsUX"
  }
];

export default function NineFitPrimePass() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <div className="px-4 pt-6 pb-6 border-b border-white/10">
        <h1 className="text-3xl font-display font-black italic tracking-tight">Gerencie sua assinatura</h1>
        <p className="text-sm text-muted-foreground mt-2">Escolha o melhor plano para sua performance.</p>
      </div>

      <div className="px-4 mt-6 space-y-6">
        {PLANS.map((plan) => (
          <motion.div key={plan.id} className="glass-mission rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-display font-black">{plan.name}</h2>
                <p className="text-lg font-black text-primary mt-1">{plan.price}</p>
              </div>
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
            <ul className="space-y-2 mb-6">
              {plan.advantages.map((adv, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                  <Star className="w-3 h-3 text-primary" /> {adv}
                </li>
              ))}
            </ul>
            <a
              href={plan.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-primary text-primary-foreground font-black py-4 rounded-xl hover:opacity-90 transition-all"
            >
              Assinar Plano
            </a>
          </motion.div>
        ))}
      </div>

      <BottomNavigation />
    </div>
  );
}
