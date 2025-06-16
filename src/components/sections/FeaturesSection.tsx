
import { Card } from "@/components/ui/card";
import { ChartLine, Calendar, CheckCircle } from "lucide-react";

export const FeaturesSection = () => {
  const features = [
    {
      icon: <ChartLine className="w-8 h-8 text-orange-500" />,
      title: "Evolução Visual",
      description: "Acompanhe sua transformação com gráficos detalhados e medições precisas."
    },
    {
      icon: <Calendar className="w-8 h-8 text-orange-500" />,
      title: "Treinos Personalizados",
      description: "IA adapta seus treinos baseado no seu progresso e objetivos."
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-orange-500" />,
      title: "Sistema de Conquistas",
      description: "Ganhe medalhas e recompensas conforme alcança seus objetivos."
    }
  ];

  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Funcionalidades que <span className="text-orange-500">fazem a diferença</span></h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tecnologia de ponta para maximizar seus resultados
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-8 text-center hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
