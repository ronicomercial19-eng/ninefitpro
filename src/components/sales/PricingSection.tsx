
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star } from "lucide-react";

interface PricingSectionProps {
  onStartAssessment: () => void;
}

export const PricingSection = ({ onStartAssessment }: PricingSectionProps) => {
  const plans = [
    {
      name: "Básico",
      price: "R$ 197",
      period: "/mês",
      badge: null,
      features: [
        "Personal training online",
        "Planos de treino personalizados",
        "Acompanhamento via WhatsApp",
        "Suporte durante horário comercial"
      ],
      cta: "Começar Agora",
      popular: false
    },
    {
      name: "Pró 50",
      price: "R$ 497",
      period: "/mês",
      badge: <Badge className="bg-yellow-600 text-white"><Crown className="w-4 h-4 mr-1" />Mais Popular</Badge>,
      features: [
        "✅ Aplicativo móvel para iOS e Android",
        "✅ Programas de treino e monitoramento completo",
        "✅ Entrega automatizada de programas",
        "✅ Acompanhamento nutricional no app + PDFs",
        "✅ Coaching de hábitos e estilo de vida",
        "✅ Mensagens e grupos de clientes no app",
        "✅ Perfis digitais com métricas de progresso",
        "✅ Programação padronizada com treinos mestres",
        "✅ Recursos educacionais e de ajuda",
        "✅ Perfil e vitrine de produtos Trainerize.me",
        "✅ Conexão Apple Health/Watch, Garmin, MyFitnessPal, Fitbit",
        "✅ Integrações Zapier",
        "✅ Opção de app personalizado profissional",
        "✅ Coaching avançado em nutrição",
        "✅ Coaching em vídeo",
        "✅ Pagamentos integrados Stripe",
        "✅ Suporte ao cliente ao vivo"
      ],
      cta: "Começar Transformação Premium",
      popular: true
    },
    {
      name: "Elite VIP",
      price: "R$ 997",
      period: "/mês",
      badge: <Badge className="bg-black text-white"><Star className="w-4 h-4 mr-1" />VIP</Badge>,
      features: [
        "Tudo do Pró 50 +",
        "Personal presencial (2x/semana)",
        "Avaliação física completa mensal",
        "Nutricionista dedicado",
        "Mentoria executiva individual",
        "Acesso aos estúdios premium",
        "Suplementação personalizada",
        "Concierge fitness 24/7"
      ],
      cta: "Experiência VIP",
      popular: false
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-black mb-4">
            Planos de <span className="text-yellow-600">Transformação</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Escolha o plano ideal para seus objetivos e estilo de vida
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} className={`p-8 relative ${plan.popular ? 'border-2 border-yellow-600 shadow-xl scale-105' : 'border shadow-lg'}`}>
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  {plan.badge}
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-black mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-black">{plan.price}</span>
                  <span className="text-gray-600 ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start text-sm text-gray-700">
                    {feature.startsWith('✅') ? (
                      <span className="text-green-600 mr-2 text-xs">{feature}</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              <Button 
                onClick={onStartAssessment}
                className={`w-full py-3 text-lg font-medium ${
                  plan.popular 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                    : 'bg-black hover:bg-gray-800 text-white'
                }`}
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            🔒 Garantia de 30 dias • 💳 Parcelamento em até 12x • 📱 Suporte 24/7
          </p>
          <Button 
            onClick={onStartAssessment}
            variant="outline" 
            className="border-2 border-yellow-600 text-yellow-600 hover:bg-yellow-600 hover:text-white"
          >
            Fazer Avaliação Gratuita Primeiro
          </Button>
        </div>
      </div>
    </section>
  );
};
