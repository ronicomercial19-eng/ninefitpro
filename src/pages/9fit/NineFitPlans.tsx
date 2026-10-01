import { motion } from "motion/react";
import { Crown, Check, ArrowRight } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

const PLANS = [
  {
    id: "basic",
    name: "ASSINATURA BÁSICA",
    price: "R$ 97",
    period: "/mês",
    description: "Acesso fundamental para dar o primeiro passo na sua transformação.",
    advantages: [
      "Protocolos de treino base",
      "Acompanhamento nutricional",
      "Acesso ao Hub de Performance",
      "Comunidade exclusiva"
    ],
    link: "https://invoice.infinitepay.io/plans/ronynapoleao/kvfp4S0k42",
    accent: "border-white/10"
  },
  {
    id: "annual",
    name: "ASSINATURA FULL ANUAL",
    price: "R$ 997",
    period: "/ano",
    description: "Experiência completa com IA de elite e ferramentas de máxima performance.",
    advantages: [
      "Tudo da Assinatura Básica",
      "IA PDI de Calibração Avançada",
      "Concierge de Performance 1:1",
      "Bio-Scan & Analytics 4D",
      "Protocolos de Recuperação Elite",
      "Suporte prioritário 24/7"
    ],
    link: "https://invoice.infinitepay.io/plans/ronynapoleao/TatHaBMsUX",
    accent: "border-brand-orange/50 bg-brand-orange/5"
  }
];

export default function NineFitPlans() {
  return (
    <div className="min-h-screen bg-brand-black pb-28 text-white p-6">
      <div className="text-center space-y-2 mb-10">
        <h1 className="font-display font-black text-3xl uppercase italic tracking-tighter">Escolha sua Performance</h1>
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Selecione o protocolo de upgrade ideal</p>
      </div>

      <div className="space-y-6">
        {PLANS.map((plan) => (
          <motion.div 
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-[2.5rem] p-8 border ${plan.accent} bg-brand-surface`}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-display font-black text-xl uppercase italic">{plan.name}</h2>
                <div className="flex items-baseline mt-1">
                  <span className="text-4xl font-display font-black text-brand-orange">{plan.price}</span>
                  <span className="text-xs text-gray-500 font-mono ml-1">{plan.period}</span>
                </div>
              </div>
              <Crown className={`w-8 h-8 ${plan.id === 'annual' ? 'text-brand-orange' : 'text-gray-600'}`} />
            </div>

            <p className="text-xs text-gray-400 mb-6 italic">{plan.description}</p>
            
            <ul className="space-y-3 mb-8">
              {plan.advantages.map((adv, i) => (
                <li key={i} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                  <Check className="w-4 h-4 text-brand-green" /> {adv}
                </li>
              ))}
            </ul>

            <a
              href={plan.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-orange hover:text-white transition-all shadow-lg"
            >
              Ativar Protocolo Agora <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        ))}
      </div>
      <BottomNavigation />
    </div>
  );
}
