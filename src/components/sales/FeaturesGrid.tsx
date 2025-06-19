
import { Card } from "@/components/ui/card";
import { 
  Smartphone, 
  Activity, 
  Zap, 
  Apple, 
  MessageCircle, 
  BarChart3, 
  BookOpen, 
  Store,
  Heart,
  Video,
  CreditCard,
  Headphones
} from "lucide-react";

export const FeaturesGrid = () => {
  const features = [
    {
      icon: <Smartphone className="w-8 h-8 text-yellow-600" />,
      title: "App Móvel Nativo",
      description: "Aplicativo profissional para iOS e Android com interface intuitiva"
    },
    {
      icon: <Activity className="w-8 h-8 text-yellow-600" />,
      title: "Monitoramento Completo",
      description: "Acompanhamento em tempo real de treinos e progresso"
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-600" />,
      title: "Entrega Automatizada",
      description: "Programas de treino entregues automaticamente no seu ritmo"
    },
    {
      icon: <Apple className="w-8 h-8 text-yellow-600" />,
      title: "Integração Total",
      description: "Conecta com Apple Health, Garmin, MyFitnessPal, Fitbit e Withings"
    },
    {
      icon: <MessageCircle className="w-8 h-8 text-yellow-600" />,
      title: "Comunicação Integrada",
      description: "Mensagens e grupos exclusivos de clientes no aplicativo"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-yellow-600" />,
      title: "Métricas Avançadas",
      description: "Perfis digitais com ferramentas de progresso e conformidade"
    },
    {
      icon: <BookOpen className="w-8 h-8 text-yellow-600" />,
      title: "Educação Contínua",
      description: "Recursos educacionais e biblioteca de conhecimento fitness"
    },
    {
      icon: <Store className="w-8 h-8 text-yellow-600" />,
      title: "Vitrine Trainerize.me",
      description: "Perfil profissional e vitrine de produtos personalizada"
    },
    {
      icon: <Heart className="w-8 h-8 text-yellow-600" />,
      title: "Coaching de Hábitos",
      description: "Acompanhamento de estilo de vida e formação de hábitos saudáveis"
    },
    {
      icon: <Video className="w-8 h-8 text-yellow-600" />,
      title: "Coaching em Vídeo",
      description: "Sessões de coaching personalizadas via videoconferência"
    },
    {
      icon: <CreditCard className="w-8 h-8 text-yellow-600" />,
      title: "Pagamentos Integrados",
      description: "Sistema de pagamentos Stripe integrado e seguro"
    },
    {
      icon: <Headphones className="w-8 h-8 text-yellow-600" />,
      title: "Suporte Ao Vivo",
      description: "Atendimento ao cliente em tempo real quando precisar"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-black mb-4">
            Tecnologia <span className="text-yellow-600">Profissional</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Plataforma completa com recursos de nível enterprise para sua transformação
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-0 shadow-md">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-black mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
