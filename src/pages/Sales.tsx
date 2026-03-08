
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
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-black/90 backdrop-blur-lg border-b border-gray-800 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="text-xl sm:text-2xl font-bold text-white shrink-0">
            Fit<span className="text-orange-500">Evolution</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="tel:+5511999999999" className="hidden sm:inline text-gray-300 hover:text-orange-500 transition-colors text-sm">
              (11) 99999-9999
            </a>
            <Button onClick={handleStartAssessment} className="bg-orange-500 hover:bg-orange-600 text-black font-medium text-xs sm:text-sm px-3 sm:px-4">
              Começar
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black to-gray-900"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: `url('/images/background.png')`
          }}
        ></div>
        
        <div className="container mx-auto max-w-6xl text-center relative z-20">
          <Badge className="mb-6 bg-orange-500/10 text-orange-500 border-orange-500/20 px-6 py-2">
            <Crown className="w-4 h-4 mr-2" />
            Menos é Mais. O Essencial Energiza.
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Evolução<br />
            <span className="text-orange-500">Minimalista</span><br />
            Resultados Máximos
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Tecnologia profissional, design elegante e foco absoluto nos seus resultados. 
            A transformação acontece quando eliminamos o desnecessário.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              onClick={handleStartAssessment}
              className="bg-orange-500 hover:bg-orange-600 text-black px-8 py-4 text-lg font-medium"
            >
              Iniciar Transformação
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-gray-600 text-white hover:bg-white hover:text-black px-8 py-4 text-lg">
              Conhecer Metodologia
            </Button>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 bg-white text-black">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-black mb-6">
              <span className="text-orange-500">Minimalismo</span> que Energiza
            </h2>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Nossa filosofia é simples: eliminar o desnecessário para maximizar resultados. 
              Cada elemento, cada treino, cada interação tem um propósito claro.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 bg-orange-500 rounded-full"></div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Clareza</h3>
                <p className="text-gray-600">Objetivos claros, métodos diretos, resultados visíveis</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 border-2 border-orange-500 rounded-full"></div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Energia</h3>
                <p className="text-gray-600">Cada sessão projetada para maximizar sua vitalidade</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-3 h-3 bg-orange-500"></div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Essencial</h3>
                <p className="text-gray-600">Apenas o que realmente importa para sua evolução</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <FeaturesGrid />

      {/* Transformation Gallery */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-black mb-4">
              Forma Encontra <span className="text-orange-500">Função</span>
            </h2>
            <p className="text-xl text-gray-600">
              Onde estética e performance se unem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="relative h-96 overflow-hidden group">
              <img 
                src="/images/treino-focado.png" 
                alt="Treino Focado" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <div className="w-2 h-2 bg-orange-500 mb-2"></div>
                <h3 className="text-xl font-bold mb-2">Precisão</h3>
                <p className="text-sm text-gray-300">Movimentos calculados, resultados garantidos</p>
              </div>
            </div>

            <div className="relative h-96 overflow-hidden group">
              <img 
                src="/images/flexibilidade.png" 
                alt="Flexibilidade" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <div className="w-2 h-2 bg-orange-500 mb-2"></div>
                <h3 className="text-xl font-bold mb-2">Fluidez</h3>
                <p className="text-sm text-gray-300">Movimento natural, força funcional</p>
              </div>
            </div>

            <div className="relative h-96 overflow-hidden group">
              <img 
                src="/images/personal-training.png" 
                alt="Personal Training" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <div className="w-2 h-2 bg-orange-500 mb-2"></div>
                <h3 className="text-xl font-bold mb-2">Foco</h3>
                <p className="text-sm text-gray-300">Atenção total, evolução constante</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              onClick={handleStartAssessment}
              className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-medium"
            >
              Começar Minha Evolução
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
          <div className="max-w-2xl mx-auto">
            <div className="w-8 h-8 bg-orange-500 mx-auto mb-6"></div>
            <h2 className="text-4xl font-bold mb-4">
              Menos é Mais.<br />
              <span className="text-orange-500">O Essencial Energiza.</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Sua evolução começa com um passo simples. 
              Elimine o desnecessário. Foque no essencial.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button 
                size="lg" 
                onClick={handleStartAssessment}
                className="bg-orange-500 hover:bg-orange-600 text-black px-8 py-4 text-lg font-medium"
              >
                Iniciar Transformação
                <MessageCircle className="ml-2 w-5 h-5" />
              </Button>
              <a 
                href="https://wa.me/5511999999999" 
                className="text-orange-500 hover:text-orange-400 font-medium flex items-center transition-colors"
              >
                <Phone className="mr-2 w-4 h-4" />
                WhatsApp Direto
              </a>
            </div>
            
            <div className="flex justify-center items-center space-x-8 text-sm text-gray-400">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                Avaliação gratuita
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                Tecnologia profissional
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                Suporte 24/7
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold mb-4">
                Fit<span className="text-orange-500">Evolution</span>
              </div>
              <p className="text-gray-400 mb-4">
                Onde a forma encontra a função, e o minimalismo energiza.
              </p>
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-orange-500"></div>
                <div className="w-2 h-2 bg-white"></div>
                <div className="w-2 h-2 bg-gray-600"></div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Metodologia</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Treinamento Minimalista</li>
                <li>Tecnologia Profissional</li>
                <li>Coaching Personalizado</li>
                <li>Resultados Mensuráveis</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Contato</h4>
              <ul className="space-y-2 text-gray-400">
                <li>São Paulo, SP</li>
                <li>(11) 99999-9999</li>
                <li>contato@fitevolution.com</li>
                <li>WhatsApp 24/7</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-white">Princípios</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Menos é Mais</li>
                <li>Clareza de Propósito</li>
                <li>Energia Constante</li>
                <li>Evolução Contínua</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 FitEvolution. Menos é mais. O essencial energiza.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Sales;
