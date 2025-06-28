
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
      icon: <Smartphone className="w-6 h-6 text-orange-500" />,
      title: "App Nativo",
      description: "Tecnologia iOS e Android com design minimalista"
    },
    {
      icon: <Activity className="w-6 h-6 text-orange-500" />,
      title: "Monitoramento Essencial",
      description: "Apenas as métricas que realmente importam"
    },
    {
      icon: <Zap className="w-6 h-6 text-orange-500" />,
      title: "Energia Automatizada",
      description: "Programas inteligentes que se adaptam ao seu ritmo"
    },
    {
      icon: <Apple className="w-6 h-6 text-orange-500" />,
      title: "Integração Total",
      description: "Conecta com Apple Health, Garmin e principais dispositivos"
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-orange-500" />,
      title: "Comunicação Direta",
      description: "Mensagens focadas e grupos exclusivos no app"
    },
    {
      icon: <BarChart3className="w-6 h-6 text-orange-500" />,
      title: "Métricas Inteligentes",
      description: "Dados claros que mostram sua evolução real"
    },
    {
      icon: <BookOpen className="w-6 h-6 text-orange-500" />,
      title: "Conhecimento Curado",
      description: "Biblioteca essencial de educação fitness"
    },
    {
      icon: <Store className="w-6 h-6 text-orange-500" />,
      title: "Perfil Profissional",
      description: "Vitrine elegante da sua transformação"
    },
    {
      icon: <Heart className="w-6 h-6 text-orange-500" />,
      title: "Hábitos Essenciais",
      description: "Foco nos comportamentos que realmente transformam"
    },
    {
      icon: <Video className="w-6 h-6 text-orange-500" />,
      title: "Coaching Direto",
      description: "Sessões personalizadas via vídeo de alta qualidade"
    },
    {
      icon: <CreditCard className="w-6 h-6 text-orange-500" />,
      title: "Pagamentos Seguros",
      description: "Sistema Stripe integrado e transparente"
    },
    {
      icon: <Headphones className="w-6 h-6 text-orange-500" />,
      title: "Suporte Humano",
      description: "Atendimento real quando você precisar"
    }
  ];

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="w-4 h-4 bg-orange-500 mx-auto mb-4"></div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Tecnologia <span className="text-orange-500">Essencial</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Cada recurso foi cuidadosamente selecionado para maximizar seus resultados
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 bg-gray-900 border-gray-800 hover:border-orange-500/20 transition-all duration-300 group">
              <div className="mb-4 p-2 w-10 h-10 bg-black rounded flex items-center justify-center group-hover:bg-orange-500/10 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
