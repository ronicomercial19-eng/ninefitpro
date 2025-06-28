
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Star } from "lucide-react";

interface PricingSectionProps {
  onStartAssessment: () => void;
}

export const PricingSection = ({ onStartAssessment }: PricingSectionProps) => {
  const plans = [
    {
      name: "Essencial",
      price: "R$ 197",
      period: "/mês",
      badge: null,
      features: [
        "Personal training focado",
        "Planos minimalistas eficazes",
        "Acompanhamento via WhatsApp",
        "Suporte durante horário comercial"
      ],
      cta: "Começar Essencial",
      popular: false
    },
    {
      name: "Evolução Pro",
      price: "R$ 497",
      period: "/mês",
      badge: <Badge className="bg-orange-500 text-black"><Crown className="w-4 h-4 mr-1" />Escolha Inteligente</Badge>,
      features: [
        "Aplicativo nativo iOS e Android",
        "Programas adaptativos e inteligentes",
        "Entrega automatizada otimizada",
        "Nutrição funcional no app + PDFs",
        "Coaching de hábitos essenciais",
        "Comunicação direta no app",
        "Métricas inteligentes de progresso",
        "Programação masterizada",
        "Recursos educacionais curados",
        "Perfil profissional FitEvolution",
        "Integração Apple Health/Watch, Garmin",
        "Integrações Zapier avançadas",
        "App personalizado profissional",
        "Coaching nutricional especializado",
        "Coaching em vídeo de alta qualidade",
        "Pagamentos seguros integrados",
        "Suporte humano prioritário"
      ],
      cta: "Evoluir Agora",
      popular: true
    },
    {
      name: "Elite Evolution",
      price: "R$ 997",
      period: "/mês",
      badge: <Badge className="bg-black text-white border-white"><Star className="w-4 h-4 mr-1" />Elite</Badge>,
      features: [
        "Tudo do Evolução Pro +",
        "Personal presencial (2x/semana)",
        "Avaliação completa mensal",
        "Nutricionista dedicado",
        "Mentoria individual executiva",
        "Acesso aos estúdios elite",
        "Suplementação personalizada",
        "Concierge fitness 24/7"
      ],
      cta: "Experiência Elite",
      popular: false
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="w-4 h-4 bg-orange-500 mx-auto mb-4"></div>
          <h2 className="text-4xl font-bold text-black mb-4">
            Planos de <span className="text-orange-500">Evolução</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Menos opções, mais clareza. Escolha o caminho certo para sua transformação.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} className={`p-8 relative transition-all duration-300 ${
              plan.popular 
                ? 'border-2 border-orange-500 shadow-xl scale-105 bg-black text-white' 
                : 'border border-gray-200 shadow-lg hover:shadow-xl bg-white'
            }`}>
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  {plan.badge}
                </div>
              )}
              
              <div className="text-center mb-8">
                <div className={`w-2 h-2 ${plan.popular ? 'bg-orange-500' : 'bg-black'} mx-auto mb-4`}></div>
                <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-black'}`}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-black'}`}>
                    {plan.price}
                  </span>
                  <span className={`ml-1 ${plan.popular ? 'text-gray-300' : 'text-gray-600'}`}>
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className={`flex items-start text-sm ${
                    plan.popular ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <Check className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 ${
                      plan.popular ? 'text-orange-500' : 'text-orange-500'
                    }`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                onClick={onStartAssessment}
                className={`w-full py-3 text-lg font-medium transition-all duration-300 ${
                  plan.popular 
                    ? 'bg-orange-500 hover:bg-orange-600 text-black' 
                    : 'bg-black hover:bg-gray-800 text-white hover:scale-105'
                }`}
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600">Garantia de 30 dias</span>
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600">Parcelamento em até 12x</span>
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-600">Suporte 24/7</span>
          </div>
          <Button 
            onClick={onStartAssessment}
            variant="outline" 
            className="border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black font-medium"
          >
            Fazer Avaliação Gratuita Primeiro
          </Button>
        </div>
      </div>
    </section>
  );
};
