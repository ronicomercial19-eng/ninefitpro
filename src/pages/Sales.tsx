import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Crown, Phone, MessageCircle } from "lucide-react";
import { AssessmentForm } from "@/components/assessment/AssessmentForm";
import { PricingSection } from "@/components/sales/PricingSection";
import { FeaturesGrid } from "@/components/sales/FeaturesGrid";

const Sales = () => {
  const [showAssessment, setShowAssessment] = useState(false);

  const handleStartAssessment = () => {
    setShowAssessment(true);
  };

  if (showAssessment) {
    return <AssessmentForm />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-lg border-b border-gray-100 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-serif font-bold text-black">
            Elite<span className="text-yellow-600">Fitness</span>
          </div>
          <div className="flex items-center space-x-4">
            <a href="tel:+5511999999999" className="text-gray-700 hover:text-yellow-600 transition-colors">
              (11) 99999-9999
            </a>
            <Button onClick={handleStartAssessment} className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium">
              Começar Avaliação
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent z-10"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/lovable-uploads/98b1ae85-067d-447c-bfaf-aedc3a6dc8de.png')`
          }}
        ></div>
        
        <div className="container mx-auto max-w-6xl text-center relative z-20">
          <Badge className="mb-6 bg-yellow-600/90 text-white border-yellow-200 px-4 py-2">
            <Crown className="w-4 h-4 mr-2" />
            Plataforma Pró 50 - Tecnologia Profissional
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight">
            Transforme Seu Corpo<br />
            <span className="text-yellow-400">Com Tecnologia</span><br />
            Profissional
          </h1>
          
          <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed">
            Aplicativo móvel nativo, coaching em vídeo, integrações avançadas e 
            acompanhamento profissional para resultados excepcionais.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              onClick={handleStartAssessment}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-8 py-4 text-lg font-medium"
            >
              Começar Minha Transformação
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg">
              Ver Planos e Preços
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <FeaturesGrid />

      {/* Transformation Gallery */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-black mb-4">
              Resultados <span className="text-yellow-600">Comprovados</span>
            </h2>
            <p className="text-xl text-gray-600">
              Veja as transformações reais dos nossos clientes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl">
              <img 
                src="/lovable-uploads/9457d547-5873-496e-9a50-e6af7215946a.png" 
                alt="Treino Premium" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h3 className="text-xl font-bold mb-2">Treino Focado</h3>
                <p className="text-sm">Metodologia científica aplicada</p>
              </div>
            </div>

            <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl">
              <img 
                src="/lovable-uploads/1b2f13a6-2280-47a3-ad8d-79c6dbb74994.png" 
                alt="Flexibilidade e Força" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h3 className="text-xl font-bold mb-2">Flexibilidade Total</h3>
                <p className="text-sm">Mobilidade e força combinadas</p>
              </div>
            </div>

            <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl">
              <img 
                src="/lovable-uploads/4849dd0e-4880-4fa7-b874-b549ee92d6d6.png" 
                alt="Personal Training" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h3 className="text-xl font-bold mb-2">Acompanhamento VIP</h3>
                <p className="text-sm">Personal dedicado e focado</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              onClick={handleStartAssessment}
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-medium"
            >
              Quero Começar Minha Transformação
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection onStartAssessment={handleStartAssessment} />

      {/* CTA Section */}
      <section className="py-20 bg-black text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-serif font-bold mb-4">
            Sua Transformação <span className="text-yellow-600">Profissional</span> Começa Hoje
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Responda nossa avaliação personalizada e receba acesso à plataforma 
            Pró 50 com todos os recursos profissionais via WhatsApp em 5 minutos.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button 
              size="lg" 
              onClick={handleStartAssessment}
              className="bg-yellow-600 hover:bg-yellow-700 text-black px-8 py-4 text-lg font-medium"
            >
              Fazer Avaliação Gratuita
              <MessageCircle className="ml-2 w-5 h-5" />
            </Button>
            <a 
              href="https://wa.me/5511999999999" 
              className="text-yellow-600 hover:text-yellow-500 font-medium flex items-center"
            >
              <Phone className="mr-2 w-4 h-4" />
              Ou falar direto no WhatsApp
            </a>
          </div>
          
          <p className="text-sm text-gray-400">
            ✅ Avaliação gratuita • ✅ App móvel incluído • ✅ Suporte profissional 24/7
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-serif font-bold mb-4">
                Elite<span className="text-yellow-600">Fitness</span>
              </div>
              <p className="text-gray-400 mb-4">
                O ecossistema fitness premium para transformações reais.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Serviços</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Personal Training VIP</li>
                <li>Programas Online</li>
                <li>Netflix Fitness</li>
                <li>Mentorias Executivas</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-gray-400">
                <li>São Paulo, SP</li>
                <li>(11) 99999-9999</li>
                <li>contato@elitefitness.com</li>
                <li>WhatsApp 24/7</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Termos de Uso</li>
                <li>Política de Privacidade</li>
                <li>Política de Cancelamento</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 EliteFitness. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Sales;
